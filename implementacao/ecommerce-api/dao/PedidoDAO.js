const pool = require('../db');

class PedidoDAO {

    validarItens(itens) {
        if (!Array.isArray(itens) || itens.length === 0) {
            const erro = new Error('Pedido precisa ter pelo menos um produto');
            erro.status = 400;
            throw erro;
        }

        return itens.map((item) => {
            const idProduto = Number(item.id_produto);
            const quantidade = Number(item.quantidade);
            const desconto = Number(item.desconto ?? 0);

            if (!idProduto || quantidade <= 0 || desconto < 0) {
                const erro = new Error('Item de pedido invalido');
                erro.status = 400;
                throw erro;
            }

            return {
                id_produto: idProduto,
                quantidade,
                desconto
            };
        });
    }

    async buscarPrecosProdutos(client, itens) {
        const ids = [...new Set(itens.map((item) => item.id_produto))];
        const result = await client.query(
            'SELECT id_produto, preco_base FROM produto WHERE id_produto = ANY($1::int[])',
            [ids]
        );

        if (result.rows.length !== ids.length) {
            const erro = new Error('Um ou mais produtos do pedido nao existem');
            erro.status = 400;
            throw erro;
        }

        const mapaPrecos = new Map(
            result.rows.map((row) => [Number(row.id_produto), Number(row.preco_base)])
        );

        return itens.map((item) => ({
            ...item,
            preco_unitario: mapaPrecos.get(item.id_produto)
        }));
    }

    // CREATE
    async inserir(pedido) {
        const itensValidados = this.validarItens(pedido.itens);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const itens = await this.buscarPrecosProdutos(client, itensValidados);

            const queryPedido = `
                INSERT INTO pedido
                (data_previsao_entrega, id_cliente)
                VALUES ($1, $2)
                RETURNING *`;

            const valuesPedido = [
                pedido.data_previsao_entrega,
                pedido.id_cliente
            ];

            const resultPedido = await client.query(queryPedido, valuesPedido);
            const pedidoCriado = resultPedido.rows[0];

            const queryItem = `
                INSERT INTO item_pedido
                (quantidade, preco_unitario, desconto, id_pedido, id_produto)
                VALUES ($1, $2, $3, $4, $5)`;

            for (const item of itens) {
                await client.query(queryItem, [
                    item.quantidade,
                    item.preco_unitario,
                    item.desconto,
                    pedidoCriado.id_pedido,
                    item.id_produto
                ]);
            }

            await client.query('COMMIT');
            return { ...pedidoCriado, itens };
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    }

    // READ - todos
    async listarTodos() {
        const query = `
            SELECT
                p.*,
                c.nome AS cliente_nome,
                COUNT(i.id_item) AS quantidade_itens,
                COALESCE(SUM(i.quantidade), 0) AS quantidade_total,
                COALESCE(
                    STRING_AGG(
                        pr.nome,
                        ', ' ORDER BY i.id_item
                    ) FILTER (WHERE i.id_item IS NOT NULL),
                    '-'
                ) AS itens_resumo,
                COALESCE(SUM((i.quantidade * i.preco_unitario) - COALESCE(i.desconto, 0)), 0) AS total_pedido
            FROM pedido p
            JOIN cliente c ON c.id_cliente = p.id_cliente
            LEFT JOIN item_pedido i ON i.id_pedido = p.id_pedido
            LEFT JOIN produto pr ON pr.id_produto = i.id_produto
            GROUP BY p.id_pedido, c.nome
            ORDER BY p.id_pedido`;

        const result = await pool.query(query);
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        const queryPedido = `
            SELECT *
            FROM pedido
            WHERE id_pedido = $1`;

        const resultPedido = await pool.query(queryPedido, [id]);
        const pedido = resultPedido.rows[0];

        if (!pedido) {
            return null;
        }

        const queryItens = `
            SELECT id_item, id_produto, quantidade, preco_unitario, desconto
            FROM item_pedido
            WHERE id_pedido = $1
            ORDER BY id_item`;

        const resultItens = await pool.query(queryItens, [id]);
        return { ...pedido, itens: resultItens.rows };
    }

    // UPDATE
    async atualizar(id, pedido) {
        const itensValidados = this.validarItens(pedido.itens);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const itens = await this.buscarPrecosProdutos(client, itensValidados);

            const queryPedido = `
                UPDATE pedido
                SET data_previsao_entrega = $1,
                    id_cliente = $2
                WHERE id_pedido = $3
                RETURNING *`;

            const valuesPedido = [
                pedido.data_previsao_entrega,
                pedido.id_cliente,
                id
            ];

            const resultPedido = await client.query(queryPedido, valuesPedido);
            const pedidoAtualizado = resultPedido.rows[0];

            if (!pedidoAtualizado) {
                await client.query('ROLLBACK');
                return null;
            }

            await client.query('DELETE FROM item_pedido WHERE id_pedido = $1', [id]);

            const queryItem = `
                INSERT INTO item_pedido
                (quantidade, preco_unitario, desconto, id_pedido, id_produto)
                VALUES ($1, $2, $3, $4, $5)`;

            for (const item of itens) {
                await client.query(queryItem, [
                    item.quantidade,
                    item.preco_unitario,
                    item.desconto,
                    id,
                    item.id_produto
                ]);
            }

            await client.query('COMMIT');
            return { ...pedidoAtualizado, itens };
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    }

    // DELETE
    async deletar(id) {
        const result = await pool.query(
            'DELETE FROM pedido WHERE id_pedido = $1 RETURNING *',
            [id]
        );
        return result.rowCount;
    }

    async listarPedidosComCliente() {
        const query = `
            SELECT
                p.id_pedido,
                p.data_criacao,
                p.data_previsao_entrega,
                c.id_cliente,
                c.nome AS cliente_nome,
                c.email AS cliente_email,
                COALESCE(SUM((i.quantidade * i.preco_unitario) - COALESCE(i.desconto, 0)), 0) AS total_pedido
            FROM pedido p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN item_pedido i ON i.id_pedido = p.id_pedido
            GROUP BY p.id_pedido, c.id_cliente
            ORDER BY p.id_pedido
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    async totalVendasPorCliente() {
        const query = `
            WITH total_por_pedido AS (
                SELECT
                    p.id_pedido,
                    p.id_cliente,
                    COALESCE(SUM((i.quantidade * i.preco_unitario) - COALESCE(i.desconto, 0)), 0) AS total_pedido
                FROM pedido p
                LEFT JOIN item_pedido i ON i.id_pedido = p.id_pedido
                GROUP BY p.id_pedido, p.id_cliente
            )
            SELECT
                c.id_cliente,
                c.nome,
                COALESCE(COUNT(tpp.id_pedido), 0)::INT AS total_pedidos,
                COALESCE(SUM(tpp.total_pedido), 0)::NUMERIC(12,2) AS total_vendas
            FROM cliente c
            LEFT JOIN total_por_pedido tpp ON tpp.id_cliente = c.id_cliente
            GROUP BY c.id_cliente, c.nome
            ORDER BY total_vendas DESC, c.nome
        `;
        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = new PedidoDAO();
