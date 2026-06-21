-- Troque os IDs usados nos exemplos pelos IDs existentes no seu banco.

-- 1. Function usada pela tela Pedidos e pelo relatorio de pedidos.
SELECT *
FROM fn_listar_pedidos();

-- 2. Functions usadas pela tela Relatorios.
SELECT *
FROM fn_relatorio_vendas_por_cliente();

SELECT *
FROM fn_relatorio_estoque();

-- 3. Ver o estoque antes de criar um pedido.
SELECT id_produto, nome, preco_base, estoque, disponibilidade
FROM produto
ORDER BY id_produto;

-- 4. Procedure usada pelo botao "Salvar Pedido" da tela Pedidos.
-- Ela recebe os itens como JSON, cria pedido e itens, chama Functions,
-- aciona Triggers de estoque/auditoria e confirma tudo com COMMIT.
CALL sp_realizar_venda(
    1,
    '[{"id_produto": 1, "quantidade": 2, "desconto": 0}]'::JSONB,
    NULL,
    NULL
);

-- 5. Function escalar usada para calcular o total do pedido.
SELECT fn_calcular_total_pedido(1) AS total_pedido;

-- 6. Mostrar registros criados automaticamente pelo Trigger de auditoria.
SELECT
    a.id_auditoria,
    p.nome AS produto,
    a.estoque_anterior,
    a.estoque_novo,
    a.data_alteracao
FROM auditoria_estoque a
JOIN produto p ON p.id_produto = a.id_produto
ORDER BY a.id_auditoria DESC;

-- 7. Demonstrar ROLLBACK.
-- A quantidade e maior que o estoque, portanto nenhum pedido parcial fica salvo.
CALL sp_realizar_venda(
    1,
    '[{"id_produto": 1, "quantidade": 999999, "desconto": 0}]'::JSONB,
    NULL,
    NULL
);
