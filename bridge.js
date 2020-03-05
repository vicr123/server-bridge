const http = require("http");
const https = require("https");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

const Logger = require("./logger");
let logger = new Logger();

const Proxy = require("./proxy");
let proxy = new Proxy(config);

const OCSP = require("./ocsp");
let ocsp = new OCSP();

//Get the HOST header
function getHost(req, res, next) {
    let host = req.headers.host;

    if (host == null) {
        if (res != null) {
            res.writeHead(400, {
                'Content-Type': 'text/html'
            });
            res.write("You'll need to access this page using a domain instead of an IP.");
            res.end();
        }
        return;
    }

    if (host.indexOf(":") != -1) {
        host = host.substring(0, host.indexOf(":"));
    }
    req.host = host;
    next();
}

function upgrade(req, socket, head) {
    getHost(req, null, () => {
        proxy.upgrade(req, socket, head);
    });
}

//Create HTTP server to force all requests to HTTPS
http.createServer((req, res) => {
    logger.track(req, res);
    getHost(req, res, () => {
        if (config.ssl && config.ssl.autopromote) {
            res.writeHead(301, {
                "Content-Type": 'text/html',
                "Location": `https://${req.host}${config.ssl.autopromote === 443 ? "" : `:${config.ssl.autopromote}`}${req.url}`
            });
            res.end();
        } else {
            proxy.handle(req, res);
        }
    });
}).on('upgrade', upgrade).listen(config.ports.http);

if (config.ssl) {
    https.createServer({
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert)
    }, (req, res) => {
        logger.track(req, res);
        getHost(req, res, () => {
            proxy.handle(req, res);
        });
    })
    .on('upgrade', upgrade)
    .on("OCSPRequest", (certificate, issuer, callback) => {
        ocsp.handle(certificate, issuer, callback);
    })
    .listen(config.ports.https);
}
