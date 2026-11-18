/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import * as github from '@actions/github';
import * as githubActionCore from '@actions/core';
import { getNextReleasePlan } from '@finos/legend-dev-utils/ChangesetUtils';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import semver from 'semver';
import {
  DEFAULT_BRANCH_NAME,
  PATCH_RELEASE_PRE_TAG,
  getNonPatchReleases,
  getPreReleaseState,
  getReleaseBranchName,
} from './releaseVersionUtils.js';

/**
 * Prepares a patch release of a past release: creates the release branch from
 * that release's commit when needed, enters changesets' prerelease mode,
 * cherry-picks the given fix commits from the default branch and opens a PR
 * into the release branch. Merging that PR lets the release workflow open the
 * `Patch Release` PR.
 *
 * Following is the list of expected environment variables:
 *
 * RELEASE_VERSION - the release to patch, e.g. `13.281.0`
 * COMMITS - the default branch commits to cherry-pick, separated by spaces or commas, oldest first
 * MAIN_PACKAGE - the package whose version is the release version
 * GITHUB_TOKEN - the Github token (not needed for a dry run)
 * DRY_RUN - when `true`, do everything locally: no branch is pushed and no PR is opened
 *
 * See https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md#patch-releases
 */

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const REMOTE = 'origin';
const RELEASE_COMMIT_MESSAGE = 'chore: bump versions and release';
const BOT_GIT_IDENTITY = [
  '-c user.name="github-actions[bot]"',
  '-c user.email="41898283+github-actions[bot]@users.noreply.github.com"',
].join(' ');

const MANUAL_STEPS_HINT = `Prepare the patch release by hand instead: see https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md#patch-releases`;

const fail = (message) => {
  githubActionCore.error(message);
  process.exit(1);
};

const run = (command) =>
  execSync(command, {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const tryRun = (command) => {
  try {
    return run(command);
  } catch {
    return undefined;
  }
};

const git = (args) => run(`git ${BOT_GIT_IDENTITY} ${args}`);

const getMainPackageLocation = (mainPackageName) => {
  const location = run('yarn workspaces list --json')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((workspace) => workspace.name === mainPackageName)?.location;
  if (!location) {
    fail(`Can't find workspace for main package '${mainPackageName}'`);
  }
  return location;
};

/**
 * Finds the commit a release was published from: its tag `v<version>` when
 * there is one, else the release commit on the default branch whose main
 * package has that version (releases made before every release got a tag).
 */
const findReleaseCommit = (releaseVersion, mainPackageLocation) => {
  const taggedCommit = tryRun(
    `git rev-parse -q --verify "refs/tags/v${releaseVersion}^{commit}"`,
  );
  if (taggedCommit) {
    return taggedCommit;
  }
  const releaseCommits = run(
    `git log ${REMOTE}/${DEFAULT_BRANCH_NAME} --format=%H --fixed-strings --grep="${RELEASE_COMMIT_MESSAGE}"`,
  )
    .split('\n')
    .filter(Boolean);
  for (const commit of releaseCommits) {
    const content = tryRun(
      `git show ${commit}:${mainPackageLocation}/package.json`,
    );
    const version = content ? JSON.parse(content).version : undefined;
    if (version === releaseVersion) {
      return commit;
    }
    // release commits are listed newest first
    if (
      version &&
      semver.valid(version) &&
      semver.lt(version, releaseVersion)
    ) {
      break;
    }
  }
  return undefined;
};

const preparePatchRelease = async () => {
  const releaseVersion = process.env.RELEASE_VERSION?.trim();
  const mainPackageName = process.env.MAIN_PACKAGE;
  const isDryRun = process.env.DRY_RUN === 'true';
  const commits = (process.env.COMMITS ?? '').split(/[\s,]+/).filter(Boolean);

  // --------------------------- 1. Check the inputs ---------------------------
  if (
    !releaseVersion ||
    !semver.valid(releaseVersion) ||
    semver.prerelease(releaseVersion) ||
    semver.patch(releaseVersion) !== 0
  ) {
    fail(
      `Release version must be a published release such as '13.281.0', got '${releaseVersion}'. To patch a patch release, give the release it patches.`,
    );
  }
  if (!commits.length) {
    fail(`Give at least one commit to cherry-pick`);
  }
  const fixCommits = commits.map((commit) => {
    if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
      fail(`'${commit}' is not a commit SHA`);
    }
    const sha = tryRun(`git rev-parse -q --verify "${commit}^{commit}"`);
    if (!sha) {
      fail(`Can't find commit '${commit}'`);
    }
    // a fix must land on the default branch first, so nothing ever needs to be merged back
    if (
      tryRun(
        `git merge-base --is-ancestor ${sha} ${REMOTE}/${DEFAULT_BRANCH_NAME} && echo yes`,
      ) !== 'yes'
    ) {
      fail(
        `Commit '${commit}' is not on '${DEFAULT_BRANCH_NAME}'. Merge the fix into '${DEFAULT_BRANCH_NAME}' first.`,
      );
    }
    return sha;
  });

  // --------------------------- 2. Find or create the release branch ---------------------------
  const releaseBranch = getReleaseBranchName(releaseVersion);
  const hasReleaseBranch = Boolean(
    tryRun(`git ls-remote --exit-code --heads ${REMOTE} ${releaseBranch}`),
  );
  let releaseBranchRef = `${REMOTE}/${releaseBranch}`;
  if (hasReleaseBranch) {
    run(
      `git fetch ${REMOTE} ${releaseBranch}:refs/remotes/${releaseBranchRef}`,
    );
    console.log(`Using existing release branch '${releaseBranch}'`);
  } else {
    const releaseCommit = findReleaseCommit(
      releaseVersion,
      getMainPackageLocation(mainPackageName),
    );
    if (!releaseCommit) {
      fail(
        `Can't find release v${releaseVersion}: no tag 'v${releaseVersion}' and no '${RELEASE_COMMIT_MESSAGE}' commit on '${DEFAULT_BRANCH_NAME}' with that version`,
      );
    }
    if (isDryRun) {
      releaseBranchRef = releaseCommit;
      console.log(
        `(dry run) Would create release branch '${releaseBranch}' from ${releaseCommit}`,
      );
    } else {
      // NOTE: create the branch the way the release workflow creates `release/x.0.0` branches
      // See ./concludeNewRelease.js
      try {
        await github.getOctokit(process.env.GITHUB_TOKEN).rest.git.createRef({
          ref: `refs/heads/${releaseBranch}`,
          sha: releaseCommit,
          ...github.context.repo,
        });
      } catch (error) {
        fail(
          `Failed to create release branch '${releaseBranch}' from ${releaseCommit}. Error:\n${error.message}\n${MANUAL_STEPS_HINT}`,
        );
      }
      run(
        `git fetch ${REMOTE} ${releaseBranch}:refs/remotes/${releaseBranchRef}`,
      );
      console.log(
        chalk.green(
          `✓ Created release branch '${releaseBranch}' from ${releaseCommit}`,
        ),
      );
    }
  }

  // --------------------------- 3. Enter prerelease mode and cherry-pick the fixes ---------------------------
  const workBranch = `bot/patch-release/${releaseVersion}-${
    process.env.GITHUB_RUN_ID ?? Date.now()
  }`;
  run(`git checkout -B ${workBranch} ${releaseBranchRef}`);

  const preState = getPreReleaseState(ROOT_DIR);
  if (!preState) {
    run(
      `node node_modules/@changesets/cli/bin.js pre enter ${PATCH_RELEASE_PRE_TAG}`,
    );
    git(
      `add .changeset/pre.json && git ${BOT_GIT_IDENTITY} commit -m "chore: enter prerelease mode for patch releases of v${releaseVersion}"`,
    );
    console.log(
      chalk.green(`✓ Entered prerelease mode '${PATCH_RELEASE_PRE_TAG}'`),
    );
  } else if (
    preState.mode !== 'pre' ||
    preState.tag !== PATCH_RELEASE_PRE_TAG
  ) {
    fail(
      `Release branch '${releaseBranch}' is in prerelease state '${preState.mode}' with tag '${preState.tag}', expected mode 'pre' with tag '${PATCH_RELEASE_PRE_TAG}'`,
    );
  }

  for (const sha of fixCommits) {
    try {
      git(`cherry-pick -x ${sha}`);
      console.log(
        chalk.green(
          `✓ Cherry-picked ${run(`git log -1 --format="%h %s" ${sha}`)}`,
        ),
      );
    } catch (error) {
      tryRun('git cherry-pick --abort');
      fail(
        `Can't cherry-pick ${sha} onto '${releaseBranch}' cleanly:\n${error.stderr ?? error.message}\n${MANUAL_STEPS_HINT}`,
      );
    }
  }

  // --------------------------- 4. Check the release plan ---------------------------
  const releases = await getNextReleasePlan(ROOT_DIR);
  const nonPatchReleases = getNonPatchReleases(releases);
  if (nonPatchReleases.length) {
    fail(
      `A patch release only takes 'patch' changesets, but these packages ask for more:\n${nonPatchReleases
        .map((release) => `- ${release.name}: ${release.type}`)
        .join(
          '\n',
        )}\nChange those changesets to 'patch' in a PR into '${DEFAULT_BRANCH_NAME}' first, or cherry-pick by hand.`,
    );
  }
  const mainPackageRelease = releases.find(
    (release) => release.name === mainPackageName,
  );
  if (!mainPackageRelease) {
    fail(
      `The cherry-picked commits carry no changeset, so there is nothing to release. Add a 'patch' changeset to the fix on '${DEFAULT_BRANCH_NAME}'.`,
    );
  }
  console.log(
    chalk.green(
      `✓ Next release on '${releaseBranch}': v${mainPackageRelease.newVersion}`,
    ),
  );

  // --------------------------- 5. Open the PR into the release branch ---------------------------
  const commitList = fixCommits
    .map((sha) => `- ${run(`git log -1 --format="%h %s" ${sha}`)}`)
    .join('\n');
  const title = `Prepare Patch Release v${mainPackageRelease.newVersion}`;
  const body = [
    `Cherry-picks these fixes from \`${DEFAULT_BRANCH_NAME}\` onto \`${releaseBranch}\`:`,
    '',
    commitList,
    '',
    `Merging this lets the release workflow open the **Patch Release v${mainPackageRelease.newVersion}** PR. Learn more about this process [here](https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md#patch-releases).`,
  ].join('\n');
  if (isDryRun) {
    console.log(
      `(dry run) Would push '${workBranch}' and open PR '${title}' into '${releaseBranch}':\n${body}`,
    );
    return;
  }
  try {
    git(`push ${REMOTE} HEAD:refs/heads/${workBranch}`);
  } catch (error) {
    fail(
      `Failed to push '${workBranch}'. Error:\n${error.stderr ?? error.message}\n${MANUAL_STEPS_HINT}`,
    );
  }
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const pullRequest = (
    await octokit.rest.pulls.create({
      title,
      head: workBranch,
      base: releaseBranch,
      body,
      ...github.context.repo,
    })
  ).data;
  console.log(chalk.green(`✓ Opened ${pullRequest.html_url}`));
};

preparePatchRelease().catch((error) => fail(error.message));
