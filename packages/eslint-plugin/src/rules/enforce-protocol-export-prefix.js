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

const micromatch = require('micromatch');

const protocolFileMatchPattern = '**/src/models/protocols/*/v*/**';
const protocolVersionMatchPattern = /[/\\]v(?<protocolVersion>.*?)[/\\]/u;

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
    function getExportDeclarationNameAndLocation(node) {
      switch (node?.type) {
        case 'FunctionDeclaration':
        case 'ClassDeclaration':
        case 'TSInterfaceDeclaration':
        case 'TSTypeAliasDeclaration':
        case 'TSEnumDeclaration':
          return node.id;
        case 'VariableDeclaration':
          return node.declarations?.length
            ? node.declarations[0]?.id
            : undefined;
        default:
          return undefined;
      }
    }
    return {
      ExportNamedDeclaration(node) {
        const fileProtocolVersion = getFileProtocolVersion(node);
        if (!fileProtocolVersion) {
          return;
        }
        const exportPrefix = `V${fileProtocolVersion.toUpperCase()}_`;
        const exportIdentifier = getExportDeclarationNameAndLocation(
          node.declaration,
        );
        if (!exportIdentifier?.name) {
          return;
        }
        if (!exportIdentifier.name.startsWith(exportPrefix)) {
          const location =
            exportIdentifier.range &&
            exportIdentifier.range[0] &&
            exportIdentifier.range[1]
              ? {
                  loc: {
                    start: context
                      .getSourceCode()
                      .getLocFromIndex(exportIdentifier.range[0]),
                    end: context
                      .getSourceCode()
                      .getLocFromIndex(exportIdentifier.range[1]),
                  },
                }
              : { node: node };
          context.report({
            ...location,
            message: `Export name must be prefixed with '${exportPrefix}'`,
          });
        }
      },
    };
  },
};
