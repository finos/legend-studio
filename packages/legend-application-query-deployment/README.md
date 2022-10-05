# @finos/legend-application-query-deployment

This is the `Legend Query` web application deployment. This is used for development locally and publishing of image [finos/legend-query](https://hub.docker.com/r/finos/legend-query) on [Docker Hub](https://hub.docker.com/).

## Backend

`Legend Query` relies on:

- [Legend Depot](https://github.com/finos/legend-depot) server
- [Legend Engine](https://github.com/finos/legend-engine) server

## Getting started

To quickly setup the backend, use our development [Docker compose](./fixtures/legend-docker-setup/studio-dev-setup/README.md). If you need to debug and develop the backend, [setup with Maven](https://legend.finos.org/docs/getting-started/installation-guide#maven-install) instead.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:query
```

After setting up, visit http://localhost:9001/query and the application should be up and running.
