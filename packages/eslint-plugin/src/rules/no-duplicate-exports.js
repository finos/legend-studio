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
 * Disallow duplicate exports. Since we now allow Typescript syntax for inline `type` annotation
 * in import and export statements, we can enforce this.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    },
  },
  create(context) {
    const uniqueExportStatementSources = new Set();
    return {
      ExportNamedDeclaration(node) {
        if (node.source) {
          if (uniqueExportStatementSources.has(node.source.value)) {
            context.report({
              node: node.source,
              message: `'${node.source.value}' export is duplicated`,
            });
          } else {
            uniqueExportStatementSources.add(node.source.value);
          }
        }
      },
      ExportAllDeclaration(node) {
        if (node.source) {
          if (uniqueExportStatementSources.has(node.source.value)) {
            context.report({
              node: node.source,
              message: `'${node.source.value}' export is duplicated`,
            });
          } else {
            uniqueExportStatementSources.add(node.source.value);
          }
        }
      },
    };
  },
};
