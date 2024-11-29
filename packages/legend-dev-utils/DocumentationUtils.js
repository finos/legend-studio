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

import { getFileContent } from './DevUtils.js';
import { default as parseFrontMatter } from 'front-matter';
import { lstatSync, readdirSync } from 'fs';
import { resolve } from 'path';

export { parseFrontMatter };

export const generateDocumentation = (docFilePath) => {
  const fileContent = getFileContent(docFilePath);
  const content = parseFrontMatter(fileContent);
  const markDownContent = content.body.trim();
  const textContent = content.attributes.text?.trim();
  return {
    id: content.attributes.id.trim(),
    title: content.attributes.title.trim(),
    markdownText:
      markDownContent !== ''
        ? {
            value: markDownContent,
          }
        : undefined,
    text: textContent !== '' ? textContent : undefined,
  };
};

export const assembleDocumentation = (paths) => {
  const docs = [];
  paths.forEach((path) => {
    if (lstatSync(path).isDirectory()) {
      readdirSync(path).forEach((file) => {
        if (file.endsWith('.md')) {
          try {
            docs.push(generateDocumentation(resolve(path, file)));
          } catch (error) {
            console.error(
              `Can't generate documentation for ${resolve(path, file)}`,
              error,
            );
          }
        }
      });
    } else {
      try {
        docs.push(generateDocumentation(path));
      } catch (error) {
        console.error(`Can't generate documentation for ${path}`, error);
      }
    }
  });
  const entries = {};
  docs
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((doc) => {
      entries[doc.id] = doc;
      delete entries[doc.id].id;
    });
  return {
    entries,
  };
};
