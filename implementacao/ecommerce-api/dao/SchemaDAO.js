const pool = require('../db');

class SchemaDAO {
    async garantirModeloCliente() {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query(`
                ALTER TABLE cliente
                ADD COLUMN IF NOT EXISTS tipo CHAR(2)
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'cliente'
                          AND column_name = 'nome'
                    ) THEN
                        ALTER TABLE cliente ALTER COLUMN nome DROP NOT NULL;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'cliente'
                          AND column_name = 'rua'
                    ) THEN
                        ALTER TABLE cliente ALTER COLUMN rua DROP NOT NULL;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'cliente'
                          AND column_name = 'bairro'
                    ) THEN
                        ALTER TABLE cliente ALTER COLUMN bairro DROP NOT NULL;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'cliente'
                          AND column_name = 'cidade'
                    ) THEN
                        ALTER TABLE cliente ALTER COLUMN cidade DROP NOT NULL;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'cliente'
                          AND column_name = 'cep'
                    ) THEN
                        ALTER TABLE cliente ALTER COLUMN cep DROP NOT NULL;
                    END IF;
                END $$;
            `);

            await client.query(`
                UPDATE cliente c
                SET tipo = CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM pessoa_juridica pj
                        WHERE pj.id_cliente = c.id_cliente
                    ) THEN 'PJ'
                    ELSE 'PF'
                END
                WHERE c.tipo IS NULL OR c.tipo NOT IN ('PF', 'PJ')
            `);

            await client.query(`
                ALTER TABLE cliente
                ALTER COLUMN tipo SET DEFAULT 'PF'
            `);

            await client.query(`
                ALTER TABLE cliente
                ALTER COLUMN tipo SET NOT NULL
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'cliente_tipo_check'
                          AND conrelid = 'cliente'::regclass
                    ) THEN
                        ALTER TABLE cliente
                        ADD CONSTRAINT cliente_tipo_check
                        CHECK (tipo IN ('PF', 'PJ'));
                    END IF;
                END $$;
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'produto'
                    ) AND EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'item_pedido'
                    ) THEN
                        CREATE OR REPLACE FUNCTION validar_item_produto_disponivel()
                        RETURNS TRIGGER AS $func$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1
                                FROM produto p
                                WHERE p.id_produto = NEW.id_produto
                                  AND p.disponibilidade = TRUE
                            ) THEN
                                RAISE EXCEPTION 'Produto indisponivel para pedido';
                            END IF;

                            RETURN NEW;
                        END;
                        $func$ LANGUAGE plpgsql;
                    END IF;
                END $$;
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'item_pedido'
                    ) AND NOT EXISTS (
                        SELECT 1
                        FROM pg_trigger
                        WHERE tgname = 'trg_item_pedido_produto_disponivel'
                          AND tgrelid = 'item_pedido'::regclass
                    ) THEN
                        CREATE TRIGGER trg_item_pedido_produto_disponivel
                        BEFORE INSERT OR UPDATE OF id_produto
                        ON item_pedido
                        FOR EACH ROW
                        EXECUTE FUNCTION validar_item_produto_disponivel();
                    END IF;
                END $$;
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS endereco (
                    id_cliente INT PRIMARY KEY,
                    rua VARCHAR(100) NOT NULL,
                    numero VARCHAR(20),
                    bairro VARCHAR(50) NOT NULL,
                    cep VARCHAR(10) NOT NULL,
                    cidade VARCHAR(50) NOT NULL,
                    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS telefone (
                    id_telefone SERIAL PRIMARY KEY,
                    id_cliente INT NOT NULL,
                    numero VARCHAR(20) NOT NULL,
                    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
                )
            `);

            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS ux_telefone_cliente_numero
                ON telefone (id_cliente, numero)
            `);

            await client.query(`
                INSERT INTO endereco (id_cliente, rua, numero, bairro, cep, cidade)
                SELECT
                    c.id_cliente,
                    TRIM(to_jsonb(c)->>'rua'),
                    NULLIF(TRIM(to_jsonb(c)->>'numero'), ''),
                    TRIM(to_jsonb(c)->>'bairro'),
                    TRIM(to_jsonb(c)->>'cep'),
                    TRIM(to_jsonb(c)->>'cidade')
                FROM cliente c
                LEFT JOIN endereco e ON e.id_cliente = c.id_cliente
                WHERE e.id_cliente IS NULL
                  AND NULLIF(TRIM(to_jsonb(c)->>'rua'), '') IS NOT NULL
                  AND NULLIF(TRIM(to_jsonb(c)->>'bairro'), '') IS NOT NULL
                  AND NULLIF(TRIM(to_jsonb(c)->>'cep'), '') IS NOT NULL
                  AND NULLIF(TRIM(to_jsonb(c)->>'cidade'), '') IS NOT NULL
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'telefone_cliente'
                    ) THEN
                        INSERT INTO telefone (id_cliente, numero)
                        SELECT
                            tc.id_cliente,
                            tc.telefone
                        FROM telefone_cliente tc
                        ON CONFLICT (id_cliente, numero) DO NOTHING;
                    END IF;
                END $$;
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS pessoa_fisica (
                    id_cliente INT PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL,
                    cpf VARCHAR(14) NOT NULL UNIQUE,
                    data_nascimento DATE NOT NULL,
                    genero CHAR(2) NOT NULL,
                    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS pessoa_juridica (
                    id_cliente INT PRIMARY KEY,
                    cnpj VARCHAR(18) NOT NULL UNIQUE,
                    razao_social VARCHAR(100) NOT NULL,
                    inscricao_estadual VARCHAR(30),
                    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE
                )
            `);

            await client.query(`
                ALTER TABLE pessoa_fisica
                ADD COLUMN IF NOT EXISTS nome VARCHAR(100)
            `);

            await client.query(`
                UPDATE pessoa_fisica pf
                SET nome = TRIM(to_jsonb(c)->>'nome')
                FROM cliente c
                WHERE c.id_cliente = pf.id_cliente
                  AND (pf.nome IS NULL OR pf.nome = '')
                  AND NULLIF(TRIM(to_jsonb(c)->>'nome'), '') IS NOT NULL
            `);

            await client.query(`
                INSERT INTO pessoa_fisica (id_cliente, nome, cpf, data_nascimento, genero)
                SELECT
                    c.id_cliente,
                    COALESCE(NULLIF(TRIM(to_jsonb(c)->>'nome'), ''), CONCAT('Cliente PF ', c.id_cliente)),
                    CONCAT('CPF-', c.id_cliente),
                    CURRENT_DATE,
                    'M'
                FROM cliente c
                LEFT JOIN pessoa_fisica pf ON pf.id_cliente = c.id_cliente
                WHERE c.tipo = 'PF'
                  AND pf.id_cliente IS NULL
            `);

            await client.query(`
                UPDATE pessoa_fisica
                SET nome = COALESCE(NULLIF(nome, ''), CONCAT('Cliente PF ', id_cliente))
                WHERE nome IS NULL OR nome = ''
            `);

            await client.query(`
                UPDATE pessoa_fisica
                SET data_nascimento = COALESCE(data_nascimento, CURRENT_DATE)
                WHERE data_nascimento IS NULL
            `);

            await client.query(`
                ALTER TABLE pessoa_fisica
                ALTER COLUMN genero TYPE CHAR(2)
                USING (
                    CASE
                        WHEN UPPER(LEFT(COALESCE(genero, ''), 1)) = 'F' THEN 'F'
                        ELSE 'M'
                    END
                )
            `);

            await client.query(`
                UPDATE pessoa_fisica
                SET genero = 'M'
                WHERE genero IS NULL OR genero = ''
            `);

            await client.query(`
                ALTER TABLE pessoa_fisica
                ALTER COLUMN nome SET NOT NULL
            `);

            await client.query(`
                ALTER TABLE pessoa_fisica
                ALTER COLUMN data_nascimento SET NOT NULL
            `);

            await client.query(`
                ALTER TABLE pessoa_fisica
                ALTER COLUMN genero SET NOT NULL
            `);

            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'pessoa_fisica_genero_check'
                          AND conrelid = 'pessoa_fisica'::regclass
                    ) THEN
                        ALTER TABLE pessoa_fisica
                        ADD CONSTRAINT pessoa_fisica_genero_check
                        CHECK (genero IN ('M', 'F'));
                    END IF;
                END $$;
            `);

            await client.query('COMMIT');
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    }
}

module.exports = new SchemaDAO();
