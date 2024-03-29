const httpProxy = require("http-proxy");
const ws = require("ws");
const path = require("path");
const hsts = require("./hsts");

class Proxy {
    #proxy;
    #config;
    
    constructor(config) {
        this.#config = config;
        this.#proxy = {};
        
        for (let [host, redirect] of Object.entries(config.redirects)) {
            let proxy;
            if (Number.isInteger(redirect) || redirect.proxy) {
                let host = redirect.host || "127.0.0.1";
                let port = Number.isInteger(redirect) ? redirect : redirect.port;
                let protocol = redirect.https ? "https" : "http";
                
                proxy = httpProxy.createProxyServer({
                    preserveHeaderKeyCase: true,
                    xfwd: true,
                    selfHandleResponse: true,
                    target: {
                        protocol: protocol,
                        host: host,
                        port: port
                    }
                });
                proxy.on("error", (err, req, res) => {
                    console.log(err);
                    res.writeHead(502, hsts.injectHeaders({
                        'Content-Type': 'text/plain'
                    }));
                    res.write("Sorry, looks like something isn't working right on our end. Give it a few minutes and try again.");
                    res.end();
                });
                proxy.on("proxyReq", (proxyReq, req, res) => {
                    if (!req.headers["x-forwarded-proto"]) {
                        proxyReq.setHeader("X-Forwarded-Proto", req.connection.encrypted ? "https" : "http");
                    }

                    if (redirect.rewriteHost) {
                        proxyReq.setHeader("Host", redirect.rewriteHost);
                    }
                });
                proxy.on("proxyRes", (proxyRes, req, res) => {
                    let headers = proxyRes.headers;
                    res.writeHead(proxyRes.statusCode, hsts.injectHeaders(headers));
                    proxyRes.pipe(res);
                    // proxyRes.on('data', chunk => res.write(chunk));
                    // proxyRes.on('end', () => res.end());
                });
            } else {
                proxy = {
                    web: (req, res) => {
                        let location = redirect.location;
                        if (req.url !== "/") {
                            if (!req.url.startsWith("/")) {
                                location += "/";
                            }
                            location += req.url;
                        }

                        res.writeHead(301, hsts.injectHeaders({
                            location: location
                        }));
                        res.end();
                    }
                };
            }
            
            this.#proxy[host] = proxy;
        }
    }
    
    getProxy(host) {
        return this.#proxy[host];
    }
    
    handle(req, res) {
        let proxy = this.getProxy(req.host);
        if (!proxy) {
            res.writeHead(400, hsts.injectHeaders({'Content-Type': 'text/html'}));
            res.write(`Invalid Host header: ${req.host}`);
            res.end();
        } else {
            proxy.web(req, res);
        }
    }
    
    upgrade(req, socket, head) {
        let redirect = this.#config.redirects[req.host];
        if (!redirect) {
            socket.end();
        } else if (Number.isInteger(redirect) || redirect.proxy) {
            let host = redirect.host || "localhost";
            let port = Number.isInteger(redirect) ? redirect : redirect.port;
            let scheme = redirect.https ? "wss" : "ws";
            let protocols = [];
            let headers = {...req.headers};
        
            let forwarded = req.headers["x-forwarded-for"];
            if (forwarded) {
                forwarded += ",";
            } else {
                forwarded = "";
            }

            let wsProtocols = req.headers["sec-websocket-protocol"];
            if (wsProtocols) {
                protocols = wsProtocols.split(",");
            }

            headers["x-forwarded-for"] = forwarded + req.connection.remoteAddress;
            delete headers["sec-websocket-key"];
            delete headers["sec-websocket-protocol"];
            delete headers["sec-websocket-version"];
        
            let wsConnection = new ws(`ws://${host}:${port}${req.url}`, protocols, {
                headers: hsts.injectHeaders(headers),

            });
            wsConnection.on("open", function() {
                let wsServer = new ws.Server({
                    noServer: true
                });
                wsServer.handleUpgrade(req, socket, head, function(ws) {
                    wsConnection.on("message", function(message) {
                        ws.send(message);
                    });
                    ws.on("message", function(message) {
                        wsConnection.send(message);
                    })
                    wsConnection.on("close", function(code, reason) {
                        if (code == 1005 || code == 1006) {
                            ws.terminate();
                        } else {
                            ws.close(code, reason);
                        }
                    });
                    ws.on("close", function(code, reason) {
                        if (code == 1005 || code == 1006) {
                            wsConnection.terminate();
                        } else {
                            wsConnection.close(code, reason);
                        }
                    });
                });
            });
            wsConnection.on("unexpected-response", function(req, res) {
                socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n\r\n`);
                socket.end();
            });
            wsConnection.on("error", function(err) {
                socket.end();
            });
        } else {
            socket.end();
        }
    }
}

module.exports = Proxy;
