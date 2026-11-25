// Autenticação e perfis (Aluno, Professor, Direção) usando o Supabase.
// Carregado no <head> SEM defer, depois de config.js e da biblioteca do
// Supabase. As regras de permissão de verdade ficam no banco
// (banco/schema.sql); o que este arquivo esconde na tela é só conforto.

const PAGINA_LOGIN = "login.html";

const PERFIL_ALUNO = "Aluno";
const PERFIL_PROFESSOR = "Professor";
const PERFIL_DIRECAO = "Direção";

// Perfis que a própria pessoa pode escolher ao criar a conta.
// A Direção é liberada por quem administra o banco.
const PERFIS_CADASTRO = [PERFIL_ALUNO, PERFIL_PROFESSOR];

// O Supabase pede e-mail; o site usa só "nome de usuário". Montamos um
// e-mail fictício a partir do usuário (nenhum e-mail é enviado, desde que
// "Confirm email" esteja DESLIGADO no Supabase).
const DOMINIO_EMAIL = "usuarios.helpdesk.app";

const bancoConfigurado =
    typeof SUPABASE_URL === "string" &&
    !SUPABASE_URL.startsWith("COLE_") &&
    typeof window.supabase !== "undefined";

const supabaseClient = bancoConfigurado
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let usuarioLogado = null;

function emailDoUsuario(nome) {
    return `${nome.trim().toLowerCase()}@${DOMINIO_EMAIL}`;
}

// Retorna { id, nome, perfil } do usuário logado, ou null.
function usuarioAtual() {
    return usuarioLogado;
}

function ehDirecao() {
    return !!usuarioLogado && usuarioLogado.perfil === PERFIL_DIRECAO;
}

// Lê a sessão e o perfil (o perfil vem do banco, não do navegador).
async function carregarUsuario() {
    usuarioLogado = null;

    if (!supabaseClient) {
        return null;
    }

    try {
        const { data: dadosSessao } = await supabaseClient.auth.getSession();
        const sessao = dadosSessao && dadosSessao.session;

        if (!sessao) {
            return null;
        }

        const { data: perfil, error } = await supabaseClient
            .from("profiles")
            .select("username, role")
            .eq("id", sessao.user.id)
            .single();

        if (error || !perfil) {
            return null;
        }

        usuarioLogado = {
            id: sessao.user.id,
            nome: perfil.username,
            perfil: perfil.role
        };
    } catch (erro) {
        console.error("Erro ao carregar o usuário:", erro);
    }

    return usuarioLogado;
}

async function sair() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }

    window.location.replace(PAGINA_LOGIN);
}

// ---------- Cadastro e login ----------
// Retornam { ok: true } ou { ok: false, erro: "mensagem" }.

async function cadastrarUsuario({ nome, senha, perfil }) {
    if (!supabaseClient) {
        return { ok: false, erro: "O banco de dados ainda não foi configurado (JS/config.js)." };
    }

    nome = (nome || "").trim();

    if (!/^[a-z0-9._-]{3,30}$/i.test(nome)) {
        return {
            ok: false,
            erro: "O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou _ (sem espaços ou acentos)."
        };
    }

    if (!senha || senha.length < 6) {
        return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };
    }

    if (!PERFIS_CADASTRO.includes(perfil)) {
        return { ok: false, erro: "Escolha o perfil Aluno ou Professor." };
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: emailDoUsuario(nome),
        password: senha,
        options: { data: { username: nome, role: perfil } }
    });

    if (error) {
        if (/already|registered|exists/i.test(error.message)) {
            return { ok: false, erro: "Esse nome de usuário já está em uso." };
        }

        return { ok: false, erro: "Não foi possível criar a conta: " + error.message };
    }

    if (!data.session) {
        return {
            ok: false,
            erro: "Conta criada, mas o Supabase exige confirmação por e-mail. Desligue 'Confirm email' em Authentication > Providers > Email."
        };
    }

    return { ok: true };
}

async function entrar(nome, senha) {
    if (!supabaseClient) {
        return { ok: false, erro: "O banco de dados ainda não foi configurado (JS/config.js)." };
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailDoUsuario(nome || ""),
        password: senha || ""
    });

    if (error) {
        return { ok: false, erro: "Usuário ou senha incorretos." };
    }

    return { ok: true };
}

// ---------- Proteção das páginas ----------
// A página fica escondida até sabermos se há alguém logado.

document.documentElement.style.visibility = "hidden";

const authPronto = (async function protegerPagina() {
    const naPaginaLogin = window.location.pathname.endsWith(PAGINA_LOGIN);
    const usuario = await carregarUsuario();

    if (!usuario && !naPaginaLogin) {
        window.location.replace(PAGINA_LOGIN);
        return null;
    }

    if (usuario && naPaginaLogin) {
        window.location.replace("index.html");
        return null;
    }

    document.documentElement.style.visibility = "";
    return usuario;
})();

// Mostra "nome · perfil" e o botão Sair no topo das páginas.
document.addEventListener("DOMContentLoaded", async function () {
    const usuario = await authPronto;
    const area = document.querySelector(".topo-direita");

    if (!usuario || !area) {
        return;
    }

    const info = document.createElement("span");
    info.className = "usuario-logado";
    info.textContent = `${usuario.nome} · ${usuario.perfil}`;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-sair";
    botao.textContent = "Sair";
    botao.addEventListener("click", sair);

    area.prepend(info, botao);
});
