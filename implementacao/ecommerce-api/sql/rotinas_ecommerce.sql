ALTER TABLE produto
ADD COLUMN IF NOT EXISTS estoque INTEGER NOT NULL DEFAULT 10;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'produto_estoque_check'
          AND conrelid = 'produto'::regclass
    ) THEN
        ALTER TABLE produto
        ADD CONSTRAINT produto_estoque_check CHECK (estoque >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS auditoria_estoque (
    id_auditoria BIGSERIAL PRIMARY KEY,
    id_produto INTEGER NOT NULL,
    estoque_anterior INTEGER NOT NULL,
    estoque_novo INTEGER NOT NULL,
    data_alteracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_produto
        FOREIGN KEY (id_produto) REFERENCES produto(id_produto) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION sincronizar_disponibilidade_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.disponibilidade := NEW.estoque > 0;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produto_sincronizar_disponibilidade ON produto;

CREATE TRIGGER trg_produto_sincronizar_disponibilidade
BEFORE INSERT OR UPDATE OF estoque, disponibilidade
ON produto
FOR EACH ROW
EXECUTE FUNCTION sincronizar_disponibilidade_estoque();

UPDATE produto
SET disponibilidade = estoque > 0
WHERE disponibilidade IS DISTINCT FROM (estoque > 0);

CREATE OR REPLACE FUNCTION fn_calcular_total_item(
    p_quantidade INTEGER,
    p_preco_unitario NUMERIC,
    p_desconto NUMERIC DEFAULT 0
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_desconto NUMERIC(12,2);
BEGIN
    IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
        RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    IF p_preco_unitario IS NULL OR p_preco_unitario < 0 THEN
        RAISE EXCEPTION 'Preco unitario invalido';
    END IF;

    v_subtotal := p_quantidade * p_preco_unitario;
    v_desconto := COALESCE(p_desconto, 0);

    IF v_desconto < 0 OR v_desconto > v_subtotal THEN
        RAISE EXCEPTION 'Desconto deve ficar entre zero e o subtotal do item';
    END IF;

    RETURN ROUND(v_subtotal - v_desconto, 2);
END;
$$;

CREATE OR REPLACE FUNCTION fn_calcular_total_pedido(p_id_pedido INTEGER)
RETURNS NUMERIC(12,2)
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        SUM(fn_calcular_total_item(i.quantidade, i.preco_unitario, i.desconto)),
        0
    )::NUMERIC(12,2)
    FROM item_pedido i
    WHERE i.id_pedido = p_id_pedido;
$$;

DROP FUNCTION IF EXISTS fn_resumo_pedidos();

CREATE OR REPLACE FUNCTION fn_listar_pedidos()
RETURNS TABLE (
    id_pedido INTEGER,
    id_cliente INTEGER,
    data_criacao TIMESTAMP,
    data_previsao_entrega TIMESTAMP,
    cliente_nome VARCHAR,
    cliente_tipo CHAR(2),
    cliente_email VARCHAR,
    quantidade_itens BIGINT,
    quantidade_total BIGINT,
    itens_resumo TEXT,
    total_pedido NUMERIC(12,2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        ped.id_pedido,
        ped.id_cliente,
        ped.data_criacao,
        ped.data_previsao_entrega,
        COALESCE(pf.nome, pj.razao_social, '-')::VARCHAR AS cliente_nome,
        cli.tipo::CHAR(2) AS cliente_tipo,
        cli.email::VARCHAR AS cliente_email,
        COUNT(item.id_item)::BIGINT AS quantidade_itens,
        COALESCE(SUM(item.quantidade), 0)::BIGINT AS quantidade_total,
        COALESCE(
            STRING_AGG(prod.nome, ', ' ORDER BY item.id_item)
                FILTER (WHERE item.id_item IS NOT NULL),
            '-'
        )::TEXT AS itens_resumo,
        fn_calcular_total_pedido(ped.id_pedido) AS total_pedido
    FROM pedido ped
    JOIN cliente cli ON cli.id_cliente = ped.id_cliente
    LEFT JOIN pessoa_fisica pf ON pf.id_cliente = cli.id_cliente
    LEFT JOIN pessoa_juridica pj ON pj.id_cliente = cli.id_cliente
    LEFT JOIN item_pedido item ON item.id_pedido = ped.id_pedido
    LEFT JOIN produto prod ON prod.id_produto = item.id_produto
    GROUP BY ped.id_pedido, cli.id_cliente, pf.nome, pj.razao_social
    ORDER BY ped.id_pedido;
$$;

CREATE OR REPLACE FUNCTION fn_relatorio_vendas_por_cliente()
RETURNS TABLE (
    id_cliente INTEGER,
    nome VARCHAR,
    tipo CHAR(2),
    total_pedidos BIGINT,
    total_vendas NUMERIC(12,2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        cli.id_cliente,
        COALESCE(pf.nome, pj.razao_social, '-')::VARCHAR AS nome,
        cli.tipo::CHAR(2) AS tipo,
        COUNT(ped.id_pedido)::BIGINT AS total_pedidos,
        COALESCE(
            SUM(fn_calcular_total_pedido(ped.id_pedido)),
            0
        )::NUMERIC(12,2) AS total_vendas
    FROM cliente cli
    LEFT JOIN pessoa_fisica pf ON pf.id_cliente = cli.id_cliente
    LEFT JOIN pessoa_juridica pj ON pj.id_cliente = cli.id_cliente
    LEFT JOIN pedido ped ON ped.id_cliente = cli.id_cliente
    GROUP BY cli.id_cliente, pf.nome, pj.razao_social
    ORDER BY total_vendas DESC, nome;
$$;

CREATE OR REPLACE FUNCTION fn_relatorio_estoque()
RETURNS TABLE (
    id_produto INTEGER,
    produto VARCHAR,
    categoria VARCHAR,
    estoque INTEGER,
    disponibilidade BOOLEAN,
    total_movimentacoes BIGINT,
    ultima_alteracao TIMESTAMP
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        prod.id_produto,
        prod.nome::VARCHAR AS produto,
        cat.nome_categoria::VARCHAR AS categoria,
        prod.estoque,
        prod.disponibilidade,
        COUNT(aud.id_auditoria)::BIGINT AS total_movimentacoes,
        MAX(aud.data_alteracao) AS ultima_alteracao
    FROM produto prod
    JOIN categoria cat ON cat.id_categoria = prod.id_categoria
    LEFT JOIN auditoria_estoque aud ON aud.id_produto = prod.id_produto
    GROUP BY prod.id_produto, cat.nome_categoria
    ORDER BY prod.estoque, prod.nome;
$$;

CREATE OR REPLACE FUNCTION controlar_estoque_item_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_produto produto%ROWTYPE;
    v_diferenca INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE produto
        SET estoque = estoque + OLD.quantidade,
            disponibilidade = TRUE
        WHERE id_produto = OLD.id_produto;

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.id_produto <> NEW.id_produto THEN
        UPDATE produto
        SET estoque = estoque + OLD.quantidade,
            disponibilidade = TRUE
        WHERE id_produto = OLD.id_produto;

        SELECT *
        INTO v_produto
        FROM produto
        WHERE id_produto = NEW.id_produto
        FOR UPDATE;

        IF NOT FOUND OR NOT v_produto.disponibilidade THEN
            RAISE EXCEPTION 'Produto indisponivel para pedido';
        END IF;

        IF v_produto.estoque < NEW.quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponivel: %, solicitado: %',
                v_produto.estoque, NEW.quantidade;
        END IF;

        UPDATE produto
        SET estoque = estoque - NEW.quantidade,
            disponibilidade = (estoque - NEW.quantidade) > 0
        WHERE id_produto = NEW.id_produto;

        RETURN NEW;
    END IF;

    SELECT *
    INTO v_produto
    FROM produto
    WHERE id_produto = NEW.id_produto
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto nao encontrado';
    END IF;

    v_diferenca := CASE
        WHEN TG_OP = 'INSERT' THEN NEW.quantidade
        ELSE NEW.quantidade - OLD.quantidade
    END;

    IF v_diferenca > 0 AND NOT v_produto.disponibilidade THEN
        RAISE EXCEPTION 'Produto indisponivel para pedido';
    END IF;

    IF v_diferenca > 0 AND v_produto.estoque < v_diferenca THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponivel: %, solicitado a mais: %',
            v_produto.estoque, v_diferenca;
    END IF;

    UPDATE produto
    SET estoque = estoque - v_diferenca,
        disponibilidade = (estoque - v_diferenca) > 0
    WHERE id_produto = NEW.id_produto;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_item_pedido_produto_disponivel ON item_pedido;
DROP TRIGGER IF EXISTS trg_item_pedido_controlar_estoque ON item_pedido;
DROP FUNCTION IF EXISTS validar_item_produto_disponivel();

CREATE TRIGGER trg_item_pedido_controlar_estoque
BEFORE INSERT OR UPDATE OR DELETE
ON item_pedido
FOR EACH ROW
EXECUTE FUNCTION controlar_estoque_item_pedido();

CREATE OR REPLACE FUNCTION auditar_alteracao_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO auditoria_estoque (id_produto, estoque_anterior, estoque_novo)
    VALUES (NEW.id_produto, OLD.estoque, NEW.estoque);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produto_auditar_estoque ON produto;

CREATE TRIGGER trg_produto_auditar_estoque
AFTER UPDATE OF estoque
ON produto
FOR EACH ROW
WHEN (OLD.estoque IS DISTINCT FROM NEW.estoque)
EXECUTE FUNCTION auditar_alteracao_estoque();

DROP PROCEDURE IF EXISTS sp_realizar_venda(
    INTEGER,
    INTEGER,
    INTEGER,
    NUMERIC,
    TIMESTAMP,
    INTEGER
);

CREATE OR REPLACE PROCEDURE sp_realizar_venda(
    p_id_cliente INTEGER,
    p_itens JSONB,
    p_data_previsao_entrega TIMESTAMP,
    INOUT p_id_pedido INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item RECORD;
    v_produto produto%ROWTYPE;
    v_total NUMERIC(12,2) := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM cliente
        WHERE id_cliente = p_id_cliente
    ) THEN
        ROLLBACK;
        RAISE EXCEPTION 'Cliente nao encontrado';
    END IF;

    IF p_itens IS NULL
       OR jsonb_typeof(p_itens) <> 'array'
       OR jsonb_array_length(p_itens) = 0 THEN
        ROLLBACK;
        RAISE EXCEPTION 'Pedido precisa ter pelo menos um item';
    END IF;

    INSERT INTO pedido (id_cliente)
    VALUES (p_id_cliente)
    RETURNING id_pedido INTO p_id_pedido;

    FOR v_item IN
        SELECT *
        FROM jsonb_to_recordset(p_itens) AS item(
            id_produto INTEGER,
            quantidade INTEGER,
            desconto NUMERIC
        )
    LOOP
        SELECT *
        INTO v_produto
        FROM produto
        WHERE id_produto = v_item.id_produto
        FOR UPDATE;

        IF NOT FOUND THEN
            ROLLBACK;
            RAISE EXCEPTION 'Produto % nao encontrado', v_item.id_produto;
        END IF;

        IF NOT v_produto.disponibilidade THEN
            ROLLBACK;
            RAISE EXCEPTION 'Produto % esta indisponivel', v_produto.nome;
        END IF;

        IF v_item.quantidade IS NULL
           OR v_item.quantidade <= 0
           OR v_produto.estoque < v_item.quantidade THEN
            ROLLBACK;
            RAISE EXCEPTION 'Estoque insuficiente para %. Disponivel: %, solicitado: %',
                v_produto.nome, v_produto.estoque, v_item.quantidade;
        END IF;

        v_total := v_total + fn_calcular_total_item(
            v_item.quantidade,
            v_produto.preco_base,
            COALESCE(v_item.desconto, 0)
        );

        INSERT INTO item_pedido (
            id_pedido,
            id_produto,
            quantidade,
            preco_unitario,
            desconto
        )
        VALUES (
            p_id_pedido,
            v_item.id_produto,
            v_item.quantidade,
            v_produto.preco_base,
            COALESCE(v_item.desconto, 0)
        );
    END LOOP;

    UPDATE pedido
    SET data_previsao_entrega = COALESCE(
        p_data_previsao_entrega,
        CURRENT_TIMESTAMP + INTERVAL '7 days'
    )
    WHERE id_pedido = p_id_pedido;

    RAISE NOTICE 'Venda % confirmada. Total calculado: %', p_id_pedido, v_total;
    COMMIT;
END;
$$;
