# Guia simples para demonstrar o e-commerce

## Ideia principal

O sistema nao possui uma tela artificial apenas para mostrar Banco de Dados II. Os recursos pedidos na atividade fazem parte das operacoes normais:

- Ao salvar um pedido, a aplicacao chama uma **Procedure transacional**.
- Ao listar pedidos e relatorios, a aplicacao consulta **Functions**.
- Ao inserir, alterar ou excluir itens de pedidos, **Triggers** controlam o estoque.
- Toda alteracao de estoque gera uma auditoria automatica por outro **Trigger**.

## Como iniciar

No terminal:

```bash
cd ecommerce-api
npm start
```

Abra `http://localhost:3000`.

## Roteiro de apresentacao

### 1. Mostrar o CRUD

Mostre rapidamente as telas Clientes, Categorias e Produtos. Cadastre ou altere um registro para explicar CREATE, READ, UPDATE e DELETE.

Na tela Produtos, a disponibilidade nao e escolhida manualmente: estoque maior que zero significa disponivel e estoque zero significa indisponivel.

### 2. Mostrar a Procedure integrada

1. Abra Produtos e anote o estoque de um produto.
2. Abra Pedidos.
3. Selecione cliente, produto e quantidade.
4. Clique em **Salvar Pedido**.

Explique:

"O botao normal de salvar pedido chama a Procedure `sp_realizar_venda`. Ela valida cliente e produtos, calcula valores, cria o pedido, cria os itens, atualiza a previsao e executa COMMIT. Se faltar estoque, executa ROLLBACK e nao deixa pedido incompleto."

### 3. Mostrar os Triggers

Volte para Produtos e mostre que o estoque baixou automaticamente.

Explique:

"A Procedure nao faz o UPDATE direto do estoque. Ao inserir o item, o Trigger `trg_item_pedido_controlar_estoque` executa automaticamente. Outro Trigger grava a auditoria da mudanca."

Exclua o pedido e mostre que o estoque volta automaticamente.

### 4. Mostrar as Functions

Abra Relatorios.

Explique:

- Pedidos e seus totais sao retornados pela Function `fn_listar_pedidos`.
- Vendas por cliente sao retornadas pela Function `fn_relatorio_vendas_por_cliente`.
- Estoque e quantidade de movimentacoes sao retornados pela Function `fn_relatorio_estoque`.
- Os totais usam `fn_calcular_total_pedido`, que usa `fn_calcular_total_item`.

### 5. Demonstrar ROLLBACK

Tente criar um pedido com quantidade maior que o estoque.

Explique:

"A Procedure detecta estoque insuficiente, executa ROLLBACK e gera erro. Nenhum pedido parcial e salvo."

## Onde encontrar cada requisito

Consulte `MAPA_REQUISITOS_BD2.md`. Ele mostra exatamente os arquivos, objetos SQL, metodos do DAO, rotas e telas usados por cada requisito.
