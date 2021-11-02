/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import semver from 'semver';
import chalk from 'chalk';

const imageTag = process.argv[2];

if (!imageTag) {
  console.log(chalk.red(`\u2A2F No Docker image tag provided`));
  process.exit(1);
}

if (imageTag !== 'snapshot' && !semver.valid(imageTag)) {
  console.log(chalk.red(`\u2A2F Invalid Docker image tag '${imageTag}'`));
  process.exit(1);
}
