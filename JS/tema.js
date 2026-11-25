// Alternância entre modo claro e escuro.
// Este arquivo é carregado no <head> (sem defer) para aplicar o tema
// antes da página aparecer e evitar um "piscar" de cores.

(function () {
    const CHAVE_TEMA = "tema";

    function lerTemaSalvo() {
        try {
            const salvo = localStorage.getItem(CHAVE_TEMA);
            return salvo === "claro" || salvo === "escuro" ? salvo : null;
        } catch (erro) {
            return null;
        }
    }

    function salvarTema(tema) {
        try {
            localStorage.setItem(CHAVE_TEMA, tema);
        } catch (erro) {
            console.error("Não foi possível salvar o tema:", erro);
        }
    }

    function temaInicial() {
        const salvo = lerTemaSalvo();

        if (salvo) {
            return salvo;
        }

        const preferePaginaEscura =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        return preferePaginaEscura ? "escuro" : "claro";
    }

    function aplicarTema(tema) {
        document.documentElement.setAttribute("data-tema", tema);

        const botao = document.getElementById("botao-tema");

        if (!botao) {
            return;
        }

        const escuro = tema === "escuro";
        const texto = escuro ? "Mudar para modo claro" : "Mudar para modo escuro";

        botao.textContent = escuro ? "☀️" : "🌙";
        botao.setAttribute("aria-label", texto);
        botao.title = texto;
    }

    let temaAtual = temaInicial();

    aplicarTema(temaAtual);

    document.addEventListener("DOMContentLoaded", function () {
        aplicarTema(temaAtual);

        const botao = document.getElementById("botao-tema");

        if (!botao) {
            return;
        }

        botao.addEventListener("click", function () {
            temaAtual = temaAtual === "escuro" ? "claro" : "escuro";
            aplicarTema(temaAtual);
            salvarTema(temaAtual);
        });
    });
})();
