[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)
[![build](https://img.shields.io/github/actions/workflow/status/finos/legend-studio/check-build.yml?branch=master)](https://github.com/finos/legend-studio/actions/workflows/check-build.yml)
[![docker security](https://img.shields.io/github/actions/workflow/status/finos/legend-studio/check-docker.yml?branch=master&label=docker%20security)](https://github.com/finos/legend-studio/actions/workflows/check-docker.yml)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=legend-studio&metric=security_rating&token=1649412014267d7d7a6833643cb3133afe0137b0)](https://sonarcloud.io/dashboard?id=legend-studio)
[![GitHub license](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/finos/legend-studio/blob/master/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/finos/legend-studio/blob/master/CONTRIBUTING.md)
[![npm](https://img.shields.io/npm/v/@finos/legend-application-studio-bootstrap)](https://www.npmjs.com/package/@finos/legend-application-studio-bootstrap)
[![docker](https://img.shields.io/docker/v/finos/legend-studio?label=finos%2Flegend-studio&logo=docker&logoColor=docker&sort=semver)](https://hub.docker.com/r/finos/legend-studio)

# legend-studio

The codebase and home of Legend applications: `Legend Studio`, `Legend Query`, etc.

## Getting started

Studio relies [Legend SDLC](https://github.com/finos/legend-sdlc) server and [Legend Engine](https://github.com/finos/legend-engine) server. To quickly set these backend servers up, use our development [Docker compose](./fixtures/legend-docker-setup/studio-dev-setup/README.md). If you need to debug and develop the backend, [setup with Maven](https://legend.finos.org/docs/getting-started/installation-guide#maven-install) instead.

Last but not least, make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn install
  yarn setup
  yarn dev
```

After setting up, visit http://localhost:9000/studio and the application should be up :tada:

> If you get `Unauthorized` error, visit `SDLC` server at http://localhost:6100/api/auth/authorize in your browser, you will get redirected to the Gitlab login page or a Gitlab page asking you to authorize Legend OAuth application. After you completing these steps, you will be redirected back to SDLC. Now refresh Studio and the problem should be gone.

## Documentation

You can find the usage documentation [on the website](https://legend.finos.org/).

Check out the [Getting Started](https://legend.finos.org/docs/getting-started/introduction-to-legend) page for a quick overview. Also check out the [Installation Guide](https://legend.finos.org/docs/getting-started/installation-guide) to find out how to setup your Legend ecosystem.

You can improve it by sending pull requests to [this repository](https://github.com/finos/legend).

For `Legend Studio` extension contributors, check out our [API documentation](https://finos.github.io/legend-studio/).

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




