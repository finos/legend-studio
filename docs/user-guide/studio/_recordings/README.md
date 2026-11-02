# Legend Studio recordings

GIFs of a few tasks in Legend Studio, kept here to reuse, such as in other documentation or a presentation. The guide's
pages don't show them, and the site doesn't publish this folder: Docusaurus skips folders whose names start with `_`.

| GIF                                                                            | What it shows                                                                                                                    |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [data-space-create.gif](./data-space-create.gif)                               | Creating a data space: New Element › Data Space, its name, title and description.                                                |
| [data-space-add-execution-context.gif](./data-space-add-execution-context.gif) | Adding an execution context: its name, mapping and default runtime, then making it the default.                                  |
| [data-space-mapping-provider.gif](./data-space-mapping-provider.gif)           | An execution context whose mapping a data product provides: Mapping Provider, the data product and its model access point group. |
| [data-space-add-executable.gif](./data-space-add-executable.gif)               | Adding an executable: a service, its title and description, and the execution context it runs with.                              |

Each GIF starts where the one before ends. They show the guide's project, **firm-model** (see
[the Data spaces page](../data-space.md)), with a data product, **FirmDataProduct**, which only the recordings have.

## Making them again

The GIFs are recorded by
[`DataSpace.recordings.ts`](../../../../packages/legend-application-studio-e2e/src/user-guide/DataSpace.recordings.ts),
on the same backends as the guide's screenshots (see [the user guides' README](../../README.md#legend-studio)), and
assembled by `ffmpeg`, which must be installed:

```sh
yarn workspace @finos/legend-application-studio-e2e user-guide:recordings
```
