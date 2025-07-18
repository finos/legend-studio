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

import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Process template text by replacing placeholders with actual values
 * @param {string} template - Template text with {{PLACEHOLDER}} syntax
 * @param {object} variables - Object containing variable values
 * @returns {string} Processed text with placeholders replaced
 */
const processTemplate = (template, variables) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
};

// Read the template file
const templateText = readFileSync(
  resolve(__dirname, './COPYRIGHT_HEADER.template.txt'),
  {
    encoding: 'utf-8',
  },
);

// Define template variables
const templateVariables = {
  YEAR: new Date().getFullYear(),
};

export default {
  extensions: ['js', 'ts', 'tsx', 'css', 'scss'],
  excludePatterns: [],
  copyrightText: processTemplate(templateText, templateVariables),
};
