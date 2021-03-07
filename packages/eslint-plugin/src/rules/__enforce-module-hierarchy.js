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

const path = require('path');

const protocolFileMatch = /[/\\]src[/\\]models[/\\]protocols[/\\]pure[/\\]v(?<protocolVersion>.*?)[/\\]/u;
const metamodelFileMatch = /[/\\]src[/\\]models[/\\]metamodels[/\\]pure[/\\]/u;
const utilityFileMatch = /[/\\]src[/\\]utils[/\\]/u;
const storeFileMatch = /[/\\]src[/\\]stores[/\\]/u;
const componentFileMatch = /[/\\]src[/\\]components[/\\]/u;
const entryFileMatch = /[/\\]src[/\\]index\.tsx$/u;

/**
 * Enforce dependency hierarchy so that in the future if we decide to split up the app into several modules
 * we can do so relatively easily. The current hieararchy is:
 *    - components
 *    |-- stores
 *    |   |-- utils / models (we might want to layer this by creating a shared module, but that's for later)
 *    |------ utils (same as above)
 *
 * NOTE: since we have dealt with restriction for protocol modules elsewhere, we don't have to account for that module here.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    },
  },

  create(context) {
    const OTHER = 'OTHER';
    const PROTOCOL = 'PROTOCOL';
    const METAMODEL = 'METAMODEL';
    const UTIL = 'UTIL';
    const STORE = 'STORE';
    const COMPONENT = 'COMPONENT';

    // for convenience, instead of putting out the dependency tree, we just states the forbidden dependencies
    const FORBIDDEN_DEPENDENCY = {
      OTHER: [STORE, COMPONENT], // to go all out, we might need to specify other things like: API, worker, const, etc.
      METAMODEL: [STORE, COMPONENT],
      UTIL: [STORE, COMPONENT],
      STORE: [COMPONENT],
    };

    function getImportModule(node) {
      const val = node.source.value;
      if (
        val.match(/^V\d*[/\\]/u) ||
        (val.startsWith('./') &&
          path.resolve(context.getFilename(), val).match(protocolFileMatch))
      ) {
        return PROTOCOL;
      } else if (
        val.startsWith('MM/') ||
        (val.startsWith('./') &&
          path.resolve(context.getFilename(), val).match(metamodelFileMatch))
      ) {
        return METAMODEL;
      } else if (
        val.match('Utilities/') ||
        (val.startsWith('./') &&
          path.resolve(context.getFilename(), val).match(utilityFileMatch))
      ) {
        return UTIL;
      } else if (
        val.match('Stores/') ||
        (val.startsWith('./') &&
          path.resolve(context.getFilename(), val).match(storeFileMatch))
      ) {
        return STORE;
      } else if (
        val.match('Components/') ||
        (val.startsWith('./') &&
          path.resolve(context.getFilename(), val).match(componentFileMatch))
      ) {
        return COMPONENT;
      }
      return OTHER;
    }

    function getCurrentFileModule() {
      if (path.resolve(context.getFilename(), '.').match(protocolFileMatch)) {
        return PROTOCOL;
      } else if (
        path.resolve(context.getFilename(), '.').match(metamodelFileMatch)
      ) {
        return METAMODEL;
      } else if (
        path.resolve(context.getFilename(), '.').match(utilityFileMatch)
      ) {
        return UTIL;
      } else if (
        path.resolve(context.getFilename(), '.').match(storeFileMatch)
      ) {
        return STORE;
      } else if (
        path.resolve(context.getFilename(), '.').match(componentFileMatch) ||
        path.resolve(context.getFilename(), '.').match(entryFileMatch)
      ) {
        return COMPONENT;
      }
      return OTHER;
    }

    return {
      ImportDeclaration(node) {
        const currentFileModule = getCurrentFileModule();
        const importModule = getImportModule(node);
        if (
          FORBIDDEN_DEPENDENCY[currentFileModule] &&
          FORBIDDEN_DEPENDENCY[currentFileModule].includes(importModule)
        ) {
          context.report({
            node: node,
            message: `Disallow dependency on '${importModule}' module in '${currentFileModule}' module`,
          });
        }
      },
    };
  },
};
