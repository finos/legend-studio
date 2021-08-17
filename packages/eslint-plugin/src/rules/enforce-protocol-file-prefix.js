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

const protocolFileMatchPattern = '**/src/models/protocols/*/v*/**';
const protocolVersionMatchPattern =
  /[/\\]src[/\\]models[/\\]protocols[/\\][^/\\]+[/\\]v(?<protocolVersion>.*?)[/\\]/u;

/**
 * Enforce files related to a specific protocol version
 * must have their names prefixed with that version.
 *
 * e.g. V1_Class, V2_Engine, etc.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      recommended: false,
    },
  },
  create(context) {
    function getFileProtocolVersion(node) {
      const filePath = context.getFilename();
      if (!micromatch.isMatch(filePath, [protocolFileMatchPattern])) {
        return undefined;
      }
      return (
        filePath.match(protocolVersionMatchPattern)?.groups?.protocolVersion ??
        undefined
      );
    }
    return {
      Program(node) {
        const fileProtocolVersion = getFileProtocolVersion(node);
        if (!fileProtocolVersion) {
          return;
        }
        const fileName = path.basename(context.getFilename());
        const filePrefix = `V${fileProtocolVersion.toUpperCase()}_`;
        if (!fileName.startsWith(filePrefix)) {
          context.report({
            loc: {
              start: {
                line: 1,
                column: 0,
              },
              end: {
                line: 1,
                column: 1,
              },
            },
            message: `File name must be prefixed with '${filePrefix}'`,
          });
        }
      },
    };
  },
};
