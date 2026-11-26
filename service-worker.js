// Ao alterar qualquer arquivo do site, mude o número da versão abaixo
// para os aparelhos descartarem o cache antigo.
const VERSAO_CACHE = "helpdesk-escolar-v4";

const ARQUIVOS = [
    "./",
    "index.html",
    "chamados.html",
    "login.html",
    "login.js",
    "JS/auth.js",
    "JS/config.js",
    "style.css",
    "app.js",
    "chamados.js",
    "JS/storage.js",
    "JS/tema.js",
    "pwa.js",
    "manifest.webmanifest",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png"
];

self.addEventListener("install", function (evento) {
    evento.waitUntil(
        caches
            .open(VERSAO_CACHE)
            .then(function (cache) {
                // Guarda cada arquivo separadamente: se algum não existir,
                // os outros continuam sendo guardados.
                return Promise.all(
                    ARQUIVOS.map(function (arquivo) {
                        return cache.add(arquivo).catch(function () {});
                    })
                );
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener("activate", function (evento) {
    evento.waitUntil(
        caches
            .keys()
            .then(function (nomes) {
                return Promise.all(
                    nomes
                        .filter(function (nome) {
                            return nome !== VERSAO_CACHE;
                        })
                        .map(function (nome) {
                            return caches.delete(nome);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// Estratégia: tenta a internet primeiro (sempre a versão mais nova);
// se estiver offline, usa o que está guardado no cache.
self.addEventListener("fetch", function (evento) {
    const requisicao = evento.request;

    if (requisicao.method !== "GET") {
        return;
    }

    const url = new URL(requisicao.url);

    // Só trata arquivos do próprio site (fontes do Google etc. seguem normais).
    if (url.origin !== self.location.origin) {
        return;
    }

    evento.respondWith(
        fetch(requisicao)
            .then(function (resposta) {
                if (resposta && resposta.ok) {
                    const copia = resposta.clone();
                    caches.open(VERSAO_CACHE).then(function (cache) {
                        cache.put(requisicao, copia);
                    });
                }
                return resposta;
            })
            .catch(function () {
                return caches.match(requisicao).then(function (guardado) {
                    return guardado || caches.match("index.html");
                });
            })
    );
});
