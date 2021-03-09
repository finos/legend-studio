/**
 * Copyright 2020 Goldman Sachs
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

/**
 * Customize the changelog generator to not show changelog entry without content.
 * NOTE: We try not to customize too far from the default changelog generator `@changesets/changelog-github`.
 *
 * See https://github.com/atlassian/changesets/blob/master/docs/modifying-changelog-format.md
 */
const githubChangelogFunctions = require('@changesets/changelog-github')
  .default;

const getReleaseLine = async (changeset, type, options) => {
  if (!changeset.summary) {
    return undefined; // do not show change log release line without content
  }
  return githubChangelogFunctions.getReleaseLine(changeset, type, options);
};

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine: githubChangelogFunctions.getDependencyReleaseLine,
};
