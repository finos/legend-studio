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

import semver from 'semver';
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
  const organization = process.env.ORGANIZATION;
  const projectNumber = parseInt(process.env.PROJECT_NUMBER, 10);
  const issueEventPayload = github.context.payload.issue;

  if (!issueEventPayload) {
    githubActionCore.error(
      `Can't run this action: it must be triggered by an 'issues.milestoned' event. See https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#issues`,
    );
    process.exit(1);
  }

  const issueId = issueEventPayload.node_id;
  const milestone = issueEventPayload.milestone.title;

  // NOTE: only auto-track issues which are added to version milestones
  if (!semver.valid(milestone)) {
    githubActionCore.warning(
      `(skipped) Issue is not milestoned '${milestone}' which is not a version milestone`,
    );
    return;
  }

  console.log(`Adding milestoned issue to tracker project...`);

  // Use GraphQL API
  // See https://docs.github.com/en/graphql/overview/explorer
  try {
    const projectId = (
      await octokitWithProjectManageToken.graphql(
        `query ($organization: String!, $projectNumber: Int!) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          id
        }
      }
    }`,
        {
          organization,
          projectNumber,
        },
      )
    ).organization.projectV2.id;

    await octokitWithProjectManageToken.graphql(
      `
        mutation ($projectId: ID!, $issueId: ID!) {
          addProjectV2ItemById(input: {projectId: $projectId, contentId: $issueId}) {
              item {
                  id
              }
          }
      }
    `,
      {
        projectId,
        issueId,
      },
    );
    console.log(
      chalk.green(
        `\u2713 Tracked milestoned issue ${issueEventPayload.html_url}`,
      ),
    );
  } catch {
    githubActionCore.error(
      `Can't track milestoned issue ${issueEventPayload.html_url}`,
    );
  }
};

trackNewMilestonedIssue();
