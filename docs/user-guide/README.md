# User guides

Guides for the people who use Legend's applications, published on [legend.finos.org](https://legend.finos.org): the
site's build, in [finos/legend](https://github.com/finos/legend), checks out this folder and shows each guide as a
section of its own. What is merged here shows there after the site's next build (daily).

| Guide                      | On the site                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| [Legend Cube](./cube/)     | [legend.finos.org/guides/cube](https://legend.finos.org/guides/cube)     |
| [Legend Studio](./studio/) | [legend.finos.org/guides/studio](https://legend.finos.org/guides/studio) |
| [Legend Query](./query/)   | [legend.finos.org/guides/query](https://legend.finos.org/guides/query)   |

## Writing a page

- A page is a Markdown file in the guide's folder, with a `title` and a `sidebar_position` in its front matter; the
  site's sidebar lists the pages in that order. Write plain Markdown, which the site reads as CommonMark.
- Link to another page by its file (`./editor-overview.md`) and to an image by its path (`./images/editor.png`).
- Say only what the page does on screen, in the words its buttons use.

## Screenshots

The screenshots are made by scripts, not by hand, so they can be made again when the page changes: each opens a page
of a running application, outlines its controls, numbers them, and writes the image into the guide's `images` folder.
A control that is gone fails the script, so an image never points at nothing. Check each image against its page's
numbered list, and commit both. In each script, a callout's number is the number its page explains it under.

### Legend Cube

1. Run Legend Analytics (`yarn dev:analytics`) and the engine on port 6300.
2. `yarn workspace @finos/legend-application-analytics-e2e user-guide:screenshots` (`USER_GUIDE_ANALYTICS_URL` points
   at another Legend Analytics; the default is `http://localhost:9009/analytics/`).

The scripts are in
[packages/legend-application-analytics-e2e/src/user-guide](../../packages/legend-application-analytics-e2e/src/user-guide).

### Legend Studio

1. Run Legend Studio (`yarn dev`) and the engine on port 6300, such as the one the Studio end-to-end tests start (see
   [their README](../../packages/legend-application-studio-e2e/README.md)). No SDLC server is needed: the scripts
   answer for it in the browser, with the project the guide shows.
2. `yarn workspace @finos/legend-application-studio-e2e user-guide:screenshots` (`USER_GUIDE_STUDIO_URL` points at
   another Legend Studio; the default is `http://localhost:9000/studio/`).

The scripts are in
[packages/legend-application-studio-e2e/src/user-guide](../../packages/legend-application-studio-e2e/src/user-guide),
and the guide's project, a model written in the Legend language, in its `GuideProject.ts`.

`user-guide:recordings` records the GIFs in [studio/\_recordings](./studio/_recordings/), of a few tasks to reuse
elsewhere. The guide doesn't show them, and the site doesn't publish them. It needs `ffmpeg`.

### Legend Query

1. Run Legend Query (`yarn dev:query`) and the engine on port 6300. No depot or query store is needed: the scripts
   answer for them in the browser, with the project the guide shows. The engine finds a project only in its own depot,
   so the scripts send it the guide project's model in place of each reference to the project.
2. `yarn workspace @finos/legend-application-query-e2e user-guide:screenshots` (`USER_GUIDE_QUERY_URL` points at
   another Legend Query; the default is `http://localhost:9001/query/`).

The scripts are in
[packages/legend-application-query-e2e/src/user-guide](../../packages/legend-application-query-e2e/src/user-guide),
and the guide's project, a model written in the Legend language, in its `GuideProject.ts`.
