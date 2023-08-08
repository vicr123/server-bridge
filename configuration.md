# Configuration

Configuration takes the form of a JSON file, `config.json` stored at the root of the repository.

## Root Object
| Key       | Type             | Description                                                                                                                  |
|-----------|------------------|------------------------------------------------------------------------------------------------------------------------------|
| ports     | Ports object     | Gives information about the ports that server-bridge will run on                                                             |
| ssl       | SSL object       | [optional] Gives information about the SSL configuration to be used. If absent, the bridge will not run on an SSL connection |
| redirects | Redirects object | Gives information about the redirects to use.                                                                                |

## Ports object
| Key         | Type   | Description                                                                                                           |
|-------------|--------|-----------------------------------------------------------------------------------------------------------------------|
| http        | number | Port to run HTTP server on                                                                                            |
| https       | number | Port to run HTTPS server on                                                                                           |

## SSL object
| Key                     | Type        | Description                                                                                                           |
|-------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------|
| key                     | string      | Filesystem path to a PEM encoded private key                                                                          |
| cert                    | string      | Filesystem path to a PEM encoded certificate chain                                                                    |
| autopromote             | number      | [optional] Port to automatically promote HTTP connections to. If absent, the bridge will not autopromote connections. |
| mtls                    | MTLS object | [optional] Gives information about whether server-bridge should request client TLS certificates                       |
| noocsp                  | boolean     | [optional] true to disable OCSP Stapling                                                                              |
| strictTransportSecurity | HSTS object | [optional] Gives information about whether server-bridge should serve up HSTS headers                                 |

## MTLS object
| Key | Type   | Description                                                                                         |
|-----|--------|-----------------------------------------------------------------------------------------------------|
| ca  | string | Filesystem path to a PEM encoded certificate identifying the CA that issues the client certificates |

## HSTS object
| Key        | Type    | Description                                                             |
|------------|---------|-------------------------------------------------------------------------|
| maxAge     | number  | Amount of time the browser will remember the HSTS instruction for       |
| subdomains | boolean | [optional] Whether the HSTS instruction will apply to subdomains or not |
| preload    | boolean | [optional] Whether to send the preload directive in the HSTS header     |


## Redirects object
The redirects object defines the hosts that the bridge will recognise. The key is the host to redirect, and the value can be any of the following:
- **Number**: Port on the local server to proxy the request to
- **Object**: One of the following two object definitions: 
  
  | Key         | Type   | Description                                                                                                           |
  |-------------|--------|-----------------------------------------------------------------------------------------------------------------------|
  | location    | string | Present a 301 redirect to the client with this location                                                               |

  | Key   | Type   | Description                                          |
  |-------|--------|------------------------------------------------------|
  | proxy | bool   | Always true                                          |
  | host  | string | Host to proxy                                        |
  | port  | number | Port to proxy                                        |
  | https | bool   | Whether to communicate with the host over SSL or not |

## Example configuration

```json
{
    "ports": {
        "http": 80, /* Run the HTTP server on port 80 */
        "https": 443 /* Run the HTTPS server on port 443 */
    },
    "ssl": {
        "key": "/path/to/privkey.pem",
        "cert": "/path/to/fullchain.pem",
        "autopromote": 443, /* Promote any HTTP requests to port 443 on the host */
        "mtls": {
          "ca": "/path/to/ca/certificate.crt" /* Request a client certificate signed by the CA providing this certificate */
        }
    },
    "redirects": {
        "packages.vicr123.com": 4012, /* Proxy packages.vicr123.com to a server running on port 4012 */
        "theshell.vicr123.com": { /* When host theshell.vicr123.com hits the server... */
            "location": "https://vicr123.com/theshell" /* Redirect the client to this web address instead of proxying */
        },
        "entertaining.vicr123.com": { /* When host entertaining.vicr123.com hits the server... */
            "proxy": true,
            "host": "entertaining.games", /* Proxy host entertaining.games... */
            "port": 443, /* on port 443... */
            "https": true /* accessing it on an SSL enabled connection */
        }
    }
}
```