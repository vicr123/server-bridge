
class HttpStrictTransportSecurity {
    #hstsHeader;

    setConfig(config) {
        if (config.ssl && config.ssl.strictTransportSecurity) {
            let clauses = [];
            clauses.push(`max-age=${config.ssl.strictTransportSecurity.maxAge}`);
            if (config.ssl.strictTransportSecurity.subdomains) clauses.push("includeSubDomains");
            if (config.ssl.strictTransportSecurity.preload) clauses.push("preload");

            this.#hstsHeader = clauses.join("; ");
        }
    }

    injectHeaders(headers) {
        if (this.#hstsHeader) {
            headers["Strict-Transport-Security"] = this.#hstsHeader;
        }
        return headers;
    }
}

let hsts = new HttpStrictTransportSecurity();
module.exports = hsts;