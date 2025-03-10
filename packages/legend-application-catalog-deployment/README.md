# @finos/legend-application-catalog-deployment

## This document is a WIP

This is the `Legend Catalog` web application deployment. This is used for development locally and publishing of image [finos/legend-catalog](https://hub.docker.com/r/finos/legend-catalog) on [Docker Hub](https://hub.docker.com/).

## Backend

`Legend Catalog` relies on:

- TBD

## Getting started

To quickly setup the backend, use our development [Docker compose](./fixtures/legend-docker-setup/studio-dev-setup/README.md). If you need to debug and develop the backend, [setup with Maven](https://legend.finos.org/docs/getting-started/installation-guide#maven-install) instead.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:catalog
```

After setting up, visit http://localhost:9008/catalog and the application should be up and running.
