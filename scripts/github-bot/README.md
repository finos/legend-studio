# legend-studio-bot

De-facto bot with an arsenal of automation scripts for [finos/legend-studio](https://github.com/finos/legend-studio) repository.

### Overview

Technically, to achieve these sorts of automation, we could create proper Github bot (see [probot](https://github.com/probot/probot) for example), but that comes with a certain level of deployment complexity, we could achieve roughly the same effect using Github actions, hence the existence of this package.

> Having this bot as part of this monorepo, we need to be cautious when setting up this bot in Github actions. Calling `yarn install` is expensive, instead we need to use `yarn workspaces focus --production` to only install [minimal set of dependencies](https://yarnpkg.com/cli/workspaces/focus/#gatsby-focus-wrapper) required for the bot to function.
