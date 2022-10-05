# @finos/legend-application-taxonomy-deployment

This is the `Legend Taxonomy` web application deployment. This is used for development locally and publishing of image [finos/legend-taxonomy](https://hub.docker.com/r/finos/legend-taxonomy) on [Docker Hub](https://hub.docker.com/).

## Backend

`Legend Taxonomy` relies on:

- [Legend Depot](https://github.com/finos/legend-depot) server
- [Legend Engine](https://github.com/finos/legend-engine) server
- and a server which will provide the taxonomy tree data

## Getting started

To quickly setup the backend, use our development [Docker compose](./fixtures/legend-docker-setup/studio-dev-setup/README.md). If you need to debug and develop the backend, [setup with Maven](https://legend.finos.org/docs/getting-started/installation-guide#maven-install) instead.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:mock-server # to bring up the mock dev server which will provide the taxonomy tree data
  yarn dev:taxonomy
```

After setting up, visit http://localhost:9002/taxonomy and the application should be up and running.
