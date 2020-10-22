/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const chalk = require('chalk');
const semver = require('semver');
const fs = require('fs');
const path = require('path');

const createLocalVersionInfo = () => ({
  'git.build.time': (new Date()).toISOString(),
  'git.build.version': 'LOCAL',
  'git.commit.id': 'LOCAL'
});

const createLocalAppConfig = () => ({
  realm: 'LOCAL',
  sdlcServer: '/sdlc',
  execServer: '/exec',
  tracerServer: '/tracer',
  documentation: {
    fullDocUrl: 'https://legend.finos.org/docs/getting-started/installation-guide',
  },
  features: [],
});

const setUp = () => {
  const engineInfo = require('../../package.json').engines;
  if (!semver.satisfies(process.version, engineInfo.node)) {
    console.log(`${chalk.redBright('x')}${chalk.gray(' [setup]')} : ${chalk.redBright(`Node version check failed! [required ${engineInfo.node}, found ${process.version}]`)}`);
    return;
  } else {
    console.log(`${chalk.gray('i [setup]')} : Node version check passed!`);
  }
  const configFilePath = path.resolve(__dirname, '../config/config.json');
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(createLocalAppConfig(), null, 2));
    console.log(`${chalk.gray('i [setup]')} : Created local config file successfully!`);
    console.log(`${chalk.gray('i [setup]')} : ${chalk.yellowBright(`Please check and update server URL accordingly`)}`);
  } else {
    console.log(`${chalk.gray('i [setup]')} : Local config file already existed! Skipping...`);
  }
  const versionFilePath = path.resolve(__dirname, '../config/version.json');
  if (!fs.existsSync(versionFilePath)) {
    fs.writeFileSync(versionFilePath, JSON.stringify(createLocalVersionInfo(), null, 2));
    console.log(`${chalk.gray('i [setup]')} : Created local version file successfully!`);
    console.log(`${chalk.gray('i [setup]')} : Node version check passed!`);
  } else {
    console.log(`${chalk.gray('i [setup]')} : Local version file already existed! Skipping...`);
  }
  console.log(`${chalk.gray('i [setup]')} : ${chalk.greenBright(`You are all set!`)}`);
};

setUp();
