# @finos/legend-application-analytics-e2e

Browser scripts for the Legend Analytics web application, built with [Playwright](https://playwright.dev/). For now, they make the Legend Cube user guide's screenshots ([docs/user-guide/cube](../../docs/user-guide/cube)). Each script opens a page of a running Legend Analytics, outlines its controls, numbers them, and writes the image into the guide's `images` folder. A control that is gone fails the script, so an image never points at nothing.

## Making the screenshots

The scripts need the real engine, so nothing is started for them:

```sh
# one-time: download the browser binary
yarn workspace @finos/legend-application-analytics-e2e user-guide:setup

# with Legend Analytics (`yarn dev:analytics`) and the engine (port 6300) running
yarn workspace @finos/legend-application-analytics-e2e user-guide:screenshots
```

`USER_GUIDE_ANALYTICS_URL` points at another Legend Analytics; the default is `http://localhost:9009/analytics/`. Check each image against its page's numbered list, and commit both.

The scripts are in [`src/user-guide`](./src/user-guide); a callout's number there is the number its page explains it under.
