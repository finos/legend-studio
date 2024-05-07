# @finos/legend-application-repl-deployment

This is the `Legend REPL` web application deployment. This is used for development locally

## Backend

`Legend REPL` relies on:

- [Legend Engine](https://github.com/finos/legend-engine) [REPL Client](https://github.com/finos/legend-engine/blob/master/legend-engine-config/legend-engine-repl/legend-engine-repl-relational/src/main/java/org/finos/legend/engine/repl/relational/client/RClient.java).

## Getting started

To quickly setup the backend, spin up `REPL Client` application:

- In order to start the server, please use the `Main` class `org.finos.legend.engine.repl.relational.client.RClient`
- This will open a new terminal in your IDE with REPL Client up and running. This will also print the port at which backend server for grid is running at.
- If you wish to change the port for backend server (preferably 8080 as client assumes server runs at this port) please modify port here [REPL Grid Server](https://github.com/finos/legend-engine/blob/master/legend-engine-config/legend-engine-repl/legend-engine-repl-relational/src/main/java/org/finos/legend/engine/repl/relational/httpServer/ReplGridServer.java)

Before spinning up the application make sure to run these commands on `REPL terminal` so that there is an initial query state for grid.

```bash
  load <path> <connection>
  #>{<db.table>}#->from(<connection>)
  show
```

To know about more specific synatx of these commands type `help` on the REPL terminal.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev:repl
```

After setting up, visit http://localhost:9005/repl/grid and the application should be up and running.
