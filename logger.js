const moment = require("moment");

class Logger {
    track(req, res) {
        let remoteAddress;
        if (req.headers.hasOwnProperty("cf-connecting-ip")) {
            remoteAddress = req.socket.remoteAddress + " (CF) -> " + req.headers["cf-connecting-ip"];
        } else if (req.headers.hasOwnProperty("X-Forwarded-For")) {
            remoteAddress = req.headers["X-Forwarded-For"];
            if (remoteAddress.indexOf(",") != -1) {
                remoteAddress = remoteAddress.substring(0, remoteAddress.indexOf(","));
            }
        } else {
            remoteAddress = req.socket.remoteAddress;
        }
        
        res.on('finish', () => {
            let logString = `${remoteAddress}: HTTP ${res.statusCode} ${res.statusMessage} | ${req.method} ${(req.host == null ? "" : `${req.host} -> `)} ${req.url}`
            let time = moment().format("hh:mm:ss");
        
            let prefix;
            if (res.statusCode != 200 && res.statusCode != 101 && res.statusCode != 204) {
                prefix = "\x1b[1m\x1b[33m[!] ";
            } else {
                prefix = "\x1b[1m\x1b[37m[i] "
            }
            console.log(`[${time}] ${prefix}${logString}\x1b[0m`);
        });
    }
}

module.exports = Logger;