# legend-studio-bot

De-facto bot with an arsenal of automation scripts for [finos/legend-studio](https://github.com/finos/legend-studio) repository.

### Overview

Technically, to achieve these sorts of automation, we could create proper Github bot (see [probot](https://github.com/probot/probot) for example), but that comes with a certain level of deployment complexity, we could achieve roughly the same effect using Github actions, hence the existence of this package.

One operation that is particularly expensive is to run `yarn install` in the root directory as that will go through the repo code's dependencies. That is unnecessary since we only need minimum dependencies to run these automations. As such, we make this a separate package (with its own `yarn.lock` file) to narrow the scope of installation.

> Dependencies in this package will be kept up-to-date thanks to `Yarn` workspace, however this package's `yarn.lock` file will become outdated and out of sync with its `package.json` after every upgrade. As such, we opt to keep the `yarn.lock` file always empty and in the pipeline, we must run `yarn install --no-immutable` to [not fail the CI build](https://github.com/yarnpkg/berry/discussions/3486).
