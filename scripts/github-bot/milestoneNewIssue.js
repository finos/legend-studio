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

const milestoneNewIssue = async () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const fallbackMilestoneTitle = process.env.FALLBACK_MILESTONE;
  const issueEventPayload = github.context.payload.issue;

  if (!issueEventPayload) {
    githubActionCore.error(
      `Can't run this action: it must be triggered by an 'issues.opened' event. See https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#issues`,
    );
    process.exit(1);
  }

  const issueNumber = issueEventPayload.number;

  console.log(`Checking if milestone already exists for the issue...`);

  try {
    const issue = (
      await octokit.rest.issues.get({
        issue_number: issueNumber,
        ...github.context.repo,
      })
    ).data;

    if (!issue.milestone) {
      console.log(`Checking if fallback milestone exists...`);
      const openMilestones = (
        await octokit.rest.issues.listMilestones({
          state: 'open',
          ...github.context.repo,
        })
      ).data;

      const fallbackMilestone = openMilestones.find(
        (milestone) => milestone.title === fallbackMilestoneTitle,
      );
      if (fallbackMilestone) {
        console.log(
          `Adding ${fallbackMilestoneTitle} to the isse ${issueNumber}`,
        );

        await octokit.rest.issues.update({
          issue_number: issueNumber,
          milestone: fallbackMilestone.number,
          ...github.context.repo,
        });
        console.log(
          chalk.green(
            `Added ${fallbackMilestoneTitle} to the issue ${issueNumber}`,
          ),
        );
      } else {
        githubActionCore.warning(
          `'${fallbackMilestoneTitle}' does not exist in the project`,
        );
      }
    } else {
      console.log(`Milestone already exists for the issue: ${issueNumber}`);
    }
  } catch (error) {
    githubActionCore.error(
      `Unable to add fallback milestone. Error:\n${error.message}`,
    );
  }
};

milestoneNewIssue();
