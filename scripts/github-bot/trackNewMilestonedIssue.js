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
 * This script will automatically add the new milestoned issue to our tracker project
 */
const trackNewMilestonedIssue = async () => {
  const octokitWithProjectManageToken = github.getOctokit(
    process.env.MANAGE_PROJECT_TOKEN,
  );
  const projectNumber = process.env.PROJECT_NUMBER;
  const issueEventPayload = github.context.payload.issue;

  if (!issueEventPayload) {
    githubActionCore.error(
      `Can't run this action: it must be triggered by an 'issues.milestoned' event. See https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#issues`,
    );
    process.exit(1);
  }

  const issueNumber = issueEventPayload.number;
  const milestone = issueEventPayload.milestone.title;
  console.log('milestone', milestone);

  console.log(`Adding milestoned issue to tracker project...`);

  // Use GraphQL API
  // See https://docs.github.com/en/graphql/overview/explorer
  try {
    await octokitWithProjectManageToken.graphql(`
      mutation {
        addProjectV2ItemById(input: {projectId: ${projectNumber}, contentId: ${issueNumber}}) {
          item {
            id
          }
        }
      }
    `);
    console.log(
      chalk.green(
        `\u2713 Tracked milestoned issue ${issueEventPayload.html_url}`,
      ),
    );
  } catch (error) {
    console.log(error);
    githubActionCore.error(
      `Can't track milestoned issue ${issueEventPayload.html_url}`,
    );
  }
};

trackNewMilestonedIssue();
