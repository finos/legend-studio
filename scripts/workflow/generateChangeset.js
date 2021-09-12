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

import { generateChangeset } from '@finos/legend-dev-utils/ChangesetUtils';
import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * NOTE: when we generate changeset, we want to use `master` branch as the reference point
 * unlike `origin/master` which is used in the pipeline to check for validity of the PR changesets.
 * There are 2 reasons for this:
 *
 * 1. The Github actions does not know about the local `master` branch, it has to use `origin/master`
 *    to compute the changeset
 * 2. For the suggested workflow where the user does not commit directly on his/her `master` branch
 *    but work on another local feature branch, their branch often stems from `master` instead of
 *    `origin/master`, so it makes more sense to compute changeset since `master`. Also, using `master`
 *    in this case will likely produce a more compact and accurate changeset.
 *
 * As such, before generating changeset, we should warn user if they are working on `master` branch or
 * their `master` and `origin/master` mismatch.
 *
 * Of course, we can allow a workaround for people who work directly `master` branch.
 */

import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs.default(hideBin(process.argv)).argv;

const DEFAULT_BRANCH_NAME = 'master';
const useOrigin = argv.useOrigin;
const message = argv.m;
const targetBranch = argv.v
  ? argv.v === 'latest'
    ? DEFAULT_BRANCH_NAME
    : `release/${argv.v}`
  : undefined;

if (targetBranch === undefined) {
  console.log(
    chalk.red(
      `Changeset generator needs to know the release version you are working on. ` +
        `Specify a version using '-v 0.4.0' or '-v latest' if you are planning to merge your changes to the default branch`,
    ),
  );
  process.exit(1);
}

if (!useOrigin) {
  const currentBranch = execSync(`git branch --show-current`, {
    encoding: 'utf-8',
  }).trim();

  if (currentBranch === targetBranch) {
    console.log(
      chalk.red(
        `Changeset generator by default only works if you work on feature branches instead of the '${targetBranch}' branch. ` +
          `This is also the recommended workflow. But if you must, you can use the '--useOrigin' flag.`,
      ),
    );
    process.exit(1);
  }

  const localTargetBranchRev = execSync(`git rev-parse ${targetBranch}`, {
    encoding: 'utf-8',
  }).trim();
  const originTargetBranchRev = execSync(
    `git rev-parse origin/${targetBranch}`,
    {
      encoding: 'utf-8',
    },
  ).trim();

  if (localTargetBranchRev !== originTargetBranchRev) {
    console.log(
      chalk.yellow(
        `Changeset generator might not haved produced the most accurate changeset!\n` +
          `By default this will set reference point to your local '${targetBranch}' branch; however, ` +
          `when validating them, we will set reference point to origin '${targetBranch}' branch.\n` +
          `As such, it is recommended to keep your local and origin '${targetBranch}' branches in sync to produce more accurate changeset.\n`,
      ),
    );
  }
}

generateChangeset(
  process.cwd(),
  message ? message.trim() : '',
  useOrigin ? `origin/${targetBranch}` : targetBranch,
);
