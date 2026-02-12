const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

export const elements = {
    mensagem: $("#mensagem"),
    navLinks: $$(".nav-link"),
    views: $$(".view"),

    formCliente: $("#formCliente"),
    formCategoria: $("#formCategoria"),
    formProduto: $("#formProduto"),
    formPedido: $("#formPedido"),

    tabelaClientes: $("#tabelaClientes"),
    tabelaCategorias: $("#tabelaCategorias"),
    tabelaProdutos: $("#tabelaProdutos"),
    tabelaPedidosCrud: $("#tabelaPedidosCrud"),
    tabelaPedidosJoin: $("#tabelaPedidosJoin"),
    tabelaRelatorio: $("#tabelaRelatorio"),

    btnAtualizarRelatorios: $("#btnAtualizarRelatorios"),
    btnAtualizarClientes: $("#btnAtualizarClientes"),
    btnAtualizarCategorias: $("#btnAtualizarCategorias"),
    btnAtualizarProdutos: $("#btnAtualizarProdutos"),
    btnAtualizarPedidos: $("#btnAtualizarPedidos"),
    btnAtualizarCategoriasProduto: $("#btnAtualizarCategoriasProduto"),

    btnLimparCliente: $("#btnLimparCliente"),
    btnLimparCategoria: $("#btnLimparCategoria"),
    btnLimparProduto: $("#btnLimparProduto"),
    btnLimparPedido: $("#btnLimparPedido"),

    selectCategoriaProduto: $("#id_categoria_produto"),
    selectProdutoPedido: $("#id_produto_pedido")
};

export const query = $;
