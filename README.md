[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)
![legend-build](https://github.com/finos/legend-studio/workflows/legend-build/badge.svg)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=legend-studio&metric=security_rating&token=1649412014267d7d7a6833643cb3133afe0137b0)](https://sonarcloud.io/dashboard?id=legend-studio)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=legend-studio&metric=bugs&token=1649412014267d7d7a6833643cb3133afe0137b0)](https://sonarcloud.io/dashboard?id=legend-studio)

# legend-studio

## Getting started

Make sure you have SDLC and Engine servers running. If you don't have these servers setup to run locally, you can make use of [this Docker compose project](https://github.com/finos/legend/tree/master/installers/docker-compose) to quickly set them up. The more convenient approach we found is to run these server and use a remote Gitlab instance, if you choose to follow that direction, pay attention to the [note on development](https://github.com/finos/legend/tree/master/installers/docker-compose/legend-with-remote-gitlab/README.md#note-on-development).

Make sure you have `Yarn` installed. Run the following commands in order.

```bash
  yarn setup
  yarn dev
```

## Documentation

You can find the Legend Studio documentation [on the website](https://legend.finos.org/).

Check out the [Getting Started](https://legend.finos.org/docs/getting-started/getting-started-guide) page for a quick overview. Also check out the [Installatiton Guide](https://legend.finos.org/docs/installation/installation-guide) to find out how to setup your Legend ecosystem.

You can improve it by sending pull requests to [this repository](https://github.com/finos/legend).

## Roadmap

Visit our [roadmap](https://github.com/finos/legend#roadmap) to know more about the upcoming features.

## Contributing

The main purpose of this repository is to continue evolving Legend Studio core, making it faster, more powerful, and easier to use. Development of Legend Studio happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Legend Studio.

### Code of conduct

We adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

### Contributing guide

Read our [contributing guide](./CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to Legend Studio.

### License

Copyright (c) 2020-present, Goldman Sachs

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
