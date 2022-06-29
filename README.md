[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)
[![npm](https://img.shields.io/npm/v/@finos/legend-studio-app?cacheSeconds=3600)](https://www.npmjs.com/package/@finos/legend-studio-app)
![build](https://github.com/finos/legend-studio/actions/workflows/check-build.yml/badge.svg)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=legend-studio&metric=security_rating&token=1649412014267d7d7a6833643cb3133afe0137b0)](https://sonarcloud.io/dashboard?id=legend-studio)

# legend-studio

The codebase and home of Legend applications: `Legend Studio`, `Legend Query`, etc.

## Getting started

Make sure you have _at least_ SDLC and Engine servers running. To quickly set these up, use our development [Docker compose](https://github.com/finos/legend/tree/master/installers/docker-compose/legend-studio-dev). If you need to debug and code on the backend at the same time, follow [this guide](./fixtures/legend-docker-setup/studio-dev-setup/README.md) to set them up using `maven`.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev
```

After setting up, visit http://localhost:8080/studio and the application should be up :tada:

> If you get `Unauthorized` error, visit SDLC server at http://localhost:7070/api/auth/authorize in your browser, you will get redirected to the Gitlab login page or a Gitlab page asking you to authorize Legend OAuth application. After you completing these steps, you will be redirected back to SDLC. Now refresh Studio and the problem should be gone.

## Documentation

You can find our documentation [on the website](https://legend.finos.org/).

Check out the [Getting Started](https://legend.finos.org/docs/getting-started/introduction-to-legend) page for a quick overview. Also check out the [Installation Guide](https://legend.finos.org/docs/getting-started/installation-guide) to find out how to setup your Legend ecosystem.

You can improve it by sending pull requests to [this repository](https://github.com/finos/legend).

## Roadmap

Visit our [roadmap](https://github.com/finos/legend#roadmap) to know more about the upcoming features.

## Contributing

Please read our [contributing guide](./CONTRIBUTING.md).

### Code of conduct

We adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

### Good first issues

We have a list of [good first issues](https://github.com/finos/legend-studio/labels/good%20first%20issue) that contain bugs which have a relatively limited scope. This is a great place to get started, gain experience, and get familiar with our contribution process.

### License

Copyright (c) 2020-present, Goldman Sachs

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
