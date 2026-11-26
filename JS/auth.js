// Autenticação e perfis (Aluno, Professor, Direção) usando o Supabase.
// Carregado no <head> SEM defer, depois de config.js e da biblioteca do
// Supabase. As regras de permissão de verdade ficam no banco
// (banco/schema.sql); o que este arquivo esconde na tela é só conforto.

const PAGINA_LOGIN = "login.html";

const PERFIL_ALUNO = "Aluno";
const PERFIL_PROFESSOR = "Professor";
const PERFIL_DIRECAO = "Direção";

// Perfis que a pessoa pode escolher ao criar a conta. A Direção exige um
// código, conferido pelo banco (banco/schema.sql).
const PERFIS_CADASTRO = [PERFIL_ALUNO, PERFIL_PROFESSOR, PERFIL_DIRECAO];

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

// Deixa o nome digitado (com acentos e espaços) pronto para virar a parte
// local de um e-mail: remove acentos, troca espaços por "-" e mantém só
// letras, números, ponto, hífen e _. O Supabase exige e-mail, mas o campo
// visível continua sendo o nome como a pessoa digitou.
function gerarApelido(nome) {
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // remove os acentos
        .trim()
        .replace(/\s+/g, "-")              // espaços viram hífen
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");     // remove qualquer outro símbolo
}

// Requisitos da senha. Estes testes seguem as regras de senha do Supabase
// (Authentication > Sign In / Providers > Password): a proteção de verdade
// é a configuração do Supabase; aqui só avisamos a pessoa antes de enviar.
const REQUISITOS_SENHA = [
    { id: "tamanho",   texto: "Pelo menos 8 caracteres", teste: s => s.length >= 8 },
    { id: "minuscula", texto: "Uma letra minúscula (a-z)", teste: s => /[a-z]/.test(s) },
    { id: "maiuscula", texto: "Uma letra maiúscula (A-Z)", teste: s => /[A-Z]/.test(s) },
    { id: "numero",    texto: "Um número (0-9)", teste: s => /[0-9]/.test(s) },
    { id: "especial",  texto: "Um caractere especial (ex.: ! @ # $ % & *)", teste: s => /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(s) }
];

function senhaForte(senha) {
    return REQUISITOS_SENHA.every(requisito => requisito.teste(senha || ""));
}

function emailDoUsuario(nome) {
    return `${gerarApelido(nome)}@${DOMINIO_EMAIL}`;
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

async function cadastrarUsuario({ nome, senha, perfil, codigo }) {
    if (!supabaseClient) {
        return { ok: false, erro: "O banco de dados ainda não foi configurado (JS/config.js)." };
    }

    // Permite letras com acento e espaços entre palavras (ex.: "José Conceição"),
    // além de ponto, hífen, apóstrofo e _. Vários espaços seguidos viram um só.
    nome = (nome || "").trim().replace(/\s+/g, " ");

    if (!/^[\p{L}0-9 ._'-]{3,30}$/u.test(nome)) {
        return {
            ok: false,
            erro: "O nome deve ter de 3 a 30 caracteres: letras (com ou sem acento), números, espaço, ponto, hífen, apóstrofo ou _."
        };
    }

    if (gerarApelido(nome).length < 3) {
        return {
            ok: false,
            erro: "O nome precisa ter pelo menos 3 letras ou números."
        };
    }

    if (!senhaForte(senha)) {
        return {
            ok: false,
            erro: "A senha é fraca. Use 8 ou mais caracteres, com letra maiúscula, minúscula, número e caractere especial."
        };
    }

    if (!PERFIS_CADASTRO.includes(perfil)) {
        return { ok: false, erro: "Escolha um perfil." };
    }

    if (perfil === PERFIL_DIRECAO && !(codigo || "").trim()) {
        return { ok: false, erro: "Informe o código da Direção." };
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: emailDoUsuario(nome),
        password: senha,
        options: {
            data: perfil === PERFIL_DIRECAO
                ? { username: nome, role: perfil, codigo: codigo.trim() }
                : { username: nome, role: perfil }
        }
    });

    if (error) {
        if (/already|registered|exists/i.test(error.message)) {
            return { ok: false, erro: "Esse nome de usuário já está em uso." };
        }

        // Senha fraca recusada pelo próprio Supabase.
        if (error.code === "weak_password" || /password.*(weak|should|least|contain)/i.test(error.message)) {
            return {
                ok: false,
                erro: "O Supabase recusou a senha por ser fraca. Use 8 ou mais caracteres, com maiúscula, minúscula, número e caractere especial."
            };
        }

        // Código errado: o banco recusa a criação da conta.
        if (perfil === PERFIL_DIRECAO && /database error|código/i.test(error.message)) {
            return { ok: false, erro: "Código da Direção incorreto." };
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
