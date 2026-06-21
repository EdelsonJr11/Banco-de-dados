import { elements } from "./js/dom.js?v=integrado-1";
import { requestJson } from "./js/api.js?v=unificado-1";
import { createMessageService } from "./js/message.js";
import { createNavigation } from "./js/navigation.js?v=integrado-1";
import * as formatters from "./js/utils/formatters.js";
import { createClientesModule } from "./js/modules/clientes.js?v=integrado-1";
import { createCategoriasModule } from "./js/modules/categorias.js";
import { createProdutosModule } from "./js/modules/produtos.js?v=disponibilidade-auto-1";
import { createPedidosModule } from "./js/modules/pedidos.js?v=integrado-1";
import { createRelatoriosModule } from "./js/modules/relatorios.js?v=integrado-1";

const message = createMessageService(elements.mensagem);
const sharedDeps = { elements, requestJson, message, formatters };

let produtosModule;
let relatoriosModule;

const clientesModule = createClientesModule(sharedDeps);
const categoriasModule = createCategoriasModule({
    ...sharedDeps,
    onChanged: async () => {
        if (produtosModule) await produtosModule.load();
    }
});

produtosModule = createProdutosModule({
    ...sharedDeps,
    onChanged: async () => {
        if (relatoriosModule) await relatoriosModule.load();
    }
});

relatoriosModule = createRelatoriosModule(sharedDeps);

const pedidosModule = createPedidosModule({
    ...sharedDeps,
    onChanged: async () => {
        await Promise.all([
            produtosModule.load(),
            relatoriosModule.load()
        ]);
    }
});

const navigation = createNavigation(elements);

async function init() {
    navigation.bind();
    navigation.setActiveView("relatorios");

    clientesModule.bind();
    categoriasModule.bind();
    produtosModule.bind();
    pedidosModule.bind();
    relatoriosModule.bind();

    clientesModule.clearForm();
    categoriasModule.clearForm();
    produtosModule.clearForm();
    pedidosModule.clearForm();

    message.clear();
    try {
        await Promise.all([
            clientesModule.load(),
            categoriasModule.load(),
            produtosModule.load(),
            pedidosModule.load(),
            relatoriosModule.load()
        ]);
    } catch (error) {
        message.error(error);
    }
}

init();
