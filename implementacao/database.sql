CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    tipo CHAR(2) NOT NULL CHECK (tipo IN ('PF', 'PJ'))
);

CREATE TABLE endereco (
    id_cliente INT PRIMARY KEY,
    rua VARCHAR(100) NOT NULL,
    numero VARCHAR(20),
    bairro VARCHAR(50) NOT NULL,
    cep VARCHAR(10) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    CONSTRAINT fk_endereco_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

CREATE TABLE telefone (
    id_telefone SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    numero VARCHAR(20) NOT NULL,
    CONSTRAINT fk_telefone_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    CONSTRAINT ux_telefone_cliente_numero UNIQUE (id_cliente, numero)
);

CREATE TABLE pessoa_fisica (
    id_cliente INT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    genero CHAR(2) NOT NULL CHECK (genero IN ('M', 'F')),
    CONSTRAINT fk_pessoa_fisica_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

CREATE TABLE pessoa_juridica (
    id_cliente INT PRIMARY KEY,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    razao_social VARCHAR(100) NOT NULL,
    inscricao_estadual VARCHAR(30),
    CONSTRAINT fk_pessoa_juridica_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(100) NOT NULL,
    descricao TEXT
);

CREATE TABLE produto (
    id_produto SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco_base NUMERIC(10,2) NOT NULL,
    peso NUMERIC(10,3),
    disponibilidade BOOLEAN NOT NULL DEFAULT TRUE,
    id_categoria INT NOT NULL,
    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_previsao_entrega TIMESTAMP,
    CONSTRAINT fk_pedido_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE item_pedido (
    id_item SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
    CONSTRAINT fk_item_pedido_pedido
        FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_item_pedido_produto
        FOREIGN KEY (id_produto) REFERENCES produto(id_produto)
);

CREATE OR REPLACE FUNCTION validar_item_produto_disponivel()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM produto p
        WHERE p.id_produto = NEW.id_produto
          AND p.disponibilidade = TRUE
    ) THEN
        RAISE EXCEPTION 'Produto indisponivel para pedido';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_pedido_produto_disponivel
BEFORE INSERT OR UPDATE OF id_produto
ON item_pedido
FOR EACH ROW
EXECUTE FUNCTION validar_item_produto_disponivel();

CREATE TABLE status_entrega (
    id_status SERIAL PRIMARY KEY,
    nome_status VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responsavel VARCHAR(100)
);
