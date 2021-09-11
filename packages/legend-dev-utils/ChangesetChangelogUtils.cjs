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

module.exports = {
  getReleaseLine: async (changeset, type, options) => {
    if (!changeset.summary) {
      return undefined; // do not show changelog release line without content
    }
    let line = await githubChangelogFunctions.getReleaseLine(
      changeset,
      type,
      options,
    );

    // Replace the author pattern to be more succint
    const authorMatchPattern =
      /Thanks (?<author>\[@.+?\]\(https:\/\/github.com\/.+?\))!/u;
    if (line.match(authorMatchPattern)?.groups?.author) {
      line = line.replace(
        authorMatchPattern,
        `(${line.match(authorMatchPattern).groups.author})`,
      );
    }

    return line;
  },
  // NOTE: due to verbosity, we would want to opt out from dependency reporting
  // the argument here is that:
  // 1. if we need to know this information, we would probably want to know
  //    about the upgrade for 3rd party libraris: e.g. webpack, typescript, etc.
  // 2. we can sort of trace out the versions of dependencies by looking at the
  //    package's manifest file - package.json
  getDependencyReleaseLine: () => Promise.resolve(''),
};
