const pool = require('../db');

class ClienteDAO {
    static BASE_SELECT = `
        SELECT
            c.id_cliente,
            c.email,
            c.tipo,
            COALESCE(pf.nome, pj.razao_social, '-') AS nome_exibicao,
            pf.nome,
            pf.cpf,
            pf.data_nascimento,
            pf.genero,
            pj.cnpj,
            pj.razao_social,
            pj.inscricao_estadual,
            e.rua,
            e.numero,
            e.bairro,
            e.cidade,
            e.cep,
            tel.numero AS telefone_numero
        FROM cliente c
        LEFT JOIN pessoa_fisica pf ON pf.id_cliente = c.id_cliente
        LEFT JOIN pessoa_juridica pj ON pj.id_cliente = c.id_cliente
        LEFT JOIN endereco e ON e.id_cliente = c.id_cliente
        LEFT JOIN LATERAL (
            SELECT t.numero
            FROM telefone t
            WHERE t.id_cliente = c.id_cliente
            ORDER BY t.id_telefone
            LIMIT 1
        ) tel ON TRUE
    `;

    criarErroValidacao(mensagem) {
        const erro = new Error(mensagem);
        erro.status = 400;
        return erro;
    }

    normalizarTipo(tipo) {
        const tipoNormalizado = String(tipo || '').trim().toUpperCase();

        if (!['PF', 'PJ'].includes(tipoNormalizado)) {
            throw this.criarErroValidacao('Tipo do cliente deve ser PF ou PJ');
        }

        return tipoNormalizado;
    }

    validarComum(cliente) {
        const email = String(cliente.email || '').trim();
        if (!email) {
            throw this.criarErroValidacao('Email do cliente e obrigatorio');
        }

        const rua = String(cliente.rua || '').trim();
        const numero = String(cliente.numero || '').trim();
        const bairro = String(cliente.bairro || '').trim();
        const cidade = String(cliente.cidade || '').trim();
        const cep = String(cliente.cep || '').trim();

        if (!rua || !bairro || !cidade || !cep) {
            throw this.criarErroValidacao('Endereco do cliente esta incompleto');
        }

        const telefoneNumero = String(cliente.telefone_numero || '').trim();

        return {
            email,
            endereco: { rua, numero: numero || null, bairro, cidade, cep },
            telefone_numero: telefoneNumero || null
        };
    }

    validarPessoaFisica(cliente) {
        const nome = String(cliente.nome || '').trim();
        const cpf = String(cliente.cpf || '').trim();
        const dataNascimento = String(cliente.data_nascimento || '').trim();
        const genero = String(cliente.genero || '').trim().toUpperCase();

        if (!nome || !cpf || !dataNascimento || !['M', 'F'].includes(genero)) {
            throw this.criarErroValidacao('PF exige nome, cpf, data_nascimento e genero (M/F)');
        }

        return {
            nome,
            cpf,
            data_nascimento: dataNascimento,
            genero
        };
    }

    validarPessoaJuridica(cliente) {
        const cnpj = String(cliente.cnpj || '').trim();
        const razaoSocial = String(cliente.razao_social || '').trim();
        const inscricaoEstadual = String(cliente.inscricao_estadual || '').trim();

        if (!cnpj || !razaoSocial) {
            throw this.criarErroValidacao('PJ exige cnpj e razao_social');
        }

        return {
            cnpj,
            razao_social: razaoSocial,
            inscricao_estadual: inscricaoEstadual || null
        };
    }

    normalizarCliente(cliente) {
        const tipo = this.normalizarTipo(cliente.tipo);
        const comum = this.validarComum(cliente);

        if (tipo === 'PF') {
            return {
                ...comum,
                tipo,
                pessoa_fisica: this.validarPessoaFisica(cliente),
                pessoa_juridica: null
            };
        }

        return {
            ...comum,
            tipo,
            pessoa_fisica: null,
            pessoa_juridica: this.validarPessoaJuridica(cliente)
        };
    }

    async buscarPorIdComExecutor(executor, id) {
        const result = await executor.query(
            `${ClienteDAO.BASE_SELECT} WHERE c.id_cliente = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async inserirPessoaComTipo(client, idCliente, dados) {
        if (dados.tipo === 'PF') {
            await client.query('DELETE FROM pessoa_juridica WHERE id_cliente = $1', [idCliente]);
            await client.query(
                `
                INSERT INTO pessoa_fisica
                (id_cliente, nome, cpf, data_nascimento, genero)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id_cliente) DO UPDATE
                SET nome = EXCLUDED.nome,
                    cpf = EXCLUDED.cpf,
                    data_nascimento = EXCLUDED.data_nascimento,
                    genero = EXCLUDED.genero
                `,
                [
                    idCliente,
                    dados.pessoa_fisica.nome,
                    dados.pessoa_fisica.cpf,
                    dados.pessoa_fisica.data_nascimento,
                    dados.pessoa_fisica.genero
                ]
            );
            return;
        }

        await client.query('DELETE FROM pessoa_fisica WHERE id_cliente = $1', [idCliente]);
        await client.query(
            `
            INSERT INTO pessoa_juridica
            (id_cliente, cnpj, razao_social, inscricao_estadual)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id_cliente) DO UPDATE
            SET cnpj = EXCLUDED.cnpj,
                razao_social = EXCLUDED.razao_social,
                inscricao_estadual = EXCLUDED.inscricao_estadual
            `,
            [
                idCliente,
                dados.pessoa_juridica.cnpj,
                dados.pessoa_juridica.razao_social,
                dados.pessoa_juridica.inscricao_estadual
            ]
        );
    }

    async inserirEnderecoETelefone(client, idCliente, dados) {
        await client.query(
            `
            INSERT INTO endereco
            (id_cliente, rua, numero, bairro, cidade, cep)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_cliente) DO UPDATE
            SET rua = EXCLUDED.rua,
                numero = EXCLUDED.numero,
                bairro = EXCLUDED.bairro,
                cidade = EXCLUDED.cidade,
                cep = EXCLUDED.cep
            `,
            [
                idCliente,
                dados.endereco.rua,
                dados.endereco.numero,
                dados.endereco.bairro,
                dados.endereco.cidade,
                dados.endereco.cep
            ]
        );

        await client.query('DELETE FROM telefone WHERE id_cliente = $1', [idCliente]);
        if (dados.telefone_numero) {
            await client.query(
                `
                INSERT INTO telefone (id_cliente, numero)
                VALUES ($1, $2)
                `,
                [idCliente, dados.telefone_numero]
            );
        }
    }

    // CREATE
    async inserir(cliente) {
        const dados = this.normalizarCliente(cliente);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const resultCliente = await client.query(
                `
                INSERT INTO cliente (email, tipo)
                VALUES ($1, $2)
                RETURNING id_cliente
                `,
                [dados.email, dados.tipo]
            );

            const idCliente = resultCliente.rows[0].id_cliente;
            await this.inserirEnderecoETelefone(client, idCliente, dados);
            await this.inserirPessoaComTipo(client, idCliente, dados);

            const clienteCriado = await this.buscarPorIdComExecutor(client, idCliente);
            await client.query('COMMIT');
            return clienteCriado;
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    }

    // READ - todos
    async listarTodos() {
        const result = await pool.query(
            `${ClienteDAO.BASE_SELECT} ORDER BY c.id_cliente`
        );
        return result.rows;
    }

    // READ - por ID
    async buscarPorId(id) {
        return this.buscarPorIdComExecutor(pool, id);
    }

    // UPDATE
    async atualizar(id, cliente) {
        const dados = this.normalizarCliente(cliente);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const resultCliente = await client.query(
                `
                UPDATE cliente
                SET email = $1,
                    tipo = $2
                WHERE id_cliente = $3
                RETURNING id_cliente
                `,
                [dados.email, dados.tipo, id]
            );

            if (resultCliente.rowCount === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            await this.inserirEnderecoETelefone(client, id, dados);
            await this.inserirPessoaComTipo(client, id, dados);

            const clienteAtualizado = await this.buscarPorIdComExecutor(client, id);
            await client.query('COMMIT');
            return clienteAtualizado;
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
            'DELETE FROM cliente WHERE id_cliente = $1 RETURNING *',
            [id]
        );
        return result.rowCount;
    }
}

module.exports = new ClienteDAO();
