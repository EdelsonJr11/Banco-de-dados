CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    rua VARCHAR(100) NOT NULL,
    numero VARCHAR(10),
    bairro VARCHAR(50) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    cep VARCHAR(10) NOT NULL
);
CREATE TABLE telefone_cliente (
    id_telefone SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);
CREATE TABLE pessoa_fisica (
    id_cliente INT PRIMARY KEY,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    genero VARCHAR(20),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
);
CREATE TABLE pessoa_juridica (
    id_cliente INT PRIMARY KEY,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    razao_social VARCHAR(100) NOT NULL,
    inscricao_estadual VARCHAR(30),
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
    peso NUMERIC(10,2),
    preco_base NUMERIC(10,2) NOT NULL,
    disponibilidade BOOLEAN DEFAULT TRUE,
    id_categoria INT NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);
CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_previsao_entrega DATE,
    id_cliente INT NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);
CREATE TABLE item_pedido (
    id_item SERIAL PRIMARY KEY,
    quantidade INT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    desconto NUMERIC(10,2) DEFAULT 0,
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES produto(id_produto)
);
CREATE TABLE status_entrega (
    id_status SERIAL PRIMARY KEY,
    nome_status VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responsavel VARCHAR(100),
    id_pedido INT NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido) ON DELETE CASCADE
);
