
function criarCartaoChamado(chamado) {
    const cartao = criarElemento("article", "cartao-chamado");

    const topo = criarElemento("div", "cartao-chamado-topo");

    const numero = criarElemento(
        "span",
        "numero-chamado",
        `#${chamado.id}`
    );

    const prioridade = criarElemento(
        "span",
        `badge-prioridade prioridade-${chamado.prioridade.toLowerCase()}`,
        chamado.prioridade
    );

    topo.append(numero, prioridade);

    const titulo = criarElemento(
        "h2",
        "titulo-chamado",
        `Local: ${chamado.setor}`
    );

    const descricao = criarElemento(
        "p",
        "descricao-chamado",
        chamado.descricao
    );

    const data = criarElemento(
        "span",
        "data-chamado",
        `Criado em: ${formatarData(chamado.dataCriacao)}`
    );

    const autor = criarElemento(
        "span",
        "data-chamado",
        `Aberto por: ${chamado.autorNome || "desconhecido"}`
    );

    const rodape = criarElemento("div", "rodape-chamado");

    if (podeAlterarStatus()) {
        // Só a Direção muda o status.
        const label = criarElemento("label", "rotulo-status", "Status:");

        const seletorStatus = document.createElement("select");
        seletorStatus.className = "select-status";
        seletorStatus.dataset.id = chamado.id;
        seletorStatus.id = `status-${chamado.id}`;

        seletorStatus.setAttribute(
            "aria-label",
            `Status do chamado ${chamado.id}`
        );

        STATUS_DISPONIVEIS.forEach(status => {
            const opcao = document.createElement("option");

            opcao.value = status;
            opcao.textContent = status;
            opcao.selected = status === chamado.status;

            seletorStatus.appendChild(opcao);
        });

        label.htmlFor = seletorStatus.id;

        seletorStatus.addEventListener("change", aoMudarStatus);

        rodape.append(label, seletorStatus);
    } else {
        rodape.append(
            criarElemento("span", "rotulo-status", "Status:"),
            criarElemento("span", "badge-status", chamado.status)
        );
    }

    // Editar: apenas o autor do chamado.
    if (podeEditarChamado(chamado)) {
        const botaoEditar = criarElemento(
            "button",
            "botao-editar",
            "Editar chamado"
        );

        botaoEditar.type = "button";

        botaoEditar.addEventListener("click", () => {
            abrirEdicao(cartao, chamado);
        });

        rodape.append(botaoEditar);
    }

    // Excluir: apenas a Direção.
    if (podeExcluirChamado()) {
        const botaoExcluir = criarElemento(
            "button",
            "botao-excluir",
            "Excluir chamado"
        );

        botaoExcluir.type = "button";

        botaoExcluir.addEventListener("click", () => {
            excluirChamado(chamado.id);
        });

        rodape.append(botaoExcluir);
    }

    cartao.append(topo, titulo, descricao, data, autor, rodape);

    return cartao;
}

// Exclui um chamado pelo ID.
async function excluirChamado(id) {
    const confirmar = confirm(
        `Tem certeza que deseja excluir o chamado #${id}?`
    );

    if (!confirmar) {
        return;
    }

    const sucesso = await removerChamado(id);

    if (!sucesso) {
        alert("Não foi possível excluir o chamado.");
        return;
    }

    await renderizarLista();
}


// ---------------------------------------------------------------
// Funções usadas por criarCartaoChamado e que estavam faltando
// ---------------------------------------------------------------

// Cria um elemento com classe e texto (textContent evita injetar HTML).
function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

// Formata a data salva (ISO) para o padrão brasileiro.
function formatarData(dataIso) {
    const data = new Date(dataIso);

    if (isNaN(data.getTime())) {
        return "data inválida";
    }

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

// Chamada quando o status de um chamado é alterado no seletor.
async function aoMudarStatus(evento) {
    const seletor = evento.target;
    const id = Number(seletor.dataset.id);

    const sucesso = await atualizarStatus(id, seletor.value);

    if (!sucesso) {
        alert("Não foi possível atualizar o status.");
    }

    await renderizarLista();
}

// Desenha a lista de chamados respeitando o filtro escolhido.
async function renderizarLista() {
    const lista = document.getElementById("lista-chamados");
    const mensagemVazia = document.getElementById("mensagem-vazia");
    const filtro = document.getElementById("filtro-status").value;

    let chamados;

    try {
        chamados = await filtrarPorStatus(filtro);
    } catch (erro) {
        console.error(erro);
        lista.replaceChildren();
        mensagemVazia.textContent = "Não foi possível carregar os chamados. Verifique a conexão.";
        mensagemVazia.hidden = false;
        return;
    }

    lista.replaceChildren();

    // O banco já devolve os mais recentes primeiro.
    chamados.forEach(chamado => {
        lista.appendChild(criarCartaoChamado(chamado));
    });

    mensagemVazia.textContent = "Nenhum chamado encontrado para esse filtro.";
    mensagemVazia.hidden = chamados.length > 0;
}

// ---------------------------------------------------------------
// Edição de chamados
// ---------------------------------------------------------------

// Cria um campo de formulário (rótulo + controle).
function criarCampoEdicao(textoRotulo, controle, idControle) {
    const campo = criarElemento("div", "campo");

    const rotulo = criarElemento("label", "", textoRotulo);
    rotulo.htmlFor = idControle;

    controle.id = idControle;

    campo.append(rotulo, controle);

    return campo;
}

// Troca o conteúdo do cartão por um formulário de edição.
function abrirEdicao(cartao, chamado) {
    const formulario = criarElemento("form", "form-edicao");

    const titulo = criarElemento(
        "h2",
        "titulo-chamado",
        `Editar chamado #${chamado.id}`
    );

    const campoSetor = document.createElement("input");
    campoSetor.type = "text";
    campoSetor.value = chamado.setor;
    campoSetor.required = true;

    const campoPrioridade = document.createElement("select");
    campoPrioridade.required = true;

    PRIORIDADES_DISPONIVEIS.forEach(prioridade => {
        const opcao = document.createElement("option");

        opcao.value = prioridade;
        opcao.textContent = prioridade;
        opcao.selected = prioridade === chamado.prioridade;

        campoPrioridade.appendChild(opcao);
    });

    const campoDescricao = document.createElement("textarea");
    campoDescricao.rows = 4;
    campoDescricao.value = chamado.descricao;
    campoDescricao.required = true;

    const mensagemErro = criarElemento("p", "mensagem-status erro");
    mensagemErro.setAttribute("role", "alert");

    const botaoSalvar = criarElemento(
        "button",
        "botao-salvar",
        "Salvar alterações"
    );
    botaoSalvar.type = "submit";

    const botaoCancelar = criarElemento(
        "button",
        "botao-cancelar",
        "Cancelar"
    );
    botaoCancelar.type = "button";

    botaoCancelar.addEventListener("click", renderizarLista);

    const acoes = criarElemento("div", "acoes-edicao");
    acoes.append(botaoSalvar, botaoCancelar);

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const sucesso = await editarChamado(chamado.id, {
            setor: campoSetor.value,
            prioridade: campoPrioridade.value,
            descricao: campoDescricao.value
        });

        if (!sucesso) {
            mensagemErro.textContent = "Não foi possível salvar. Preencha todos os campos.";
            return;
        }

        await renderizarLista();
    });

    formulario.append(
        titulo,
        criarCampoEdicao("Setor ou local do problema", campoSetor, `editar-setor-${chamado.id}`),
        criarCampoEdicao("Prioridade", campoPrioridade, `editar-prioridade-${chamado.id}`),
        criarCampoEdicao("Descrição do problema", campoDescricao, `editar-descricao-${chamado.id}`),
        acoes,
        mensagemErro
    );

    cartao.replaceChildren(formulario);

    campoSetor.focus();
}

// Inicialização da página (os scripts têm defer, então o HTML já existe).
document
    .getElementById("filtro-status")
    .addEventListener("change", renderizarLista);

authPronto.then(usuario => {
    if (usuario) {
        renderizarLista();
    }
});
