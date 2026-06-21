# Mapa exato dos requisitos de Banco de Dados II

## Arquivos principais

- Script completo para criar um banco novo: `database.sql`
- Rotinas aplicadas automaticamente em banco existente: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Chamadas SQL prontas para o pgAdmin: `ecommerce-api/sql/exemplos_apresentacao.sql`
- Integracao da Procedure e das Functions: `ecommerce-api/dao/PedidoDAO.js`
- Rotas usadas pela interface: `ecommerce-api/server.js`
- Tela normal de pedidos: `ecommerce-api/frontend/js/modules/pedidos.js`
- Tela normal de relatorios: `ecommerce-api/frontend/js/modules/relatorios.js`

## Localizacao rapida por linha

| Recurso | Localizacao principal |
|---|---|
| Function que sincroniza disponibilidade | `ecommerce-api/sql/rotinas_ecommerce.sql:27` |
| Trigger que sincroniza disponibilidade | `ecommerce-api/sql/rotinas_ecommerce.sql:40` |
| Function `fn_calcular_total_item` | `ecommerce-api/sql/rotinas_ecommerce.sql:50` |
| Function `fn_calcular_total_pedido` | `ecommerce-api/sql/rotinas_ecommerce.sql:82` |
| Function `fn_listar_pedidos` | `ecommerce-api/sql/rotinas_ecommerce.sql:97` |
| Function `fn_relatorio_vendas_por_cliente` | `ecommerce-api/sql/rotinas_ecommerce.sql:140` |
| Function `fn_relatorio_estoque` | `ecommerce-api/sql/rotinas_ecommerce.sql:168` |
| Function do Trigger de estoque | `ecommerce-api/sql/rotinas_ecommerce.sql:196` |
| Trigger de estoque | `ecommerce-api/sql/rotinas_ecommerce.sql:279` |
| Function do Trigger de auditoria | `ecommerce-api/sql/rotinas_ecommerce.sql:285` |
| Trigger de auditoria | `ecommerce-api/sql/rotinas_ecommerce.sql:299` |
| Procedure `sp_realizar_venda` | `ecommerce-api/sql/rotinas_ecommerce.sql:315` |
| Aplicacao chama a Procedure | `ecommerce-api/dao/PedidoDAO.js:75` |
| Aplicacao chama Functions de relatorio | `ecommerce-api/dao/PedidoDAO.js:93` e `ecommerce-api/dao/PedidoDAO.js:190` |
| Rota normal que cria pedido | `ecommerce-api/server.js:179` |
| Rotas normais de relatorio | `ecommerce-api/server.js:227` |
| Botao normal Salvar Pedido | `ecommerce-api/frontend/index.html:230` |
| Relatorio normal de estoque | `ecommerce-api/frontend/index.html:64` |

## Procedure transacional

### `sp_realizar_venda`

**Onde esta**

- SQL: `ecommerce-api/sql/rotinas_ecommerce.sql`, procure por `CREATE OR REPLACE PROCEDURE sp_realizar_venda`.
- Banco novo: `database.sql`, procure pelo mesmo nome.
- Aplicacao: `ecommerce-api/dao/PedidoDAO.js`, metodo `inserir`.
- Rota: `ecommerce-api/server.js`, rota `POST /pedidos`.
- Interface: tela **Pedidos**, botao **Salvar Pedido**.

**Como funciona**

1. Recebe o cliente, uma lista JSON de itens e a previsao de entrega.
2. Valida se o cliente existe.
3. Cria o pedido.
4. Percorre os produtos recebidos.
5. Bloqueia cada produto com `FOR UPDATE` durante a venda.
6. Valida disponibilidade, quantidade e estoque.
7. Chama `fn_calcular_total_item`.
8. Insere os itens do pedido.
9. Atualiza a previsao de entrega.
10. Executa `COMMIT`.

Se cliente, produto, quantidade ou estoque forem invalidos, executa `ROLLBACK`. Assim, nunca fica um pedido salvo pela metade.

**Como explicar**

"A Procedure representa a venda completa. Ela agrupa SELECT, INSERT, UPDATE, chamada de Function e controle da transacao. O COMMIT confirma tudo; o ROLLBACK desfaz tudo quando ocorre um problema."

## Functions

### `fn_calcular_total_item`

**Onde esta:** `ecommerce-api/sql/rotinas_ecommerce.sql`.

Recebe quantidade, preco e desconto. Valida os valores e retorna:

```text
quantidade * preco - desconto
```

Ela e chamada pela Procedure e pela Function de total do pedido.

### `fn_calcular_total_pedido`

**Onde esta:** `ecommerce-api/sql/rotinas_ecommerce.sql`.

Recebe o ID do pedido, chama `fn_calcular_total_item` para seus itens e retorna um valor escalar com o total.

Usada por:

- `fn_listar_pedidos`
- `fn_relatorio_vendas_por_cliente`
- `ecommerce-api/dao/PedidoDAO.js`, metodo `buscarPorId`

### `fn_listar_pedidos`

**Onde esta**

- SQL: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Aplicacao: `ecommerce-api/dao/PedidoDAO.js`, metodos `listarTodos` e `listarPedidosComCliente`
- Interface: telas **Pedidos** e **Relatorios**

Retorna uma tabela pronta com cliente, itens, quantidades, datas e total calculado.

### `fn_relatorio_vendas_por_cliente`

**Onde esta**

- SQL: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Aplicacao: `ecommerce-api/dao/PedidoDAO.js`, metodo `totalVendasPorCliente`
- Rota: `GET /relatorio-vendas`
- Interface: **Relatorios > Vendas por Cliente**

Agrupa os pedidos por cliente e usa `fn_calcular_total_pedido` para somar as vendas.

### `fn_relatorio_estoque`

**Onde esta**

- SQL: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Aplicacao: `ecommerce-api/dao/PedidoDAO.js`, metodo `relatorioEstoque`
- Rota: `GET /relatorio-estoque`
- Interface: **Relatorios > Estoque e movimentacoes automaticas**

Retorna estoque atual, disponibilidade, quantidade de alteracoes e data da ultima movimentacao.

**Como explicar as Functions**

"As Functions centralizam calculos e consultas reutilizaveis no PostgreSQL. A aplicacao recebe dados ja consistentes, e outras Functions e a Procedure tambem podem reutiliza-las."

## Triggers

### `trg_produto_sincronizar_disponibilidade`

**Onde esta**

- Trigger e funcao executada: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Funcao do Trigger: `sincronizar_disponibilidade_estoque`
- Tabela observada: `produto`

Mantem disponibilidade e estoque coerentes:

- Quando o estoque chega a zero, torna o produto indisponivel.
- Quando o estoque fica maior que zero, torna o produto disponivel.
- A disponibilidade nao e escolhida manualmente; ela sempre e calculada pelo estoque.

### `trg_item_pedido_controlar_estoque`

**Onde esta**

- Trigger e funcao executada: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Funcao do Trigger: `controlar_estoque_item_pedido`
- Tabela observada: `item_pedido`

Executa automaticamente:

- `INSERT`: baixa a quantidade do estoque.
- `UPDATE`: calcula a diferenca e ajusta o estoque.
- `DELETE`: devolve a quantidade ao estoque.
- Estoque zerado: altera disponibilidade para falso.
- Estoque insuficiente: bloqueia a operacao.

### `trg_produto_auditar_estoque`

**Onde esta**

- Trigger e funcao executada: `ecommerce-api/sql/rotinas_ecommerce.sql`
- Funcao do Trigger: `auditar_alteracao_estoque`
- Tabela observada: `produto`
- Tabela preenchida automaticamente: `auditoria_estoque`

Sempre que o estoque muda, grava produto, estoque anterior, estoque novo e data.

**Como explicar os Triggers**

"Triggers executam automaticamente no banco. Mesmo que outra aplicacao altere pedidos, as regras de estoque e auditoria continuam funcionando."

## CRUD

- Clientes: `ecommerce-api/dao/ClienteDAO.js` e rotas `/clientes`
- Categorias: `ecommerce-api/dao/CategoriaDAO.js` e rotas `/categorias`
- Produtos: `ecommerce-api/dao/ProdutoDAO.js` e rotas `/produtos`
- Pedidos: `ecommerce-api/dao/PedidoDAO.js` e rotas `/pedidos`

O CREATE de pedido usa a Procedure. UPDATE e DELETE de pedido acionam os Triggers para manter o estoque correto.

## Resumo curto para apresentar

- **Procedure:** salva a venda completa e controla COMMIT/ROLLBACK.
- **Functions:** calculam totais e retornam os relatorios usados pela aplicacao.
- **Triggers:** mantem estoque e auditoria automaticamente.
- **CRUD:** continua sendo feito nas telas normais do sistema.
