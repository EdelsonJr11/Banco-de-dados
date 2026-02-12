const express = require('express');
const cors = require('cors');
const ClienteDAO = require('./dao/ClienteDAO');
const PedidoDAO = require('./dao/PedidoDAO');

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   CLIENTE CRUD COMPLETO
========================= */

// CREATE
app.post('/clientes', async (req, res) => {
    const cliente = await ClienteDAO.inserir(req.body);
    res.json(cliente);
});

// READ - todos
app.get('/clientes', async (req, res) => {
    const clientes = await ClienteDAO.listarTodos();
    res.json(clientes);
});

// READ - por ID
app.get('/clientes/:id', async (req, res) => {
    const cliente = await ClienteDAO.buscarPorId(req.params.id);
    res.json(cliente);
});

// UPDATE
app.put('/clientes/:id', async (req, res) => {
    const cliente = await ClienteDAO.atualizar(req.params.id, req.body);
    res.json(cliente);
});

// DELETE
app.delete('/clientes/:id', async (req, res) => {
    const deletado = await ClienteDAO.deletar(req.params.id);

    if (deletado === 0) {
        return res.status(404).json({ mensagem: "Cliente não encontrado" });
    }

    res.json({ mensagem: "Cliente deletado com sucesso" });
});


/* =========================
   RELATÓRIO (JOIN + GROUP BY)
========================= */

app.get('/relatorio-vendas', async (req, res) => {
    const dados = await PedidoDAO.totalVendasPorCliente();
    res.json(dados);
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});