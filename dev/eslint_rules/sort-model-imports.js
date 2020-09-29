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

/**
 * NOTE: ESlint mentiond that this kind of rule should not have a fixer because it could change the
 * evaluation order of the imported module
 * See https://github.com/eslint/eslint/issues/11542
 *
 * We then look to build our own lint rule and fixer and this is fairly safe because we will only concern about
 * metamodel vs. protocol, and it seems like ES6 module improts are hoisted (*needs citation)
 *
 * We take the inspiration from `eslint-plugin-simple-import-sort` to create our fixer
 * See https://github.com/lydell/eslint-plugin-simple-import-sort
 */
const path = require('path');

const metamodelFileMatch = /[/\\]app[/\\]models[/\\]metamodels[/\\]pure[/\\]/u;
const protocolFileMatch = /[/\\]app[/\\]models[/\\]protocols[/\\]pure[/\\]v(?<protocolVersion>.*?)[/\\]/u;

// extract import chunks in order they appear in the file
// import "chunk" is a sequence of import statements with only comments and whitespace between.
// NOTE: which implies that even if we collocate all the imports at the top of the file, we cannot
function extractImportChunks(programNode) {
  const chunks = [];
  let importDeclarationNodes = [];
  for (const node of programNode.body) {
    if (node.type === 'ImportDeclaration') {
      importDeclarationNodes.push(node);
    } else if (importDeclarationNodes.length > 0) {
      chunks.push(importDeclarationNodes);
      importDeclarationNodes = [];
    }
  }
  if (importDeclarationNodes.length > 0) { chunks.push(importDeclarationNodes) }
  return chunks;
}

/**
 * Sort model import in order of \[other, metamodel, protocol\]
 */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      recommended: false,
    }
  },

  create(context) {
    const importGroups = ['other', 'metamodel', 'protocol'];

    function getImportGroup(node) {
      const val = node.source.value;
      if (val.startsWith('MM/') || (val.startsWith('./') && path.resolve(context.getFilename(), val).match(metamodelFileMatch))) {
        return 'metamodel';
      } else if (val.match(/^V\d*[/\\]/u) || (val.startsWith('./') && path.resolve(context.getFilename(), val).match(protocolFileMatch))) {
        return 'protocol';
      }
      return 'other';
    }

    function validateImportChunk(importChunk, sourceCode) {
      let passedValidation = true;
      let maxImportGroupIndex = -1;
      const importGroupIndexMap = new Map();
      importChunk.forEach((importDeclarationNode, idx) => {
        const currentImportGroup = getImportGroup(importDeclarationNode);
        importGroupIndexMap.set(currentImportGroup, (importGroupIndexMap.get(currentImportGroup) || []).concat([idx]));
        const currentImportGroupIndex = importGroups.indexOf(currentImportGroup);
        if (currentImportGroupIndex > maxImportGroupIndex) {
          maxImportGroupIndex = currentImportGroupIndex;
        } else if (currentImportGroupIndex < maxImportGroupIndex) {
          passedValidation = false;
        }
      });
      // optimize to only compute the sorted imports string if validation failed
      let importChunkString = '';
      if (!passedValidation) {
        importChunkString = importGroups.map(importGroup => {
          if (!importGroupIndexMap.has(importGroup)) { return undefined }
          return importGroupIndexMap.get(importGroup).map(importIndex => sourceCode.getText(importChunk[importIndex])).join('\n');
        }).filter(Boolean).join('\n');
      }
      return [passedValidation, importChunkString];
    }

    return {
      Program(programNode) {
        for (const importChunk of extractImportChunks(programNode)) {
          const sourceCode = context.getSourceCode();
          const [passedValidation, sortedImports] = validateImportChunk(importChunk, sourceCode);
          const [start] = importChunk[0].range;
          const [, end] = importChunk[importChunk.length - 1].range;
          if (!passedValidation) {
            context.report({
              message: 'Expected imports to come in order (other, MM, V*)',
              loc: {
                start: sourceCode.getLocFromIndex(start),
                end: sourceCode.getLocFromIndex(end),
              },
              fix: fixer => fixer.replaceTextRange([start, end], sortedImports),
            });
          }
        }
      }
    };
  }
};
