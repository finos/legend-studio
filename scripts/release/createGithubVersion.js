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
import { execSync } from 'child_process';

/**
 * Changesets generate tags and Github release by default, but this is cluttering the
 * project quickly as we have a lot of libraries within the monorepo.
 * As such, we would want to undo all of these and create a single release.
 *
 * Following is the list of expected environment variables:
 *
 * GITHUB_TOKEN - the Github token
 * PUBLISH_PACKAGES - the list of published packages (with name and version) output by `changesets/action`
 * MAIN_PACKAGE - the name of the package within the list of published packages. If this is available,
 *                a new version tag and its release will be published to Github.
 */
const postChangesetPublishCleanup = async () => {
  const publishedPackages = JSON.parse(process.env.PUBLISHED_PACKAGES);
  const tagsToCleanup = publishedPackages.map(
    (pkg) => `${pkg.name}@${pkg.version}`,
  );
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const mainPackageName = process.env.MAIN_PACKAGE;
  const releaseVersion = publishedPackages.find(
    (pkg) => pkg.name === mainPackageName,
  )?.version;

  console.log(
    `Removing Github releases and tags created by changesets/action...`,
  );
  const tagsNotRemoved = [];
  await Promise.all(
    tagsToCleanup.map(async (tag) => {
      try {
        // Delete the release published on Github by `changesets/action`
        // Check the following links for Github actions API reference
        // See https://octokit.github.io/rest.js/v18/
        // See https://docs.github.com/en/rest/reference/repos#releases
        const release = await octokit.rest.repos.getReleaseByTag({
          tag,
          ...github.context.repo,
        });
        await octokit.rest.repos.deleteRelease({
          release_id: release.data.id,
          ...github.context.repo,
        });
        // Delete the tags published by `changesets/action`
        execSync(`git push --delete origin ${tag}`, {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'inherit'], // only print error
        });
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
    console.warn(
      `The following tags and their respective releases are not removed from Github. Please manually remove them on Github:\n${tagsNotRemoved
        .map((tag) => `- ${tag}`)
        .join('\n')}`,
    );
  }

  if (releaseVersion) {
    try {
      await octokit.rest.repos.createRelease({
        tag_name: `v${releaseVersion}`,
        name: `Version ${releaseVersion}`,
        body: `👋  _We are crafting a release note for this version..._\n> Meanwhile, please refer to the latest release pull request for a summary of code changes.`,
        ...github.context.repo,
      });
      console.log(
        `\u2713 Successfully created release for tag v${releaseVersion}. Please add release note for this on Github.`,
      );
    } catch (error) {
      console.log(
        `\u2713 Failed to create release with tag v${releaseVersion}. Please manually create this release tag on Github.`,
      );
    }
  }
};

postChangesetPublishCleanup();
