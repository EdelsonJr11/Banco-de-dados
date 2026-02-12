import { query } from "../dom.js";
import { runWithUiError } from "./helpers.js";

export function createCategoriasModule({ elements, requestJson, message, onChanged = async () => {} }) {
    const fillCategoriaSelect = (categorias) => {
        const selected = elements.selectCategoriaProduto.value;
        const options = [
            '<option value="">Selecione uma categoria</option>',
            ...categorias.map((c) => `<option value="${c.id_categoria}">${c.id_categoria} - ${c.nome_categoria}</option>`)
        ];

        elements.selectCategoriaProduto.innerHTML = options.join("");
        if (selected) elements.selectCategoriaProduto.value = selected;
    };

    const clearForm = () => {
        query("#id_categoria").value = "";
        query("#nome_categoria").value = "";
        query("#descricao_categoria").value = "";
    };

    const render = (categorias) => {
        elements.tabelaCategorias.innerHTML = categorias.map((c) => `
            <tr>
                <td>${c.id_categoria}</td>
                <td>${c.nome_categoria}</td>
                <td>${c.descricao || "-"}</td>
                <td>
                    <button type="button" data-acao="editar" data-id="${c.id_categoria}">Editar</button>
                    <button type="button" data-acao="excluir" data-id="${c.id_categoria}">Excluir</button>
                </td>
            </tr>
        `).join("");
    };

    const load = async () => {
        const categorias = await requestJson("/categorias");
        render(categorias);
        fillCategoriaSelect(categorias);
    };

    const salvar = async (event) => {
        event.preventDefault();

        await runWithUiError(message, async () => {
            const id = query("#id_categoria").value;
            const categoria = {
                nome_categoria: query("#nome_categoria").value,
                descricao: query("#descricao_categoria").value || null
            };

            if (id) {
                await requestJson(`/categorias/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(categoria)
                });
            } else {
                await requestJson("/categorias", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(categoria)
                });
            }

            clearForm();
            await Promise.all([load(), onChanged()]);
        });
    };

    const editar = async (id) => {
        const categoria = await requestJson(`/categorias/${id}`);
        query("#id_categoria").value = categoria.id_categoria;
        query("#nome_categoria").value = categoria.nome_categoria;
        query("#descricao_categoria").value = categoria.descricao || "";
    };

    const excluir = async (id) => {
        await requestJson(`/categorias/${id}`, { method: "DELETE" });
    };

    const bind = () => {
        elements.formCategoria.addEventListener("submit", salvar);

        elements.btnAtualizarCategorias.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });

        elements.btnAtualizarCategoriasProduto.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });

        elements.btnLimparCategoria.addEventListener("click", clearForm);

        elements.tabelaCategorias.addEventListener("click", async (event) => {
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
