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

import * as github from '@actions/github';
import * as githubActionCore from '@actions/core';
import chalk from 'chalk';
import semver from 'semver';

/**
 * Following is the list of expected environment variables:
 *
 * GITHUB_TOKEN - the Github token
 * PUBLISH_PACKAGES - the list of published packages (with name and version) output by `changesets/action`
 * MAIN_PACKAGE - the name of the package within the list of published packages. If this is available,
 *                a new version tag and its release will be published to Github.
 *
 * This also includes a few other extra steps we do to conclude a release:
 * 1. Create a tag for the release and publish a Github release for that tag
 * 2. Create the release branch for the latest release tag
 * 3. Create a new release milestone and move over open issues in the current milestone and close the current milestone.
 * See https://github.com/finos/legend-studio/blob/master/docs/workflow/release-process.md
 */
const concludeNewRelease = async () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  const publishedPackages = JSON.parse(process.env.PUBLISHED_PACKAGES);
  const mainPackageName = process.env.MAIN_PACKAGE;
  const currentReleaseVersion = publishedPackages.find(
    (pkg) => pkg.name === mainPackageName,
  )?.version;

  console.log(
    `Removing Github releases and tags created by changesets/action...`,
  );
  const tagsToCleanup = publishedPackages.map(
    (pkg) => `${pkg.name}@${pkg.version}`,
  );
  const tagsNotRemoved = [];
  await Promise.all(
    tagsToCleanup.map(async (tag) => {
      try {
        // Delete the tags pushed by `changesets/action`
        // Workaround until we can use `pushGitTags` tags to turn off pushing Git tags
        // See https://github.com/changesets/action/pull/143
        let tagRef;
        try {
          tagRef = (
            await octokit.rest.git.getRef({
              ref: `tags/${tag}`,
              ...github.context.repo,
            })
          ).data;
        } catch {
          tagRef = undefined;
        }
        if (tagRef) {
          await octokit.rest.git.deleteRef({
            ref: `tags/${tag}`,
            ...github.context.repo,
          });
        }

        console.log(`\u2713 Removed release and tag ${tag}`);
      } catch (error) {
        tagsNotRemoved.push(tag);
        console.log(
          `\u2A2F Can't remove release and tag ${tag}. Error:\n${error.message}`,
        );
      }
    }),
  );
  if (tagsNotRemoved.length) {
    githubActionCore.error(
      `The following tags and/or their respective releases are not removed from Github. Please manually remove them on Github:\n${tagsNotRemoved
        .map((tag) => `- ${tag}`)
        .join('\n')}`,
    );
  }

  /**
   * NOTE: only run this if the release version is a major bump, i.e. a standard release
   * This kicks off a sequence of post-release operations:
   * - Create a tag for the release and a Github release for that tag
   * - Create the release branch for the latest release tag
   * - Create a new release milestone and move over open issues in the current milestone and close the current milestone.
   */
  if (
    currentReleaseVersion &&
    semver.minor(currentReleaseVersion) === 0 &&
    semver.patch(currentReleaseVersion) === 0
  ) {
    const nextReleaseVersion = semver.inc(currentReleaseVersion, 'major');

    // --------------------------- 1. Create Github release and tag for the release ---------------------------
    console.log(
      `Creating release tag v${currentReleaseVersion} and Github release...`,
    );
    try {
      await octokit.rest.repos.createRelease({
        tag_name: `v${currentReleaseVersion}`,
        name: `Version ${currentReleaseVersion}`,
        body: `👋  _We are crafting a release note for this version..._\n> Meanwhile, please refer to the release pull request for a summary of code changes.`,
        ...github.context.repo,
      });
      console.log(
        chalk.green(
          `\u2713 Created release for tag v${currentReleaseVersion}. Please add release note for this on Github.`,
        ),
      );
    } catch {
      githubActionCore.error(
        `Failed to create release with tag v${currentReleaseVersion}. Please manually create this release tag on Github.`,
      );
    }

    //  --------------------------- 2. Create release branch for the latest release from the release tag ---------------------------
    console.log(
      `Creating release branch for release v${currentReleaseVersion}...`,
    );
    try {
      const latestVersionTag = await octokit.rest.git.getRef({
        ref: `tags/v${currentReleaseVersion}`,
        ...github.context.repo,
      });
      try {
        await octokit.rest.git.createRef({
          ref: `refs/heads/release/${currentReleaseVersion}`,
          sha: latestVersionTag.data.object.sha,
          ...github.context.repo,
        });
        console.log(
          chalk.green(
            `\u2713 Created release branch 'release/${currentReleaseVersion}'`,
          ),
        );
      } catch {
        githubActionCore.warning(
          `(skipped) Release branch 'release/${currentReleaseVersion}' already existed`,
        );
      }
    } catch {
      githubActionCore.error(
        `Release tag 'v${currentReleaseVersion}' has not been created. Please make sure to manually create tag 'v${currentReleaseVersion}' and the release branch 'release/${currentReleaseVersion}' from that tag.`,
      );
    }

    //  --------------------------- 3. Prepare Github milestone for the next release ---------------------------
    console.log(
      `Preparing milestone for next release version v${nextReleaseVersion}...`,
    );
    try {
      // Search for the milestone of the latest release
      // NOTE: here we make the assumption that there are not a lot of open milestones at the same time
      // else we would need to adjust the paging in order to be able to find that milestone
      // See https://docs.github.com/en/rest/reference/issues#list-milestones
      const openMilestones = (
        await octokit.rest.issues.listMilestones({
          state: 'open',
          ...github.context.repo,
        })
      ).data;
      const latestReleaseMilestone = openMilestones.find(
        (milestone) => milestone.title === currentReleaseVersion,
      );
      if (latestReleaseMilestone) {
        let newReleaseMilestone = openMilestones.find(
          (milestone) => milestone.title === nextReleaseVersion,
        );
        if (!newReleaseMilestone) {
          // create new release milestone if not already existed
          newReleaseMilestone = (
            await octokit.rest.issues.createMilestone({
              title: nextReleaseVersion,
              ...github.context.repo,
            })
          ).data;
          console.log(
            chalk.green(
              `\u2713 Created milestone for next release version v${nextReleaseVersion}`,
            ),
          );
        }
        // retrieve all open issues from latest release milestone
        const MILESTONE_ISSUES_PAGE_SIZE = 100;
        const milestoneOpenIssuesNumber = latestReleaseMilestone.open_issues;
        const numberOfPages = Math.ceil(
          milestoneOpenIssuesNumber / MILESTONE_ISSUES_PAGE_SIZE,
        );
        const pages = new Array(numberOfPages)
          .fill(1)
          .map((num, idx) => num + idx);
        const openIssues = (
          await Promise.all(
            pages.map((page) =>
              octokit.rest.issues.listForRepo({
                state: 'open',
                per_page: MILESTONE_ISSUES_PAGE_SIZE,
                milestone: latestReleaseMilestone.number,
                page: page,
                ...github.context.repo,
              }),
            ),
          )
        )
          .map((response) => response.data)
          .flat();
        console.log(
          chalk.green(
            `\u2713 Retrieved open issues in milestone ${currentReleaseVersion}`,
          ),
        );

        // move all open issues to new milestone
        // NOTE: since this is a PATCH end point, we should not
        // make concurrent calls using `Promise.all` as the milestone can
        // end up in a strange state, where issues are moved, but the
        // `open_issues` statistics is inaccurate
        for (const issue of openIssues) {
          await octokit.rest.issues.update({
            issue_number: issue.number,
            milestone: newReleaseMilestone.number,
            ...github.context.repo,
          });
        }
        console.log(
          chalk.green(
            `\u2713 Moved ${openIssues.length} open issue(s) to milestone ${newReleaseMilestone.title}`,
          ),
        );

        // close the latest release milestone
        await octokit.rest.issues.updateMilestone({
          milestone_number: latestReleaseMilestone.number,
          state: 'closed',
          ...github.context.repo,
        });
        console.log(
          chalk.green(`\u2713 Closed milestone ${currentReleaseVersion}`),
        );
      } else {
        githubActionCore.warning(
          `(skipped) Can't find milestone for the latest release version '${currentReleaseVersion}'`,
        );
      }
    } catch (error) {
      githubActionCore.error(
        `Failed to prepare next release milestone. Error:\n${error.message}\nPlease manually prepare next release milestone and close the current release milestone`,
      );
    }
  }
};

concludeNewRelease();
