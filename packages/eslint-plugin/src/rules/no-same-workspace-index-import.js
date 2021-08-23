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
 * Disallow usage of exports coming out from some `index` files within the same workspaces
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
    return {
      ImportDeclaration(node) {
        if (node.source && node.source.value.match(/^[./]*$/)) {
          context.report({
            node: node.source,
            message: `Do not import from an 'index' file within the same workspace`,
          });
        }
      },
    };
  },
};
