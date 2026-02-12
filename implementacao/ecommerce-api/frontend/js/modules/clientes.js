import { query } from "../dom.js";
import { runWithUiError } from "./helpers.js";

export function createClientesModule({ elements, requestJson, message }) {
    const camposPf = ["#nome", "#cpf", "#data_nascimento", "#genero"];
    const camposPj = ["#cnpj", "#razao_social"];

    const toggleTipoFields = () => {
        const tipo = elements.selectTipoCliente.value;
        const isPf = tipo === "PF";

        elements.clientePfFields.classList.toggle("is-hidden", !isPf);
        elements.clientePjFields.classList.toggle("is-hidden", isPf);

        camposPf.forEach((selector) => {
            query(selector).required = isPf;
            if (!isPf) query(selector).value = "";
        });

        camposPj.forEach((selector) => {
            query(selector).required = !isPf;
            if (isPf) query(selector).value = "";
        });
    };

    const clearForm = () => {
        query("#id_cliente").value = "";
        elements.selectTipoCliente.value = "PF";
        query("#email").value = "";
        query("#telefone_numero").value = "";
        query("#nome").value = "";
        query("#cpf").value = "";
        query("#data_nascimento").value = "";
        query("#genero").value = "";
        query("#cnpj").value = "";
        query("#razao_social").value = "";
        query("#inscricao_estadual").value = "";
        query("#rua").value = "";
        query("#numero").value = "";
        query("#bairro").value = "";
        query("#cidade").value = "";
        query("#cep").value = "";
        toggleTipoFields();
    };

    const render = (clientes) => {
        elements.tabelaClientes.innerHTML = clientes.map((c) => `
            <tr>
                <td>${c.id_cliente}</td>
                <td>${c.tipo ?? "-"}</td>
                <td>${c.nome_exibicao ?? "-"}</td>
                <td>${c.email}</td>
                <td>${c.telefone_numero ?? "-"}</td>
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

    const montarPayload = () => ({
        tipo: elements.selectTipoCliente.value,
        email: query("#email").value.trim(),
        telefone_numero: query("#telefone_numero").value.trim(),
        nome: query("#nome").value.trim(),
        cpf: query("#cpf").value.trim(),
        data_nascimento: query("#data_nascimento").value,
        genero: query("#genero").value,
        cnpj: query("#cnpj").value.trim(),
        razao_social: query("#razao_social").value.trim(),
        inscricao_estadual: query("#inscricao_estadual").value.trim(),
        rua: query("#rua").value.trim(),
        numero: query("#numero").value.trim(),
        bairro: query("#bairro").value.trim(),
        cidade: query("#cidade").value.trim(),
        cep: query("#cep").value.trim()
    });

    const salvar = async (event) => {
        event.preventDefault();

        await runWithUiError(message, async () => {
            const id = query("#id_cliente").value;
            const cliente = montarPayload();

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
        const tipo = cliente.tipo === "PJ" ? "PJ" : "PF";

        query("#id_cliente").value = cliente.id_cliente;
        elements.selectTipoCliente.value = tipo;
        toggleTipoFields();

        query("#email").value = cliente.email ?? "";
        query("#telefone_numero").value = cliente.telefone_numero ?? "";
        query("#nome").value = cliente.nome ?? "";
        query("#cpf").value = cliente.cpf ?? "";
        query("#data_nascimento").value = cliente.data_nascimento
            ? String(cliente.data_nascimento).slice(0, 10)
            : "";
        query("#genero").value = cliente.genero ?? "";
        query("#cnpj").value = cliente.cnpj ?? "";
        query("#razao_social").value = cliente.razao_social ?? "";
        query("#inscricao_estadual").value = cliente.inscricao_estadual ?? "";
        query("#rua").value = cliente.rua ?? "";
        query("#numero").value = cliente.numero ?? "";
        query("#bairro").value = cliente.bairro ?? "";
        query("#cidade").value = cliente.cidade ?? "";
        query("#cep").value = cliente.cep ?? "";
    };

    const excluir = async (id) => {
        await requestJson(`/clientes/${id}`, { method: "DELETE" });
    };

    const bind = () => {
        elements.formCliente.addEventListener("submit", salvar);

        elements.selectTipoCliente.addEventListener("change", () => {
            toggleTipoFields();
        });

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
