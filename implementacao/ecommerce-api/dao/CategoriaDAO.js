const pool = require('../db');

class CategoriaDAO {

    // CREATE
    async inserir(categoria) {
        const query = `
            INSERT INTO categoria
            (nome_categoria, descricao)
            VALUES ($1, $2)
            RETURNING *`;

        const values = [
            categoria.nome_categoria,
            categoria.descricao
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // READ - todos
    async listarTodos() {
        const query = `
            SELECT *
            FROM categoria
            ORDER BY id_categoria`;

        const result = await pool.query(query);
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        const query = `
            SELECT *
            FROM categoria
            WHERE id_categoria = $1`;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // UPDATE
    async atualizar(id, categoria) {
        const query = `
            UPDATE categoria
            SET nome_categoria = $1,
                descricao = $2
            WHERE id_categoria = $3
            RETURNING *`;

        const values = [
            categoria.nome_categoria,
            categoria.descricao,
            id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // DELETE
    async deletar(id) {
        const result = await pool.query(
            'DELETE FROM categoria WHERE id_categoria = $1 RETURNING *',
            [id]
        );
        return result.rowCount;
    }
}

module.exports = new CategoriaDAO();
