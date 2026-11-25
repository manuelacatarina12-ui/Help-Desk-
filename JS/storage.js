// Acesso aos chamados no banco (Supabase).
// Quem pode ver/criar/editar/excluir é decidido PELO BANCO (banco/schema.sql).
// As funções "pode..." abaixo só escondem botões; se alguém burlar a tela,
// o banco recusa.

const STATUS_DISPONIVEIS = [
    "Aberto",
    "Em andamento",
    "Resolvido"
];

const PRIORIDADES_DISPONIVEIS = [
    "Baixa",
    "Média",
    "Alta"
];

// ---------- Ajudas de tela (não são a segurança) ----------

function podeEditarChamado(chamado) {
    const usuario = usuarioAtual();
    return !!usuario && chamado.autorId === usuario.id;
}

function podeAlterarStatus() {
    return ehDirecao();
}

function podeExcluirChamado() {
    return ehDirecao();
}

// ---------- Banco ----------

// Converte uma linha do banco para o formato usado pela tela.
function converterChamado(linha) {
    return {
        id: linha.id,
        setor: linha.setor,
        prioridade: linha.prioridade,
        descricao: linha.descricao,
        status: linha.status,
        dataCriacao: linha.created_at,
        autorId: linha.autor_id,
        autorNome: linha.autor ? linha.autor.username : null
    };
}

const COLUNAS_CHAMADO =
    "id, setor, prioridade, descricao, status, created_at, autor_id, autor:profiles(username)";

// Lista os chamados que o usuário pode ver (o banco já filtra:
// Aluno/Professor recebem só os seus; a Direção recebe todos).
async function filtrarPorStatus(status) {
    let consulta = supabaseClient
        .from("chamados")
        .select(COLUNAS_CHAMADO)
        .order("id", { ascending: false });

    if (status && status !== "Todos") {
        consulta = consulta.eq("status", status);
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return data.map(converterChamado);
}

// Registra um novo chamado em nome do usuário logado.
async function salvarChamado(dadosChamado) {
    const { data, error } = await supabaseClient
        .from("chamados")
        .insert({
            setor: dadosChamado.setor,
            prioridade: dadosChamado.prioridade,
            descricao: dadosChamado.descricao
        })
        .select(COLUNAS_CHAMADO)
        .single();

    if (error) {
        throw error;
    }

    return converterChamado(data);
}

// Atualiza o status (só a Direção consegue).
async function atualizarStatus(id, novoStatus) {
    if (!STATUS_DISPONIVEIS.includes(novoStatus)) {
        return false;
    }

    const { data, error } = await supabaseClient
        .from("chamados")
        .update({ status: novoStatus })
        .eq("id", id)
        .select("id");

    if (error) {
        console.warn(error.message);
        return false;
    }

    return data.length === 1;
}

// Edita setor, prioridade e descrição (só o autor consegue).
async function editarChamado(id, novosDados) {
    const setor = (novosDados.setor || "").trim();
    const descricao = (novosDados.descricao || "").trim();
    const prioridade = novosDados.prioridade;

    if (
        setor === "" ||
        descricao === "" ||
        !PRIORIDADES_DISPONIVEIS.includes(prioridade)
    ) {
        return false;
    }

    const { data, error } = await supabaseClient
        .from("chamados")
        .update({ setor, prioridade, descricao })
        .eq("id", id)
        .select("id");

    if (error) {
        console.warn(error.message);
        return false;
    }

    return data.length === 1;
}

// Remove um chamado (só a Direção consegue).
async function removerChamado(id) {
    const { data, error } = await supabaseClient
        .from("chamados")
        .delete()
        .eq("id", id)
        .select("id");

    if (error) {
        console.warn(error.message);
        return false;
    }

    return data.length === 1;
}
