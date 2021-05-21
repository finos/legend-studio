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

import { resolve } from 'path';
import chalk from 'chalk';
import { getChangedPackagesSinceRef } from '@changesets/git';
import getReleasePlan from '@changesets/get-release-plan';
import { error, warn, info, log } from '@changesets/logger';
import { getPackages } from '@manypkg/get-packages';
import { read } from '@changesets/config';
import writeChangeset from '@changesets/write';

/**
 * Ref `master` does not seem to be available in github-actions pipeline when using with action/checkout
 * So we have to use `origin/master`
 *
 * See https://github.com/atlassian/changesets/issues/517
 */
const DEFAULT_SINCE_REF = 'origin/master';

/**
 * Make sure the changeset covers all the packages whose files are changed since the specified reference.
 * This is good to check changesets in a PR to ensure that the contributors have at least did a `patch`
 * bump for all the changes they made.
 *
 * This is different from the philosophy of the creator of `changesets` where the reviewers and the contributors
 * make `human` decision about the changes and that we can `trust` this decision. The problem with this
 * approach is that sometimes, both the reviewers and the contributors can miss out on the changeset.
 * And a package which is supposed to be released was not released! - This is really bad.
 *
 * By using this check, for whatever changes made, at least a `patch` bump is required. This covers the base
 * for any PR.
 */
export async function validateChangesets(cwd, sinceRef) {
  const packages = await getPackages(cwd);
  const config = await read(cwd, packages);
  const sinceBranch = sinceRef ?? DEFAULT_SINCE_REF;
  const changesetPackageNames = (
    await getReleasePlan.default(cwd, sinceBranch, config)
  ).releases
    // packages whose versions are bumped because they depend on a package
    // whose version is explicitly bumped is not of our concern
    .filter((pkg) => pkg.changesets.length)
    .map((pkg) => pkg.name);
  const changedPackageNames = (
    await getChangedPackagesSinceRef({
      cwd,
      ref: sinceBranch || config.baseBranch,
    })
  ).map((pkg) => pkg.packageJson.name);

  // Check for packages that have been modified but does not have a changeset entry
  const packagesWithoutChangeset = new Set();
  changedPackageNames.forEach((pkg) => {
    if (!changesetPackageNames.includes(pkg)) {
      packagesWithoutChangeset.add(pkg);
    }
  });
  if (packagesWithoutChangeset.size) {
    error(
      `Found ${
        packagesWithoutChangeset.size
      } package(s) that have been changed but no changesets for them were found:\n${Array.from(
        packagesWithoutChangeset.values(),
      )
        .map((pkg) => `\u2A2F ${pkg}`)
        .join('\n')}`,
    );
    error(
      `Run \`yarn changeset "e.g. some message ..."\` to quickly add a changeset.`,
    );
    process.exit(1);
  }

  // Check for packages that have not been modified but still has a changeset entry
  const extraPackages = new Set(); // packages that don't need changesets but specified
  changesetPackageNames.forEach((pkg) => {
    if (!changedPackageNames.includes(pkg)) {
      extraPackages.add(pkg);
    }
  });
  if (extraPackages.size) {
    warn(
      `Found ${
        extraPackages.size
      } package(s) with changesets but have not been modified:\n${Array.from(
        extraPackages.values(),
      )
        .map((pkg) => `- ${pkg}`)
        .join('\n')}`,
    );
    warn(`Please make sure this is what you wanted!`);
  } else {
    log(
      chalk.green(`All changed packages have been listed in the changesets!`),
    );
  }
}

export async function generateChangeset(cwd, message, sinceRef) {
  const packages = await getPackages(cwd);
  const config = await read(cwd, packages);
  const sinceBranch = sinceRef ?? DEFAULT_SINCE_REF;
  const changedPackages = new Set(
    (
      await getChangedPackagesSinceRef({
        cwd,
        ref: sinceBranch || config.baseBranch,
      })
    ).map((pkg) => pkg.packageJson.name),
  );
  if (!changedPackages.size) {
    info(chalk.blue(`No changeset is needed as you haven't made any changes!`));
  }
  const newChangeset = {
    releases: Array.from(changedPackages.values()).map((pkg) => ({
      name: pkg,
      type: 'patch',
    })),
    summary: message,
  };
  const changesetID = await writeChangeset.default(newChangeset, cwd);
  log(
    chalk.green(
      'Sucessfully generated changeset! If you want to modify or expand on the changeset summary, you can find it here:',
    ),
  );
  info(chalk.blue(resolve(resolve(cwd, '.changeset'), `${changesetID}.md`)));
}
