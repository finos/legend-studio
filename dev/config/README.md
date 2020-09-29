# Development Local Config

## Local config files

We expect to have `config.json` and `version.json` in this directory and they are needed to boot the application. Run the setup script to generate these files.

## Override DEV server config

To customize the DEV server settings, you can either directly change `webpack.config.js` or create a file called `serverConfig.json` with te overriding specs (this file path is determined by `SERVER_CONFIG_PATH` in the start script).

Note that all files other than this `README` is ignored by default.
