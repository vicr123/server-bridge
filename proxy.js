const httpProxy = require("http-proxy");
const ws = require("ws");
const path = require("path");

class Proxy {
    #proxy;
    #config;
    
    constructor(config) {
        this.#config = config;
        this.#proxy = {};
        
        for (let [host, redirect] of Object.entries(config.redirects)) {
            let proxy;
            if (Number.isInteger(redirect) || redirect.proxy) {
                let host = redirect.host || "localhost";
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
                    res.writeHead(502, {
                        'Content-Type': 'text/plain'
                    });
                    res.write("Sorry, looks like something isn't working right on our end. Give it a few minutes and try again.");
                    res.end();
                });
                proxy.on("proxyReq", (proxyReq, req, res) => {
                    proxyReq.setHeader("X-Forwarded-Proto", req.connection.encrypted ? "https" : "http");
                    if (redirect.rewriteHost) {
                        proxyReq.setHeader("Host", redirect.rewriteHost);
                    }
                });
                proxy.on("proxyRes", (proxyRes, req, res) => {
                    let headers = proxyRes.headers;
                    res.writeHead(proxyRes.statusCode, headers);
                    proxyRes.pipe(res);
                    // proxyRes.on('data', chunk => res.write(chunk));
                    // proxyRes.on('end', () => res.end());
                });
            } else {
                proxy = {
                    web: (req, res) => {
                        res.writeHead(301, {
                            location: `${redirect.location}/${req.url}`
                        });
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
            res.writeHead(400, {'Content-Type': 'text/html'});
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
        } else if (Number.isInteger(redirect)) {
            let headers = {};
        
            let forwarded = req.headers["x-forwarded-for"];
            if (forwarded) {
                forwarded += ",";
            } else {
                forwarded = "";
            }
            headers["x-forwarded-for"] = forwarded + req.connection.remoteAddress;
            if (req.headers["authorization"]) headers["authorization"] = req.headers["authorization"];
        
            let wsConnection = new ws(`ws://localhost:${redirect}${req.url}`, [], {
                headers: headers
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
                socket.write(`HTTP/1.1 ${req.statusCode} ${req.statusMessage}\r\n\r\n`);
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