# @finos/legend-application-data-cube-deployment

This is the `Legend Data Cube` web application deployment. This is used for development locally and publishing of image [finos/legend-data-cube](https://hub.docker.com/r/finos/legend-data-cube) on [Docker Hub](https://hub.docker.com/).

## Getting started

To quickly setup the backend, use our development [Docker compose](./fixtures/legend-docker-setup/studio-dev-setup/README.md). If you need to debug and develop the backend, [setup with Maven](https://legend.finos.org/docs/getting-started/installation-guide#maven-install) instead.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:datacube
```

After setting up, visit http://localhost:9001/data-cube and the application should be up and running.
