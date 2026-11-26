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
import {
  DEFAULT_BRANCH_NAME,
  PATCH_RELEASE_PRE_TAG,
  getNonPatchReleases,
  getPreReleaseState,
} from './releaseVersionUtils.js';

const fail = (message) => {
  githubActionCore.error(
    `${message}\nLearn more about the release process at https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md`,
  );
  process.exit(1);
};

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
    const preState = getPreReleaseState(cwd);
    if (isDefaultBranch) {
      // prerelease mode is only for patch releases, made on release branches
      if (preState) {
        fail(
          `Can't create new release PR title: '.changeset/pre.json' found on default branch. Run 'yarn changeset:cli pre exit' and remove it.`,
        );
      }
    } else {
      // patch releases are prereleases (e.g. 13.281.1-patch.0), so they never publish over
      // library versions the default branch already published, and never move the `latest` NPM dist-tag
      if (preState?.mode !== 'pre' || preState.tag !== PATCH_RELEASE_PRE_TAG) {
        fail(
          `Can't create new release PR title: a release branch must be in prerelease mode '${PATCH_RELEASE_PRE_TAG}'. Prepare patch releases with the '(Manual) Prepare Patch Release' workflow.`,
        );
      }
      const nonPatchReleases = getNonPatchReleases(releases);
      if (nonPatchReleases.length) {
        fail(
          `Can't create new release PR title: a patch release only takes 'patch' changesets, but these packages ask for more: ${nonPatchReleases
            .map((release) => `${release.name} (${release.type})`)
            .join(', ')}`,
        );
      }
    }
    switch (mainPackageVersionBumpInfo.type) {
      case 'major': {
        // only allow `major` bump on default branch
        if (isDefaultBranch) {
          title = `Release v${mainPackageVersionBumpInfo.newVersion}`;
        } else {
          fail(
            `Can't create new release PR title: 'major' version bump should present on default branch.`,
          );
        }
        break;
      }
      case 'minor': {
        // only allow `minor` bump on default branch
        if (isDefaultBranch) {
          title = `Iteration Release v${mainPackageVersionBumpInfo.newVersion}`;
        } else {
          fail(
            `Can't create new release PR title: 'minor' version bump should present on default branch.`,
          );
        }
        break;
      }
      case 'patch': {
        // only allow `patch` bump on release branches
        if (!isDefaultBranch) {
          title = `Patch Release v${mainPackageVersionBumpInfo.newVersion}`;
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
        fail(
          `Can't create new release PR title: unsupported version bump type '${mainPackageVersionBumpInfo.type}'`,
        );
      }
    }
  }

  console.log(`Generated new release PR title: '${title}'`);
  githubActionCore.setOutput('title', title);
}

getReleaseVersionBumpInfo(process.cwd());
