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
import chalk from 'chalk';
import semver from 'semver';
import { resolve } from 'path';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';

const applicationWorkspaceDir = process.env.APPLICATION_WORKSPACE_DIR;
const bumpType = process.env.BUMP_TYPE;

if (!['major', 'minor'].includes(bumpType)) {
  console.log(
    chalk.red(
      `Unsupported release version bump type '${bumpType}', please choose between 'major' and 'minor'.`,
    ),
  );
  process.exit(1);
}

const packageJson = loadJSON(resolve(applicationWorkspaceDir, 'package.json'));
const latestReleaseVersion = packageJson.version;

if (!latestReleaseVersion || !semver.valid(latestReleaseVersion)) {
  console.log(
    chalk.red(
      `Could not extract the latest application version properly. Got '${latestReleaseVersion}'`,
    ),
  );
  process.exit(1);
}

const nextReleaseVersion = semver.inc(latestReleaseVersion, bumpType);

const prepareNewRelease = async () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  // Create release branch for the latest release from the release tag
  console.log(
    `Creating release branch for release v${latestReleaseVersion}...`,
  );
  try {
    const latestVersionTag = await octokit.rest.git.getRef({
      ref: `tags/v${latestReleaseVersion}`,
      ...github.context.repo,
    });
    try {
      await octokit.rest.git.createRef({
        ref: `refs/heads/release/${latestReleaseVersion}`,
        sha: latestVersionTag.data.object.sha,
        ...github.context.repo,
      });
    } catch {
      console.log(
        chalk.yellow(
          `Release branch 'release/${latestReleaseVersion}' already existed`,
        ),
      );
    }
    console.log(
      chalk.green(
        `\u2713 Created release branch 'release/${latestReleaseVersion}'`,
      ),
    );
  } catch (error) {
    console.log(
      chalk.red(
        `Release tag 'v${latestReleaseVersion}' has not been created. Make sure to do the release before running this workflow`,
      ),
    );
    process.exit(1);
  }

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
      (milestone) => milestone.title === latestReleaseVersion,
    );
    if (latestReleaseMilestone) {
      // create new release milestone
      let newReleaseMilestone;
      try {
        newReleaseMilestone = (
          await octokit.rest.issues.createMilestone({
            title: nextReleaseVersion,
            ...github.context.repo,
          })
        ).data;
      } catch {
        newReleaseMilestone = undefined;
      }
      if (newReleaseMilestone) {
        console.log(
          chalk.green(
            `\u2713 Created milestone for next release version v${nextReleaseVersion}`,
          ),
        );

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
            `\u2713 Retrieved open issues in milestone ${latestReleaseVersion}`,
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
          chalk.green(`\u2713 Closed milestone ${latestReleaseVersion}`),
        );
      } else {
        console.log(
          chalk.yellow(
            `New release milestone '${nextReleaseVersion}' already existed. Aborting...`,
          ),
        );
      }
    } else {
      console.log(
        chalk.yellow(
          `Can't find milestone for the latest release version '${latestReleaseVersion}'. Aborting...`,
        ),
      );
    }
  } catch (error) {
    console.log(
      chalk.red(
        `Failed to prepare next release milestone. Error:\n${error.message}`,
      ),
    );
    process.exit(1);
  }
};

prepareNewRelease();
