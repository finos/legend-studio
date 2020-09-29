/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require('path');

const protocolFileMatch = /[/\\]app[/\\]models[/\\]protocols[/\\]pure[/\\]v(?<protocolVersion>.*?)[/\\]/u;
const protocolCommonFileMatch = /[/\\]app[/\\]models[/\\]protocols[/\\]pure[/\\][^/\\]*$/u;

/**
 * Disallow importing protocol models from outside of protocol directory and across diferent versions
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    }
  },

  create(context) {
    function getProtocolVersion(node) {
      let match;
      if (node.source.value.startsWith('./')) {
        const fullPath = path.resolve(context.getFilename(), node.source.value);
        match = fullPath.match(protocolFileMatch);
      } else {
        match = node.source.value.match(/^V(?<protocolVersion>.*?)[/\\]/u);
      }
      return match ? match.groups.protocolVersion : undefined;
    }
    return {
      ImportDeclaration(node) {
        const importProtocolVersion = getProtocolVersion(node);
        if (importProtocolVersion) {
          if (!context.getFilename().match(protocolCommonFileMatch)) {
            const currentFileProtocolVersionMatch = context.getFilename().match(protocolFileMatch);
            const currentFileProtocolVersion = currentFileProtocolVersionMatch ? currentFileProtocolVersionMatch.groups.protocolVersion : undefined;
            if (currentFileProtocolVersion !== importProtocolVersion) {
              context.report({
                node: node.source,
                message: `Protocol models V${importProtocolVersion} cannot be used ${currentFileProtocolVersion ? `in definition of protocol V${currentFileProtocolVersion}` : 'outside of \'app/models/protocols/pure/\''}`
              });
            }
          }
        }
      }
    };
  }
};
