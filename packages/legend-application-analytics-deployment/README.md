# @finos/legend-application-analytics-deployment

This is the `Legend Analytics` web application deployment, used for development locally. Its first iteration runs
Legend Cube, the canvas query builder, on its own.

## Getting started

Legend Analytics needs a Legend engine; the depot, lakehouse and marketplace are optional, and their sources are
offered only when the config names them. Make sure you have `Yarn` installed, then run the following commands in
order.

```bash
  yarn install
  yarn setup
  yarn dev:analytics
```

After setting up, visit http://localhost:9009/analytics and the application should be up and running.
