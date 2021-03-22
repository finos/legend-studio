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
const micromatch = require('micromatch');

const metamodelFileMatchPattern = '**/src/models/metamodels/**';
const protocolFileMatchPattern = '**/src/models/protocols/*/v*/**';
const componentFileMatchPattern = '**/src/components/**';
const storeFileMatchPattern = '**/src/stores/**';

/**
 * Enforce module import hierarchy so that we have the following layers (top down):
 *  1. Editor (components/stores/states)
 *  2. Protocol (protocol models/engine)
 *  3. Metamodel (metamodel models/graph)
 *
 * NOTE: the deeper layers cannot depend on the higher ones.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    },
  },

  create(context) {
    const EDITOR = 'EDITOR';
    const PROTOCOL = 'PROTOCOL';
    const METAMODEL = 'METAMODEL';

    // simplify the dependency graph by doing this for now
    const FORBIDDEN_MODULE_DEPENDENCY = {
      PROTOCOL: [EDITOR],
      METAMODEL: [EDITOR, PROTOCOL],
    };

    function getModuleType(filePath) {
      if (micromatch.isMatch(filePath, [metamodelFileMatchPattern])) {
        return METAMODEL;
      } else if (micromatch.isMatch(filePath, [protocolFileMatchPattern])) {
        return PROTOCOL;
      } else if (
        micromatch.isMatch(filePath, [
          storeFileMatchPattern,
          componentFileMatchPattern,
        ])
      ) {
        return EDITOR;
      }
      return undefined;
    }

    return {
      ImportDeclaration(node) {
        const filePath = context.getFilename();
        const fileModuleType = getModuleType(filePath);
        if (!fileModuleType) {
          return;
        }
        const importModuleType = getModuleType(
          path.resolve(path.dirname(filePath), node.source.value),
        );
        if (!importModuleType) {
          return;
        }
        if (
          FORBIDDEN_MODULE_DEPENDENCY[fileModuleType] &&
          FORBIDDEN_MODULE_DEPENDENCY[fileModuleType].includes(importModuleType)
        ) {
          context.report({
            node: node.source,
            message: `Do not import file from '${importModuleType.toLowerCase()}' module in file from '${fileModuleType.toLowerCase()}' module`,
          });
        }
      },
    };
  },
};
