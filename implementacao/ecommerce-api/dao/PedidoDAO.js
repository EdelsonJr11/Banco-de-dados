const pool = require('../db');

class PedidoDAO {

    async listarPedidosComCliente() {
        const query = `
            SELECT p.id_pedido, c.nome, p.data_criacao
            FROM pedido p
            JOIN cliente c ON p.id_cliente = c.id_cliente
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    async totalVendasPorCliente() {
        const query = `
            SELECT c.nome,
                   SUM(i.quantidade * i.preco_unitario - i.desconto) AS total_vendas
            FROM cliente c
            JOIN pedido p ON c.id_cliente = p.id_cliente
            JOIN item_pedido i ON p.id_pedido = i.id_pedido
            GROUP BY c.nome
        `;
        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = new PedidoDAO();