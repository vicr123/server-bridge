const ocsp = require("ocsp");

class OCSP {
    #cache;
    
    constructor() {
        this.#cache = new ocsp.Cache();
    }
    
    getOCSPUri(certificate) {
        return new Promise((res, rej) => {
            ocsp.getOCSPURI(certificate, (err, uri) => {
                if (err) {
                    rej(err);
                } else if (uri === null) {
                    rej();
                } else {
                    res(uri);
                }
            });
        })
    }
    
    probeCache(reqId) {
        return new Promise((res, rej) => {
            this.#cache.probe(reqId, (err, cached) => {
                if (err) {
                    rej(err);
                } else {
                    res(cached);
                }
            });
        });
    }
    
    async handle(certificate, issuer, callback) {
        try {
            let url = await this.getOCSPUri(certificate);
            let request = ocsp.request.generate(certificate, issuer);
            
            let cached = await this.probeCache(request.id);
            if (cached) {
                callback(null, cached.response);
                return;
            }
            
            this.#cache.request(request.id, {
                url: url,
                ocsp: request.data
            }, callback);
        } catch (err) {
            callback(err);
        }
    }
}

module.exports = OCSP;