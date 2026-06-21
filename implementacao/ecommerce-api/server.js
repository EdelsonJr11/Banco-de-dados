const express = require('express');
const cors = require('cors');
const path = require('path');
const ClienteDAO = require('./dao/ClienteDAO');
const PedidoDAO = require('./dao/PedidoDAO');
const ProdutoDAO = require('./dao/ProdutoDAO');
const CategoriaDAO = require('./dao/CategoriaDAO');
const SchemaDAO = require('./dao/SchemaDAO');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    const inicio = Date.now();

    res.on('finish', () => {
        const duracao = Date.now() - inicio;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracao}ms)`);
    });

    next();
});

const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

/* 
   CLIENTE CRUD COMPLETO
 */

// CREATE
app.post('/clientes', asyncHandler(async (req, res) => {
    const cliente = await ClienteDAO.inserir(req.body);
    res.status(201).json(cliente);
}));

// READ - todos
app.get('/clientes', asyncHandler(async (req, res) => {
    const clientes = await ClienteDAO.listarTodos();
    res.json(clientes);
}));

// READ - por ID
app.get('/clientes/:id', asyncHandler(async (req, res) => {
    const cliente = await ClienteDAO.buscarPorId(req.params.id);

    if (!cliente) {
        return res.status(404).json({ mensagem: 'Cliente nao encontrado' });
    }

    res.json(cliente);
}));

// UPDATE
app.put('/clientes/:id', asyncHandler(async (req, res) => {
    const cliente = await ClienteDAO.atualizar(req.params.id, req.body);

    if (!cliente) {
        return res.status(404).json({ mensagem: 'Cliente nao encontrado' });
    }

    res.json(cliente);
}));

// DELETE
app.delete('/clientes/:id', asyncHandler(async (req, res) => {
    const deletado = await ClienteDAO.deletar(req.params.id);

    if (deletado === 0) {
        return res.status(404).json({ mensagem: 'Cliente nao encontrado' });
    }

    res.json({ mensagem: 'Cliente deletado com sucesso' });
}));

/*
   CATEGORIA CRUD COMPLETO
*/

// CREATE
app.post('/categorias', asyncHandler(async (req, res) => {
    const categoria = await CategoriaDAO.inserir(req.body);
    res.status(201).json(categoria);
}));

// READ - todos
app.get('/categorias', asyncHandler(async (req, res) => {
    const categorias = await CategoriaDAO.listarTodos();
    res.json(categorias);
}));

// READ - por ID
app.get('/categorias/:id', asyncHandler(async (req, res) => {
    const categoria = await CategoriaDAO.buscarPorId(req.params.id);

    if (!categoria) {
        return res.status(404).json({ mensagem: 'Categoria nao encontrada' });
    }

    res.json(categoria);
}));

// UPDATE
app.put('/categorias/:id', asyncHandler(async (req, res) => {
    const categoria = await CategoriaDAO.atualizar(req.params.id, req.body);

    if (!categoria) {
        return res.status(404).json({ mensagem: 'Categoria nao encontrada' });
    }

    res.json(categoria);
}));

// DELETE
app.delete('/categorias/:id', asyncHandler(async (req, res) => {
    const deletado = await CategoriaDAO.deletar(req.params.id);

    if (deletado === 0) {
        return res.status(404).json({ mensagem: 'Categoria nao encontrada' });
    }

    res.json({ mensagem: 'Categoria deletada com sucesso' });
}));

/*
   PRODUTO CRUD COMPLETO
*/

// CREATE
app.post('/produtos', asyncHandler(async (req, res) => {
    const produto = await ProdutoDAO.inserir(req.body);
    res.status(201).json(produto);
}));

// READ - todos
app.get('/produtos', asyncHandler(async (req, res) => {
    const produtos = await ProdutoDAO.listarTodos();
    res.json(produtos);
}));

// READ - por ID
app.get('/produtos/:id', asyncHandler(async (req, res) => {
    const produto = await ProdutoDAO.buscarPorId(req.params.id);

    if (!produto) {
        return res.status(404).json({ mensagem: 'Produto nao encontrado' });
    }

    res.json(produto);
}));

// UPDATE
app.put('/produtos/:id', asyncHandler(async (req, res) => {
    const produto = await ProdutoDAO.atualizar(req.params.id, req.body);

    if (!produto) {
        return res.status(404).json({ mensagem: 'Produto nao encontrado' });
    }

    res.json(produto);
}));

// DELETE
app.delete('/produtos/:id', asyncHandler(async (req, res) => {
    const deletado = await ProdutoDAO.deletar(req.params.id);

    if (deletado === 0) {
        return res.status(404).json({ mensagem: 'Produto nao encontrado' });
    }

    res.json({ mensagem: 'Produto deletado com sucesso' });
}));

/* 
   PEDIDO CRUD COMPLETO
*/

// CREATE
app.post('/pedidos', asyncHandler(async (req, res) => {
    const pedido = await PedidoDAO.inserir(req.body);
    res.status(201).json(pedido);
}));

// READ - todos
app.get('/pedidos', asyncHandler(async (req, res) => {
    const pedidos = await PedidoDAO.listarTodos();
    res.json(pedidos);
}));

// READ - por ID
app.get('/pedidos/:id', asyncHandler(async (req, res) => {
    const pedido = await PedidoDAO.buscarPorId(req.params.id);

    if (!pedido) {
        return res.status(404).json({ mensagem: 'Pedido nao encontrado' });
    }

    res.json(pedido);
}));

// UPDATE
app.put('/pedidos/:id', asyncHandler(async (req, res) => {
    const pedido = await PedidoDAO.atualizar(req.params.id, req.body);

    if (!pedido) {
        return res.status(404).json({ mensagem: 'Pedido nao encontrado' });
    }

    res.json(pedido);
}));

// DELETE
app.delete('/pedidos/:id', asyncHandler(async (req, res) => {
    const deletado = await PedidoDAO.deletar(req.params.id);

    if (deletado === 0) {
        return res.status(404).json({ mensagem: 'Pedido nao encontrado' });
    }

    res.json({ mensagem: 'Pedido deletado com sucesso' });
}));

/* 
   RELATORIOS (JOIN + GROUP BY)
 */

app.get('/pedidos-com-cliente', asyncHandler(async (req, res) => {
    const dados = await PedidoDAO.listarPedidosComCliente();
    res.json(dados);
}));

app.get('/relatorio-vendas', asyncHandler(async (req, res) => {
    const dados = await PedidoDAO.totalVendasPorCliente();
    res.json(dados);
}));

app.get('/relatorio-estoque', asyncHandler(async (req, res) => {
    const dados = await PedidoDAO.relatorioEstoque();
    res.json(dados);
}));

app.get('/status', asyncHandler(async (req, res) => {
    const [clientes, produtos, categorias, pedidos] = await Promise.all([
        ClienteDAO.listarTodos(),
        ProdutoDAO.listarTodos(),
        CategoriaDAO.listarTodos(),
        PedidoDAO.listarTodos()
    ]);

    res.json({
        mensagem: 'API conectada ao PostgreSQL',
        clientes: clientes.length,
        produtos: produtos.length,
        categorias: categorias.length,
        pedidos: pedidos.length
    });
}));

app.use(express.static(path.join(__dirname, 'frontend'), {
    etag: false,
    lastModified: false,
    maxAge: 0
}));

app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/clientes')
        || req.path.startsWith('/categorias')
        || req.path.startsWith('/produtos')
        || req.path.startsWith('/pedidos')
        || req.path.startsWith('/relatorio')
        || req.path.startsWith('/status')) {
        return next();
    }

    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    const errosDeValidacaoPostgres = ['P0001', '23502', '23503', '23505', '23514'];
    const status = err.status || (errosDeValidacaoPostgres.includes(err.code) ? 400 : 500);
    const mensagem = status === 500 ? 'Erro no servidor, olhe os logs' : err.message;
    res.status(status).json({ mensagem });
});

async function iniciarServidor() {
    await SchemaDAO.garantirModeloCliente();
    await SchemaDAO.garantirRotinasEcommerce();
    const port = process.env.PORT || 3000;
    const [clientes, produtos, categorias, pedidos] = await Promise.all([
        ClienteDAO.listarTodos(),
        ProdutoDAO.listarTodos(),
        CategoriaDAO.listarTodos(),
        PedidoDAO.listarTodos()
    ]);
    console.log(`Clientes: ${clientes.length}, Produtos: ${produtos.length}, Categorias: ${categorias.length}, Pedidos: ${pedidos.length}`);
    app.listen(port, () => {
        console.log(`Servidor rodando na porta ${port}`);
    });
}

iniciarServidor().catch((erro) => {
    console.error('Falha ao iniciar servidor:', erro);
    process.exit(1);
});
