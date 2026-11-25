// Registra o service worker para o app funcionar offline e poder ser instalado.
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("service-worker.js")
            .catch(function (erro) {
                console.error("Falha ao registrar o service worker:", erro);
            });
    });
}
