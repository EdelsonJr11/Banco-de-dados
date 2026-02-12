import { query } from "../dom.js";
import { runWithUiError } from "./helpers.js";

export function createClientesModule({ elements, requestJson, message }) {
    const clearForm = () => {
        query("#id_cliente").value = "";
        query("#nome").value = "";
        query("#email").value = "";
        query("#rua").value = "";
        query("#numero").value = "";
        query("#bairro").value = "";
        query("#cidade").value = "";
        query("#cep").value = "";
    };

    const render = (clientes) => {
        elements.tabelaClientes.innerHTML = clientes.map((c) => `
            <tr>
                <td>${c.id_cliente}</td>
                <td>${c.nome}</td>
                <td>${c.email}</td>
                <td>
                    <button type="button" data-acao="editar" data-id="${c.id_cliente}">Editar</button>
                    <button type="button" data-acao="excluir" data-id="${c.id_cliente}">Excluir</button>
                </td>
            </tr>
        `).join("");
    };

    const load = async () => {
        const clientes = await requestJson("/clientes");
        render(clientes);
    };

    const salvar = async (event) => {
        event.preventDefault();

        await runWithUiError(message, async () => {
            const id = query("#id_cliente").value;
            const cliente = {
                nome: query("#nome").value,
                email: query("#email").value,
                rua: query("#rua").value,
                numero: query("#numero").value,
                bairro: query("#bairro").value,
                cidade: query("#cidade").value,
                cep: query("#cep").value
            };

            if (id) {
                await requestJson(`/clientes/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cliente)
                });
            } else {
                await requestJson("/clientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cliente)
                });
            }

            clearForm();
            await load();
        });
    };

    const editar = async (id) => {
        const cliente = await requestJson(`/clientes/${id}`);
        query("#id_cliente").value = cliente.id_cliente;
        query("#nome").value = cliente.nome;
        query("#email").value = cliente.email;
        query("#rua").value = cliente.rua;
        query("#numero").value = cliente.numero;
        query("#bairro").value = cliente.bairro;
        query("#cidade").value = cliente.cidade;
        query("#cep").value = cliente.cep;
    };

    const excluir = async (id) => {
        await requestJson(`/clientes/${id}`, { method: "DELETE" });
    };

    const bind = () => {
        elements.formCliente.addEventListener("submit", salvar);

        elements.btnAtualizarClientes.addEventListener("click", async () => {
            await runWithUiError(message, load);
        });

        elements.btnLimparCliente.addEventListener("click", clearForm);

        elements.tabelaClientes.addEventListener("click", async (event) => {
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
