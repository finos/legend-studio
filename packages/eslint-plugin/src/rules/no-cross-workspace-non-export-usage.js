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
 * Disallow importing files published in /lib from another workspace.
 * We do this so one workspace may only import exports exposed deliberately by another workspace.
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
        if (node.source && node.source.value.includes('/lib/')) {
          context.report({
            node: node.source,
            message: 'Do not import unexposed exports from another workspace',
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source && node.source.value.includes('/lib/')) {
          context.report({
            node: node.source,
            message: 'Do not export unexposed exports from another workspace',
          });
        }
      },
      ExportAllDeclaration(node) {
        if (node.source && node.source.value.includes('/lib/')) {
          context.report({
            node: node.source,
            message: 'Do not export unexposed exports from another workspace',
          });
        }
      },
    };
  },
};
