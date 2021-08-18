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

/**
 * Customize the changelog generator to not show changelog entry without content.
 *
 * Since we might enforce contributors to provide a changeset to at least bump a `patch` for any
 * packages they modify, there are times when it doesn't really make sense to require
 * a changeset summary. As such, we need a way to filter those changesets without summary out from
 * the changelog.
 *
 * NOTE: We try not to customize too far from the default changelog generator `@changesets/changelog-github`.
 *
 * See https://github.com/atlassian/changesets/blob/master/docs/modifying-changelog-format.md
 *
 * NOTE: Looks like `changeset` only support CJS for now so we cannot use ESM in this file.
 */
const githubChangelogFunctions =
  require('@changesets/changelog-github').default;

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
