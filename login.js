const formEntrar = document.getElementById("form-entrar");
const formCadastrar = document.getElementById("form-cadastrar");
const abaEntrar = document.getElementById("aba-entrar");
const abaCadastrar = document.getElementById("aba-cadastrar");
const seletorPerfil = document.getElementById("cad-perfil");
const campoCodigo = document.getElementById("campo-codigo");

function mostrarAba(entrar) {
    formEntrar.hidden = !entrar;
    formCadastrar.hidden = entrar;

    abaEntrar.classList.toggle("ativa", entrar);
    abaCadastrar.classList.toggle("ativa", !entrar);
    abaEntrar.setAttribute("aria-selected", String(entrar));
    abaCadastrar.setAttribute("aria-selected", String(!entrar));
}

function mostrarErro(idElemento, texto) {
    const elemento = document.getElementById(idElemento);
    elemento.textContent = texto;
    elemento.className = "mensagem-status erro";
}

abaEntrar.addEventListener("click", () => mostrarAba(true));
abaCadastrar.addEventListener("click", () => mostrarAba(false));

// O campo do código só aparece quando o perfil escolhido é Direção.
seletorPerfil.addEventListener("change", () => {
    campoCodigo.hidden = seletorPerfil.value !== PERFIL_DIRECAO;
});

// Lista de requisitos da senha: cada item é marcado conforme a pessoa digita.
const campoSenhaCadastro = document.getElementById("cad-senha");
const listaRequisitos = document.getElementById("requisitos-senha");

REQUISITOS_SENHA.forEach(requisito => {
    const item = document.createElement("li");
    item.dataset.id = requisito.id;
    item.textContent = requisito.texto;
    listaRequisitos.appendChild(item);
});

function atualizarRequisitos() {
    REQUISITOS_SENHA.forEach(requisito => {
        const item = listaRequisitos.querySelector(`[data-id="${requisito.id}"]`);
        item.classList.toggle("ok", requisito.teste(campoSenhaCadastro.value));
    });
}

campoSenhaCadastro.addEventListener("input", atualizarRequisitos);
atualizarRequisitos();

formEntrar.addEventListener("submit", async evento => {
    evento.preventDefault();

    const resultado = await entrar(
        document.getElementById("entrar-usuario").value,
        document.getElementById("entrar-senha").value
    );

    if (!resultado.ok) {
        mostrarErro("mensagem-entrar", resultado.erro);
        return;
    }

    window.location.replace("index.html");
});

formCadastrar.addEventListener("submit", async evento => {
    evento.preventDefault();

    const resultado = await cadastrarUsuario({
        nome: document.getElementById("cad-usuario").value,
        senha: document.getElementById("cad-senha").value,
        perfil: seletorPerfil.value,
        codigo: document.getElementById("cad-codigo").value
    });

    if (!resultado.ok) {
        mostrarErro("mensagem-cadastrar", resultado.erro);
        return;
    }

    window.location.replace("index.html");
});
