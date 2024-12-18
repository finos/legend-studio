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
import micromatch from 'micromatch';
import { getChangedPackagesSinceRef } from '@changesets/git';
import readChangesets from '@changesets/read';
import getReleasePlan from '@changesets/get-release-plan';
import { error, warn, info, log } from '@changesets/logger';
import { read } from '@changesets/config';
import writeChangeset from '@changesets/write';
import { getPackages } from '@manypkg/get-packages';

/**
 * Ref `master` does not seem to be available in github-actions pipeline when using with action/checkout
 * So we have to use `origin/master`
 *
 * See https://github.com/atlassian/changesets/issues/517
 */
const DEFAULT_SINCE_REF = 'origin/master';

function isListablePackage(config, pkg) {
  // like the `add` command in `changeset`, we don't consider
  //  1. ignored packages
  //  2. private packages without a version
  // See https://github.com/changesets/changesets/blob/main/packages/cli/src/commands/add/index.ts
  return (
    !micromatch.isMatch(pkg.packageJson.name, config.ignore) &&
    (pkg.packageJson.version || !pkg.packageJson.private)
  );
}

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
  const config = await read(cwd);
  const sinceBranch = sinceRef ?? DEFAULT_SINCE_REF;
  const changesetPackageNames = (
    await getReleasePlan(cwd, sinceBranch, config)
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
  )
    .filter((pkg) => isListablePackage(config, pkg))
    .map((pkg) => pkg.packageJson.name);

  // Check for packages listed in changeset(s) but no longer exists
  // This is useful in case the current PR deletes some packages
  // making some changesets invalid and can potentially break the release
  const packages = await getPackages(cwd);
  const knownPackages = packages.packages.map((pkg) => pkg.packageJson.name);
  const unknownPackagesIndex = new Map();
  const allExistingChangesets = await readChangesets(cwd);
  allExistingChangesets.forEach((changeset) => {
    const unknownPackages = new Set();
    changeset.releases.forEach((release) => {
      if (!knownPackages.includes(release.name)) {
        unknownPackages.add(release.name);
      }
    });
    if (unknownPackages.size) {
      unknownPackagesIndex.set(changeset.id, unknownPackages);
    }
  });

  if (unknownPackagesIndex.size) {
    unknownPackagesIndex.forEach((unknownPackages, changesetId) => {
      error(
        `Found ${
          unknownPackages.size
        } package(s) specified in changeset '${changesetId}' but do not exist in the project:\n${Array.from(
          unknownPackages.values(),
        )
          .map((pkg) => `\u2A2F ${pkg}`)
          .join('\n')}`,
      );
    });
    error(
      `Your changeset(s) are probably outdated: please update them and remove the missing packages. To generate changesets properly, please make sure to keep your fork up-to-date.`,
    );
    process.exit(1);
  }

  // Check for packages that have been modified but does not have a changeset entry
  const packagesWithoutChangeset = new Set();
  changedPackageNames.forEach((pkgName) => {
    if (!changesetPackageNames.includes(pkgName)) {
      packagesWithoutChangeset.add(pkgName);
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
      `Run \`yarn changeset -v <VERSION> -m "e.g. some message ..."\` to quickly add a changeset. ` +
        `'<VERSION>' stands for the release branch you are working off or you can use 'latest' if you are working off the default branch`,
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
  const config = await read(cwd);
  const sinceBranch = sinceRef ?? DEFAULT_SINCE_REF;
  const changedPackages = new Set(
    (
      await getChangedPackagesSinceRef({
        cwd,
        ref: sinceBranch || config.baseBranch,
      })
    )
      .filter((pkg) => isListablePackage(config, pkg))
      .map((pkg) => pkg.packageJson.name),
  );
  if (!changedPackages.size) {
    info(chalk.blue(`No changeset is needed as you haven't made any changes!`));
  }
  const newChangeset = {
    releases: Array.from(changedPackages.values()).map((pkgName) => ({
      name: pkgName,
      type: 'patch',
    })),
    summary: message,
  };
  const changesetID = await writeChangeset(newChangeset, cwd);
  log(
    chalk.green(
      'Successfully generated changeset! If you want to modify or expand on the changeset summary, you can find it here:',
    ),
  );
  info(chalk.blue(resolve(resolve(cwd, '.changeset'), `${changesetID}.md`)));
}

export async function generateUptickChangeset(cwd) {
  const config = await read(cwd);
  const packages = await getPackages(cwd);
  const allPublishablePackages = packages.packages
    .filter((pkg) => isListablePackage(config, pkg))
    .map((pkg) => pkg.packageJson.name);
  const newChangeset = {
    releases: allPublishablePackages.map((pkgName) => ({
      name: pkgName,
      type: 'patch',
    })),
    summary: '',
  };
  const changesetID = await writeChangeset(newChangeset, cwd);
  log(
    chalk.green(
      'Successfully generated version uptick changeset! If you want to modify or expand on the changeset summary, you can find it here:',
    ),
  );
  info(chalk.blue(resolve(resolve(cwd, '.changeset'), `${changesetID}.md`)));
}

export async function getNextReleasePlan(cwd) {
  const config = await read(cwd);
  const releasePlan = await getReleasePlan(cwd, undefined, config);
  return releasePlan.releases;
}
