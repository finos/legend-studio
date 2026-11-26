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

import { loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import micromatch from 'micromatch';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');

export const STANDARD_RELEASE_VERSION_BUMP_CHANGESET_SHORT_PATH =
  '.changeset/new-version.md';
export const ITERATION_RELEASE_VERSION_BUMP_CHANGESET_SHORT_PATH =
  '.changeset/new-iteration.md';

const CHANGESET_DIR = resolve(__dirname, '../../.changeset');
const CHANGESET_CONFIG_PATH = resolve(CHANGESET_DIR, 'config.json');
const STANDARD_RELEASE_VERSION_BUMP_CHANGESET_PATH = resolve(
  __dirname,
  `../../${STANDARD_RELEASE_VERSION_BUMP_CHANGESET_SHORT_PATH}`,
);
const ITERATION_RELEASE_VERSION_BUMP_CHANGESET_PATH = resolve(
  __dirname,
  `../../${ITERATION_RELEASE_VERSION_BUMP_CHANGESET_SHORT_PATH}`,
);

/**
 * Changesets's `fixed` mode should guarantee that we do not miss any application packages
 * when we bump version as long as they follow the right patterns.
 *
 * In fact, creating a simple changeset with just a single package like `@finos/legend-application-studio-bootstrap`
 * is sufficient and listing out ALL packages in the changeset is overkill, but we do this anyway
 * for completeness sake.
 */
export const getPackagesToBumpVersion = () => {
  const changesetConfig = loadJSON(CHANGESET_CONFIG_PATH);
  const patterns = changesetConfig.fixed[0];
  // NOTE: changeset's config structure could change so we would like to do some validation
  if (!Array.isArray(patterns) || patterns.length === 0) {
    console.log(
      chalk.red(
        `Can't find the list of application deployment packages to bump versions for! Make sure to check changeset config file '.changeset/config.json'`,
      ),
    );
    process.exit(1);
  }

  return micromatch(
    execSync('yarn workspaces list --json', {
      encoding: 'utf-8',
      cwd: ROOT_DIR,
    })
      .split('\n')
      .filter(Boolean)
      .map((text) => JSON.parse(text).name),
    patterns,
  );
};

export const generateVersionBumpChangeset = (packagesToBump, bumpType) => {
  if (!bumpType) {
    console.log(
      chalk.red(
        `Release version bump type is required (choose between 'major' and 'minor').`,
      ),
    );
    process.exit(1);
  } else if (!['major', 'minor'].includes(bumpType)) {
    console.log(
      chalk.red(
        `Unsupported release version bump type '${bumpType}', please choose between 'major' and 'minor'.`,
      ),
    );
    process.exit(1);
  }

  return {
    path:
      bumpType === 'major'
        ? STANDARD_RELEASE_VERSION_BUMP_CHANGESET_PATH
        : ITERATION_RELEASE_VERSION_BUMP_CHANGESET_PATH,
    content: [
      '---',
      ...packagesToBump.map((line) => `  '${line}': ${bumpType}`),
      '---',
      '',
    ].join('\n'),
  };
};

// ---------------------------------- Patch releases ----------------------------------
// See https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md#patch-releases

export const DEFAULT_BRANCH_NAME = 'master';

/**
 * Patch releases are published as prereleases, e.g. `13.281.1-patch.0`, so that
 * the libraries they carry never collide with versions the default branch
 * has already published, and so they are published under this NPM dist-tag
 * instead of `latest`.
 */
export const PATCH_RELEASE_PRE_TAG = 'patch';

export const getReleaseBranchName = (releaseVersion) =>
  `release/${releaseVersion}`;

/**
 * Returns changesets' prerelease state (`.changeset/pre.json`), or `undefined`
 * when not in prerelease mode.
 */
export const getPreReleaseState = (cwd = ROOT_DIR) => {
  const preStatePath = resolve(cwd, '.changeset/pre.json');
  return existsSync(preStatePath) ? loadJSON(preStatePath) : undefined;
};

/**
 * Returns the releases in the plan whose changesets ask for more than a `patch` bump.
 * Packages bumped only because a dependency was bumped are not counted.
 */
export const getNonPatchReleases = (releases) =>
  releases.filter(
    (release) => release.changesets.length && release.type !== 'patch',
  );
