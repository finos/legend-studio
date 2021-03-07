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
const protocolModelFileMatch = /[/\\]src[/\\]models[/\\]protocols[/\\]pure[/\\]v(?<protocolVersion>.*?)[/\\]model[/\\]/u;

/**
 * Disallow dependency on metamodel in protocol models
 * (this is avoided by using visitor instead of placing `process` methods inside model definitions)
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
          context.getFilename().match(protocolModelFileMatch) &&
          isMetamodelImport
        ) {
          context.report({
            node: node,
            message:
              'Disallow dependency on metamodels in protocol model definitions, use visitor for processing instead',
          });
        }
      },
    };
  },
};
