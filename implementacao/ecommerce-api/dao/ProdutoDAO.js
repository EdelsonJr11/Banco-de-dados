const pool = require('../db');

class ProdutoDAO {

    // CREATE
    async inserir(produto) {
        const query = `
            INSERT INTO produto
            (nome, descricao, peso, preco_base, disponibilidade, id_categoria)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`;

        const values = [
            produto.nome,
            produto.descricao,
            produto.peso,
            produto.preco_base,
            produto.disponibilidade,
            produto.id_categoria
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // READ - todos
    async listarTodos() {
        const query = `
            SELECT
                p.*,
                c.nome_categoria
            FROM produto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            ORDER BY p.id_produto`;

        const result = await pool.query(query);
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        const query = `
            SELECT
                p.*,
                c.nome_categoria
            FROM produto p
            LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
            WHERE p.id_produto = $1`;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // UPDATE
    async atualizar(id, produto) {
        const query = `
            UPDATE produto
            SET nome = $1,
                descricao = $2,
                peso = $3,
                preco_base = $4,
                disponibilidade = $5,
                id_categoria = $6
            WHERE id_produto = $7
            RETURNING *`;

        const values = [
            produto.nome,
            produto.descricao,
            produto.peso,
            produto.preco_base,
            produto.disponibilidade,
            produto.id_categoria,
            id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // DELETE
    async deletar(id) {
        const result = await pool.query(
            'DELETE FROM produto WHERE id_produto = $1 RETURNING *',
            [id]
        );
        return result.rowCount;
    }
}

module.exports = new ProdutoDAO();
