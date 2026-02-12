import { runWithUiError } from "./helpers.js";

export function createRelatoriosModule({ elements, requestJson, message, formatters }) {
    const renderPedidosJoin = (pedidos) => {
        elements.tabelaPedidosJoin.innerHTML = pedidos.map((p) => `
            <tr>
                <td>${p.id_pedido}</td>
                <td>${p.id_cliente}</td>
                <td>${p.cliente_nome}</td>
                <td>${p.cliente_tipo ?? "-"}</td>
                <td>${p.cliente_email}</td>
                <td>${formatters.formatDateTime(p.data_criacao)}</td>
                <td>${formatters.formatMoney(p.total_pedido)}</td>
            </tr>
        `).join("");
    };

    const renderRelatorio = (relatorio) => {
        elements.tabelaRelatorio.innerHTML = relatorio.map((r) => `
            <tr>
                <td>${r.id_cliente}</td>
                <td>${r.nome}</td>
                <td>${r.tipo ?? "-"}</td>
                <td>${r.total_pedidos}</td>
                <td>${formatters.formatMoney(r.total_vendas)}</td>
            </tr>
        `).join("");
    };

    const load = async () => {
        const [pedidosJoin, relatorio] = await Promise.all([
            requestJson("/pedidos-com-cliente"),
            requestJson("/relatorio-vendas")
        ]);

        renderPedidosJoin(pedidosJoin);
        renderRelatorio(relatorio);
    };

    const bind = () => {
        elements.btnAtualizarRelatorios.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });
    };

    return { load, bind };
}
