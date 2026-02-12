const pool = require('../db');

class ClienteDAO {

    // CREATE
    async inserir(cliente) {
        const query = `
            INSERT INTO cliente 
            (nome, email, rua, numero, bairro, cidade, cep)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *`;

        const values = [
            cliente.nome,
            cliente.email,
            cliente.rua,
            cliente.numero,
            cliente.bairro,
            cliente.cidade,
            cliente.cep
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // READ - todos
    async listarTodos() {
        const result = await pool.query('SELECT * FROM cliente');
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        const result = await pool.query(
            'SELECT * FROM cliente WHERE id_cliente = $1',
            [id]
        );
        return result.rows[0];
    }

    // UPDATE
    async atualizar(id, cliente) {
        const query = `
            UPDATE cliente
            SET nome=$1, email=$2, rua=$3, numero=$4,
                bairro=$5, cidade=$6, cep=$7
            WHERE id_cliente=$8
            RETURNING *`;

        const values = [
            cliente.nome,
            cliente.email,
            cliente.rua,
            cliente.numero,
            cliente.bairro,
            cliente.cidade,
            cliente.cep,
            id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // DELETE
    async deletar(id) {
        const result = await pool.query(
        'DELETE FROM cliente WHERE id_cliente=$1 RETURNING *',
        [id]
        );
        return result.rowCount;
    }
}

module.exports = new ClienteDAO();