# @finos/legend-application-repl-deployment

This is the `Legend REPL` web application deployment. This is used for development locally

## Getting Started

1. Start the REPL using [this guide](https://github.com/finos/legend-engine/blob/master/legend-engine-config/legend-engine-repl/README.md#developer-guide).

- Use [DataCubeClient](https://github.com/finos/legend-engine/blob/master/legend-engine-config/legend-engine-repl/legend-engine-repl-data-cube/src/main/java/org/finos/legend/engine/repl/dataCube/client/DataCubeClient.java).
- Make sure to configure the properties to have the REPL point at the DEV web app:

```
# [DEVELOPMENT] Specify the base URL for the development instance of the web application
# this is needed to bypass CORS
-Dlegend.repl.dataCube.devWebAppBaseUrl=http://localhost:9005

# [DEVELOPMENT] By default, the port is randomized, but for development, the port needs
# to be fixed to allow the web application to connect to the REPL
-Dlegend.repl.dataCube.devPort=9006
```

2. Start REPL web-application:

```bash
  yarn install
  yarn setup
  yarn dev:repl
```

Visit http://localhost:9005/repl/grid and the application should be up and running.
