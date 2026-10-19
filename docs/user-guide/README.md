# User guides

Guides for the people who use Legend's applications, published on [legend.finos.org](https://legend.finos.org): the
site's build, in [finos/legend](https://github.com/finos/legend), checks out this folder and shows each guide as a
section of its own. What is merged here shows there after the site's next build (daily).

| Guide                  | On the site                                            |
| ---------------------- | ------------------------------------------------------ |
| [Legend Cube](./cube/) | [legend.finos.org/cube](https://legend.finos.org/cube) |

## Writing a page

- A page is a Markdown file in the guide's folder, with a `title` and a `sidebar_position` in its front matter; the
  site's sidebar lists the pages in that order. Write plain Markdown, which the site reads as CommonMark.
- Link to another page by its file (`./editor-overview.md`) and to an image by its path (`./images/editor.png`).
- Say only what the page does on screen, in the words its buttons use.

## Screenshots

The screenshots are made by scripts, not by hand, so they can be made again when the page changes: each opens a page
of a running Legend Analytics, outlines its controls, numbers them, and writes the image into the guide's `images` folder.
A control that is gone fails the script, so an image never points at nothing.

1. Run Legend Analytics (`yarn dev:analytics`) and the engine on port 6300.
2. `yarn workspace @finos/legend-application-analytics-e2e user-guide:screenshots` (`USER_GUIDE_ANALYTICS_URL` points
   at another Legend Analytics; the default is `http://localhost:9009/analytics/`).
3. Check each image against its page's numbered list, and commit both.

The scripts are in
[packages/legend-application-analytics-e2e/src/user-guide](../../packages/legend-application-analytics-e2e/src/user-guide);
a callout's number there is the number its page explains it under.
