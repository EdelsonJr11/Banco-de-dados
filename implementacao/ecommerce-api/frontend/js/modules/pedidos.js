import { query } from "../dom.js";
import { runWithUiError } from "./helpers.js";

export function createPedidosModule({ elements, requestJson, message, formatters, onChanged = async () => {} }) {
    const clearForm = () => {
        query("#id_pedido").value = "";
        query("#data_previsao_entrega_pedido").value = "";
        query("#id_cliente_pedido").value = "";
        elements.selectProdutoPedido.value = "";
        query("#quantidade_item_pedido").value = "";
        query("#desconto_item_pedido").value = "";
    };

    const render = (pedidos) => {
        elements.tabelaPedidosCrud.innerHTML = pedidos.map((p) => `
            <tr>
                <td>${p.id_pedido}</td>
                <td>${p.id_cliente}</td>
                <td>${p.cliente_nome || "-"}</td>
                <td>${p.itens_resumo || "-"}</td>
                <td>${p.quantidade_total ?? 0}</td>
                <td>${formatters.formatDateTime(p.data_criacao)}</td>
                <td>${formatters.formatDate(p.data_previsao_entrega)}</td>
                <td>${formatters.formatMoney(p.total_pedido)}</td>
                <td>
                    <button type="button" data-acao="editar" data-id="${p.id_pedido}">Editar</button>
                    <button type="button" data-acao="excluir" data-id="${p.id_pedido}">Excluir</button>
                </td>
            </tr>
        `).join("");
    };

    const load = async () => {
        const pedidos = await requestJson("/pedidos");
        render(pedidos);
    };

    const salvar = async (event) => {
        event.preventDefault();

        await runWithUiError(message, async () => {
            const selectedOption = elements.selectProdutoPedido.selectedOptions?.[0];
            if (selectedOption && selectedOption.dataset.disponivel === "false") {
                throw new Error("Produto indisponivel nao pode ser pedido");
            }

            const id = query("#id_pedido").value;
            const item = {
                id_produto: formatters.toNumberOrNull(elements.selectProdutoPedido.value),
                quantidade: formatters.toNumberOrNull(query("#quantidade_item_pedido").value),
                desconto: formatters.toNumberOrNull(query("#desconto_item_pedido").value) || 0
            };

            if (!item.id_produto || !item.quantidade || item.quantidade <= 0) {
                throw new Error("Pedido precisa de um item com produto e quantidade");
            }

            const pedido = {
                data_previsao_entrega: query("#data_previsao_entrega_pedido").value || null,
                id_cliente: formatters.toNumberOrNull(query("#id_cliente_pedido").value),
                itens: [item]
            };

            if (!pedido.id_cliente) {
                throw new Error("Informe o id do cliente");
            }

            if (id) {
                await requestJson(`/pedidos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(pedido)
                });
            } else {
                await requestJson("/pedidos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(pedido)
                });
            }

            clearForm();
            await Promise.all([load(), onChanged()]);
        });
    };

    const editar = async (id) => {
        const pedido = await requestJson(`/pedidos/${id}`);
        const item = Array.isArray(pedido.itens) && pedido.itens.length > 0 ? pedido.itens[0] : null;

        query("#id_pedido").value = pedido.id_pedido;
        query("#data_previsao_entrega_pedido").value = formatters.toInputDate(pedido.data_previsao_entrega);
        query("#id_cliente_pedido").value = pedido.id_cliente ?? "";
        elements.selectProdutoPedido.value = item ? item.id_produto : "";
        query("#quantidade_item_pedido").value = item ? item.quantidade : "";
        query("#desconto_item_pedido").value = item ? item.desconto : "";
    };

    const excluir = async (id) => {
        await requestJson(`/pedidos/${id}`, { method: "DELETE" });
    };

    const bind = () => {
        elements.formPedido.addEventListener("submit", salvar);

        elements.btnAtualizarPedidos.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });

        elements.btnLimparPedido.addEventListener("click", clearForm);

        elements.tabelaPedidosCrud.addEventListener("click", async (event) => {
            const button = event.target.closest("button[data-acao]");
            if (!button) return;

            await runWithUiError(message, async () => {
                const id = Number(button.dataset.id);
                if (button.dataset.acao === "editar") await editar(id);
                if (button.dataset.acao === "excluir") {
                    await excluir(id);
                    await Promise.all([load(), onChanged()]);
                }
            });
        });
    };

    return { load, bind, clearForm };
}
