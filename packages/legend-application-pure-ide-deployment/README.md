# @finos/legend-application-pure-ide-deployment

This is the `Legend Pure IDE` web application deployment. This is used for development locally

## Backend

`Legend Pure IDE` relies on:

- [Legend Engine](https://github.com/finos/legend-engine) [Light Pure IDE server](https://github.com/finos/legend-engine/blob/master/legend-engine-pure-ide-light/src/main/java/org/finos/legend/engine/ide/PureIDELight.java).

## Getting started

To quickly setup the backend, [setup with Maven](https://github.com/finos/legend-engine#starting-pure-ide).

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:pure-ide
```

After setting up, visit http://localhost:9200/ide and the application should be up and running.
