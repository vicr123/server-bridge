# Server Bridge

This is a node.js application that can be used to run multiple HTTP services (depending on the HOST header) from a single server.

## Features
- Automatically promotes insecure connections to SSL
- Supports WebSockets
- Supports OCSP Stapling

## Installation
```bash
git clone https://github.com/vicr123/server-bridge.git
cd server-bridge
node install
```

At this point, you should configure the bridge. Information about configuration is available in [configuration.md](configuration.md).

Once server-bridge is installed, it may simply be run with `npm start`.

## Configuration
Configuration takes the form of a JSON file `config.json` stored at the root of the repository. View [configuration.md](configuration.md) for information about configuration.