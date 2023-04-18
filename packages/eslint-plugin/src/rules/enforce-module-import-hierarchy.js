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

const GRAPH_FILE_PATTERN = '**/src/graph/**';
const GRAPH_MANAGER_FILE_PATTERN = '**/src/graph-manager/**';
const PROTOCOL_FILE_PATTERN = '**/src/graph-manager/protocol/*/v*/**';
const GENERIC_PROTOCOL_FILE_PATTERN = '**/src/graph-manager/protocol/**';
const COMPONENT_FILE_PATTERN = '**/src/components/**';
const STORE_FILE_PATTERN = '**/src/stores/**';

/**
 * Enforce module import hierarchy for the following modules (in order):
 *  1. Editor (components/stores)
 *  2. Protocol (protocol)
 *  3. Graph Manager (graph manager)
 *  4. Graph (metamodel, graph manager)
 *
 * The general rules are:
 *  1. The lower one cannot depend on the higher ones
 *  2. **Nothing** should depend on Protocol
 *
 * NOTE: the limitation of this approach is we only rely on the import path
 * instead of the actual imported entities, so technically if we're importing
 * entities from another packages, we could still mess up the import hierarchy
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
    const GRAPH = 'GRAPH';
    const GRAPH_MANAGER = 'GRAPH MANAGER';

    // simplify the dependency graph by doing this for now
    const FORBIDDEN_DEPENDENCIES = {
      [EDITOR]: [PROTOCOL],
      [PROTOCOL]: [EDITOR],
      [GRAPH]: [EDITOR, GRAPH_MANAGER, PROTOCOL],
      [GRAPH_MANAGER]: [EDITOR, PROTOCOL],
    };

    function getModuleType(filePath) {
      if (micromatch.isMatch(filePath, [PROTOCOL_FILE_PATTERN])) {
        return PROTOCOL;
      } else if (micromatch.isMatch(filePath, [GRAPH_FILE_PATTERN])) {
        return GRAPH;
      } else if (
        micromatch.isMatch(filePath, [GRAPH_MANAGER_FILE_PATTERN]) &&
        !micromatch.isMatch(filePath, [GENERIC_PROTOCOL_FILE_PATTERN])
      ) {
        return GRAPH_MANAGER;
      } else if (
        micromatch.isMatch(filePath, [
          STORE_FILE_PATTERN,
          COMPONENT_FILE_PATTERN,
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
          FORBIDDEN_DEPENDENCIES[fileModuleType] &&
          FORBIDDEN_DEPENDENCIES[fileModuleType].includes(importModuleType)
        ) {
          context.report({
            node: node.source,
            message: `Do not import file from '${importModuleType.toLowerCase()}' module in a file from '${fileModuleType.toLowerCase()}' module`,
          });
        }
      },
    };
  },
};
