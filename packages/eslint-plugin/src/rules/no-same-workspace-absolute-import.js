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

const path = require('path');
const fs = require('fs');
const micromatch = require('micromatch');

const SOURCE_FILE_PATTERN = '**/packages/legend-*/src/**';
const WORKSPACE_MATCH_PATTERN =
  /(?<workspacePath>.*?[/\\]packages[/\\]legend-[\w-]+?)[/\\]src[/\\]/u;

/**
 * Disallow usage of exports coming out from the same workspace
 * as these exports are meant for external modules to use.
 *
 * NOTE: IDE like Visual Studio Code sometimes auto-suggest this kinds of imports.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    },
  },
  create(context) {
    const filePath = context.getFilename();
    let workspaceName;
    if (micromatch.isMatch(filePath, [SOURCE_FILE_PATTERN])) {
      const workspacePath = filePath.match(WORKSPACE_MATCH_PATTERN)?.groups
        ?.workspacePath;
      if (
        workspacePath &&
        fs.existsSync(path.resolve(workspacePath, 'package.json'))
      ) {
        workspaceName = require(
          path.resolve(workspacePath, 'package.json'),
        ).name;
      }
    }

    return {
      ImportDeclaration(node) {
        if (
          workspaceName &&
          node.source &&
          (node.source.value === workspaceName ||
            node.source.value.startsWith(`${workspaceName}/`))
        ) {
          context.report({
            node: node.source,
            message: `Do not use absolute imports from the same workspace`,
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (
          workspaceName &&
          node.source &&
          (node.source.value === workspaceName ||
            node.source.value.startsWith(`${workspaceName}/`))
        ) {
          context.report({
            node: node.source,
            message: `Do not use absolute imports from the same workspace`,
          });
        }
      },
      ExportAllDeclaration(node) {
        if (
          workspaceName &&
          node.source &&
          (node.source.value === workspaceName ||
            node.source.value.startsWith(`${workspaceName}/`))
        ) {
          context.report({
            node: node.source,
            message: `Do not use absolute imports from the same workspace`,
          });
        }
      },
    };
  },
};
