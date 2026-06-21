const pool = require('../db');

class ProdutoDAO {
    criarErroValidacao(mensagem) {
        const erro = new Error(mensagem);
        erro.status = 400;
        return erro;
    }

    normalizarEstoque(valor, valorPadrao = null) {
        const estoque = valor === undefined || valor === null || valor === ''
            ? valorPadrao
            : Number(valor);

        if (estoque === null) {
            return null;
        }

        if (!Number.isInteger(estoque) || estoque < 0) {
            throw this.criarErroValidacao('Estoque deve ser um numero inteiro maior ou igual a zero');
        }

        return estoque;
    }

    // CREATE
    async inserir(produto) {
        const estoque = this.normalizarEstoque(produto.estoque, 10);
        const query = `
            INSERT INTO produto
            (nome, descricao, peso, preco_base, estoque, id_categoria)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`;

        const values = [
            produto.nome,
            produto.descricao,
            produto.peso,
            produto.preco_base,
            estoque,
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
        const estoque = this.normalizarEstoque(produto.estoque);
        const query = `
            UPDATE produto
            SET nome = $1,
                descricao = $2,
                peso = $3,
                preco_base = $4,
                estoque = COALESCE($5, estoque),
                id_categoria = $6
            WHERE id_produto = $7
            RETURNING *`;

        const values = [
            produto.nome,
            produto.descricao,
            produto.peso,
            produto.preco_base,
            estoque,
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
