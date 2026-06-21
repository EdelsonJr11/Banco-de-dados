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

            if (!Number.isInteger(idProduto)
                || !Number.isInteger(quantidade)
                || quantidade <= 0
                || !Number.isFinite(desconto)
                || desconto < 0) {
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
            `
            SELECT
                id_produto,
                nome,
                preco_base,
                disponibilidade
            FROM produto
            WHERE id_produto = ANY($1::int[])
            `,
            [ids]
        );

        if (result.rows.length !== ids.length) {
            const erro = new Error('Um ou mais produtos do pedido nao existem');
            erro.status = 400;
            throw erro;
        }

        const indisponiveis = result.rows.filter((row) => row.disponibilidade !== true);
        if (indisponiveis.length > 0) {
            const nomes = indisponiveis.map((row) => row.nome).join(', ');
            const erro = new Error(`Produto indisponivel para pedido: ${nomes}`);
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
        const result = await pool.query(
            `
            CALL sp_realizar_venda($1, $2::jsonb, $3, $4)
            `,
            [
                pedido.id_cliente,
                JSON.stringify(itensValidados),
                pedido.data_previsao_entrega,
                null
            ]
        );

        return this.buscarPorId(result.rows[0].p_id_pedido);
    }

    // READ - todos
    async listarTodos() {
        const result = await pool.query('SELECT * FROM fn_listar_pedidos()');
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        const queryPedido = `
            SELECT
                p.*,
                fn_calcular_total_pedido(p.id_pedido) AS total_pedido
            FROM pedido p
            WHERE p.id_pedido = $1`;

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
            const itens = await this.buscarPrecosProdutos(client, itensValidados);

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
        const result = await pool.query('SELECT * FROM fn_listar_pedidos()');
        return result.rows;
    }

    async totalVendasPorCliente() {
        const result = await pool.query('SELECT * FROM fn_relatorio_vendas_por_cliente()');
        return result.rows;
    }

    async relatorioEstoque() {
        const result = await pool.query('SELECT * FROM fn_relatorio_estoque()');
        return result.rows;
    }
}

module.exports = new PedidoDAO();
