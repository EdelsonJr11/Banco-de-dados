import { query } from "../dom.js";
import { runWithUiError } from "./helpers.js";

export function createProdutosModule({ elements, requestJson, message, formatters }) {
    const fillProdutoSelect = (produtos) => {
        const selected = elements.selectProdutoPedido.value;
        const options = [
            '<option value="">Selecione um produto</option>',
            ...produtos.map((p) => `<option value="${p.id_produto}">${p.id_produto} - ${p.nome}</option>`)
        ];

        elements.selectProdutoPedido.innerHTML = options.join("");
        if (selected) elements.selectProdutoPedido.value = selected;
    };

    const clearForm = () => {
        query("#id_produto").value = "";
        query("#nome_produto").value = "";
        query("#descricao_produto").value = "";
        query("#peso_produto").value = "";
        query("#preco_base_produto").value = "";
        query("#disponibilidade_produto").checked = true;
        elements.selectCategoriaProduto.value = "";
    };

    const render = (produtos) => {
        elements.tabelaProdutos.innerHTML = produtos.map((p) => `
            <tr>
                <td>${p.id_produto}</td>
                <td>${p.nome}</td>
                <td>${p.nome_categoria || "-"}</td>
                <td>${formatters.formatMoney(p.preco_base)}</td>
                <td>${p.disponibilidade ? "Sim" : "Nao"}</td>
                <td>
                    <button type="button" data-acao="editar" data-id="${p.id_produto}">Editar</button>
                    <button type="button" data-acao="excluir" data-id="${p.id_produto}">Excluir</button>
                </td>
            </tr>
        `).join("");
    };

    const load = async () => {
        const produtos = await requestJson("/produtos");
        render(produtos);
        fillProdutoSelect(produtos);
    };

    const salvar = async (event) => {
        event.preventDefault();

        await runWithUiError(message, async () => {
            const id = query("#id_produto").value;
            const produto = {
                nome: query("#nome_produto").value,
                descricao: query("#descricao_produto").value || null,
                peso: formatters.toNumberOrNull(query("#peso_produto").value),
                preco_base: formatters.toNumberOrNull(query("#preco_base_produto").value),
                disponibilidade: query("#disponibilidade_produto").checked,
                id_categoria: formatters.toNumberOrNull(elements.selectCategoriaProduto.value)
            };

            if (!produto.id_categoria) {
                throw new Error("Selecione uma categoria para o produto");
            }

            if (id) {
                await requestJson(`/produtos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(produto)
                });
            } else {
                await requestJson("/produtos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(produto)
                });
            }

            clearForm();
            await load();
        });
    };

    const editar = async (id) => {
        const produto = await requestJson(`/produtos/${id}`);
        query("#id_produto").value = produto.id_produto;
        query("#nome_produto").value = produto.nome || "";
        query("#descricao_produto").value = produto.descricao || "";
        query("#peso_produto").value = produto.peso ?? "";
        query("#preco_base_produto").value = produto.preco_base ?? "";
        query("#disponibilidade_produto").checked = Boolean(produto.disponibilidade);
        elements.selectCategoriaProduto.value = produto.id_categoria ?? "";
    };

    const excluir = async (id) => {
        await requestJson(`/produtos/${id}`, { method: "DELETE" });
    };

    const bind = () => {
        elements.formProduto.addEventListener("submit", salvar);

        elements.btnAtualizarProdutos.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });

        elements.btnLimparProduto.addEventListener("click", clearForm);

        elements.tabelaProdutos.addEventListener("click", async (event) => {
            const button = event.target.closest("button[data-acao]");
            if (!button) return;

            await runWithUiError(message, async () => {
                const id = Number(button.dataset.id);
                if (button.dataset.acao === "editar") await editar(id);
                if (button.dataset.acao === "excluir") {
                    await excluir(id);
                    await load();
                }
            });
        });
    };

    return { load, bind, clearForm };
}
