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
 * Disallow importing source code from another workspace.
 * e.g. import { Something } from '@test/package-a/src/...'
 * This is invalid and will throw off `tsc` in build mode. As such, we must disallow this.
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
    return {
      ImportDeclaration(node) {
        if (node.source && node.source.value.includes('/src/')) {
          context.report({
            node: node.source,
            message: 'Do not import source code from another workspace',
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source && node.source.value.includes('/src/')) {
          context.report({
            node: node.source,
            message: 'Do not export source code from another workspace',
          });
        }
      },
      ExportAllDeclaration(node) {
        if (node.source && node.source.value.includes('/src/')) {
          context.report({
            node: node.source,
            message: 'Do not export source code from another workspace',
          });
        }
      },
    };
  },
};
