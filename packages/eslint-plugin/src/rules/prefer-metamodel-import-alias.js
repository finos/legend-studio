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

const metamodelFileMatch = /[/\\]src[/\\]models[/\\]metamodels[/\\]pure[/\\]/u;
const protocolFileMatch = /[/\\]src[/\\]models[/\\]protocols[/\\]pure[/\\]v(?<protocolVersion>.*?)[/\\]/u;

/**
 * Enforce usage of import name alias with prefix "MM_" for metamodel imports used in version-specific
 * protocols code (such as transformation, action, etc.)
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
    },
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const isMetamodelImport =
          node.source.value.startsWith('MM/') ||
          (node.source.value.startsWith('./') &&
            path
              .resolve(context.getFilename(), node.source.value)
              .match(metamodelFileMatch));
        if (
          context.getFilename().match(protocolFileMatch) &&
          isMetamodelImport
        ) {
          node.specifiers.forEach((specifier) => {
            // NOTE: specifier.imported is for the actual import name whereas specifier.local is for alias name
            // we can potentially use this to create an auto-fixer
            if (!specifier.local.name.startsWith('MM_')) {
              context.report({
                node: specifier,
                message:
                  "Prefer aliasing with prefix 'MM_' for metamodel imports in version-specific protocol code",
              });
            }
          });
        }
      },
    };
  },
};
