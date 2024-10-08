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

/**
 * This script will automatically onboard new issue.
 * Labelling rules are:
 *  - If the issue creator is a member of the team, add the team label
 * Setting milestone rules are:
 *  - If there is no milestone addded to the issue, add the fallback milestone
 */
const onboardNewIssue = async () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const octokitWithOrganizationReadScope = github.getOctokit(
    process.env.ORGANIZATION_READ_TOKEN,
  );
  const orgName = process.env.ORGANIZATION_NAME;
  const teamName = process.env.TEAM_NAME;
  const teamLabel = process.env.TEAM_LABEL;
  const fallbackMilestoneTitle = process.env.FALLBACK_MILESTONE;
  const issueEventPayload = github.context.payload.issue;

  if (!issueEventPayload) {
    githubActionCore.error(
      `Can't run this action: it must be triggered by an 'issues.opened' event. See https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#issues`,
    );
    process.exit(1);
  }

  const issueNumber = issueEventPayload.number;

  console.log(`Onboarding new issue...`);

  let issue;

  try {
    issue = (
      await octokit.rest.issues.get({
        issue_number: issueNumber,
        ...github.context.repo,
      })
    ).data;
  } catch (error) {
    githubActionCore.error(`Can't onboard issue. Error:\n${error.message}`);
    process.exit(1);
  }

  // Add team label to issues created by team members
  console.log(`Adding team label '${teamLabel}' to issue '${issue.title}'...`);
  let membership;
  try {
    membership = (
      await octokitWithOrganizationReadScope.rest.teams.getMembershipForUserInOrg(
        {
          org: orgName,
          team_slug: teamName,
          username: issue.user.login,
          ...github.context.repo,
        },
      )
    ).data;
  } catch {
    membership = undefined;
  }
  if (membership) {
    try {
      await octokit.rest.issues.addLabels({
        issue_number: issueNumber,
        labels: [teamLabel],
        ...github.context.repo,
      });
      console.log(
        chalk.green(
          `\u2713 Added team label '${teamLabel}' to issue '${issue.title}'`,
        ),
      );
    } catch (error) {
      githubActionCore.error(
        `Can't add team label '${teamLabel}' to issue '${issue.title}'. Error:\n${error.message}\nPlease manually do so.`,
      );
    }
  } else {
    githubActionCore.warning(
      `(skipped) User '${issue.user.login}' is not a member of team '${teamName}'`,
    );
  }

  // Setting fallback milestone to new open issue
  if (fallbackMilestoneTitle && !issue.milestone) {
    console.log(`Checking if fallback milestone exists...`);

    let openMilestones;
    try {
      openMilestones = (
        await octokit.rest.issues.listMilestones({
          state: 'open',
          ...github.context.repo,
        })
      ).data;
    } catch {
      openMilestones = undefined;
    }
    if (openMilestones) {
      const fallbackMilestone = openMilestones.find(
        (milestone) => milestone.title === fallbackMilestoneTitle,
      );

      if (fallbackMilestone) {
        console.log(
          `Setting milestone ${fallbackMilestone}' for issue '${issue.title}'`,
        );

        try {
          await octokit.rest.issues.update({
            issue_number: issueNumber,
            milestone: fallbackMilestone.number,
            ...github.context.repo,
          });
          console.log(
            chalk.green(
              `Set milestone '${fallbackMilestoneTitle}' for issue '${issue.title}'`,
            ),
          );
        } catch (error) {
          githubActionCore.error(
            `Can't set milestone '${fallbackMilestoneTitle}' for issue '${issue.title}'. Error:\n${error.message}\nPlease manually do so.`,
          );
        }
      } else {
        githubActionCore.warning(
          `'${fallbackMilestoneTitle}' does not exist in the project`,
        );
      }
    } else {
      githubActionCore.warning(
        `Can't get the list of open milestones in the project`,
      );
    }
  } else {
    githubActionCore.warning(
      fallbackMilestoneTitle
        ? `(skipped) Milestone already exists for the issue: ${issueNumber}`
        : `(skipped) No fallback milestone exists`,
    );
  }
};

onboardNewIssue();
