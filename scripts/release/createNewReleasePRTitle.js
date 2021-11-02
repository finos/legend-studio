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

import * as githubActionCore from '@actions/core';
import { getNextReleasePlan } from '@finos/legend-dev-utils/ChangesetUtils';

const DEFAULT_BRANCH_NAME = 'master';

/**
 * This method reads the current release plan from the changesets
 * and generate the `New Release` PR title according to the release process.
 *
 * See https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md
 * See https://github.com/changesets/action
 */
export async function getReleaseVersionBumpInfo(cwd) {
  const releases = await getNextReleasePlan(cwd);
  const mainPackageName = process.env.MAIN_PACKAGE;
  const isDefaultBranch =
    process.env.GITHUB_REF === `refs/heads/${DEFAULT_BRANCH_NAME}`;

  const mainPackageVersionBumpInfo = releases.find(
    (release) => release.name === mainPackageName,
  );

  // a scary WIP title to avoid accidental releases
  let title =
    'WIP: New Release (do not merge - version bump is not yet setup properly)';

  /**
   * NOTE: if we cannot find the main package version bump info in the release plan,
   * this usually mean we just released and therefore, the new release PR
   * should never really show up; hence, we give it the PR a work-in-progress title
   */
  if (mainPackageVersionBumpInfo) {
    switch (mainPackageVersionBumpInfo.type) {
      case 'major': {
        // only allow `major` bump on default branch
        if (isDefaultBranch) {
          title = `Release v${mainPackageVersionBumpInfo.newVersion}`;
        } else {
          githubActionCore.error(
            `Can't create new release PR title: 'major' version bump should present on default branch.\nLearn more about the release process at https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md`,
          );
          process.exit(1);
        }
        break;
      }
      case 'minor': {
        // only allow `minor` bump on default branch
        if (isDefaultBranch) {
          title = `Iteration Release v${mainPackageVersionBumpInfo.newVersion}`;
        } else {
          githubActionCore.error(
            `Can't create new release PR title: 'minor' version bump should present on default branch.\nLearn more about the release process at https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md`,
          );
          process.exit(1);
        }
        break;
      }
      case 'patch': {
        // only allow `patch` bump on release branches
        if (!isDefaultBranch) {
          title = `Recovery Release v${mainPackageVersionBumpInfo.newVersion}`;
        } else {
          // NOTE: only warn here as earlier on in a new development cycle
          // the new release changeset might not have been pushed, so on the default branch
          // the main package properly only has `patch` bump
          // as such, the title would be a `work-in-progress` title
          githubActionCore.warning(
            `Found 'patch' version bump on default branch. Make sure to push proper new release version bump changeset.\nLearn more about the release process at https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md`,
          );
        }
        break;
      }
      default: {
        githubActionCore.error(
          `Can't create new release PR title: unsupported version bump type '${mainPackageVersionBumpInfo.type}'`,
        );
        process.exit(1);
      }
    }
  }

  console.log(`Generated new release PR title: '${title}'`);
  githubActionCore.setOutput('title', title);
}

getReleaseVersionBumpInfo(process.cwd());
