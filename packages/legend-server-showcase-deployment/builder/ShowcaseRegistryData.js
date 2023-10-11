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

import { resolve, join, relative, sep } from 'path';
import { readFileSync, statSync, readdirSync, writeFileSync } from 'fs';
import { parse } from 'yaml';

const SHOWCASE_CODE_FILE = 'code.pure';
const SHOWCASE_INFO_FILE = 'info.md';

const getFileContent = (file) => readFileSync(file, { encoding: 'utf-8' });
const extractShowcaseInfo = (file) => {
  const content = getFileContent(file).trim();
  const lines = content.split('\n');
  let frontMatter;
  let markdownText;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---$/.test(line)) {
      if (frontMatter === undefined) {
        frontMatter = '';
      } else if (markdownText === undefined) {
        markdownText = '';
      }
    } else {
      if (markdownText !== undefined) {
        markdownText += `${line}\n`;
      } else if (frontMatter !== undefined) {
        frontMatter += `${line}\n`;
      }
    }
  }
  const metadata = parse(frontMatter ?? '');
  const data = {
    title: typeof metadata.title === 'string' ? metadata.title : 'Untitled',
    description:
      typeof metadata.description === 'string'
        ? metadata.description
        : undefined,
    documentation: markdownText?.trim(),
  };
  const development =
    typeof metadata.development === 'boolean'
      ? metadata.development
      : undefined;
  if (development !== undefined) {
    data.development = development;
  }
  return data;
};

export const buildShowcaseRegistryData = (showcaseDirectoryPath) => {
  const uniqueShowcasePaths = new Set();
  const showcasePaths = [];
  const resolveShowcasePaths = (directory) => {
    const files = readdirSync(directory);
    for (const file of files) {
      const absolutePath = join(directory, file);
      const systemSeparator = sep;
      if (statSync(absolutePath).isDirectory()) {
        resolveShowcasePaths(absolutePath);
      } else if (
        absolutePath.endsWith(`${systemSeparator}${SHOWCASE_INFO_FILE}`)
      ) {
        if (!uniqueShowcasePaths.has(directory)) {
          uniqueShowcasePaths.add(directory);
          showcasePaths.push(directory);
        }
      }
    }
  };
  resolveShowcasePaths(showcaseDirectoryPath);

  return showcasePaths
    .map((showcasePath) => {
      const info = extractShowcaseInfo(
        resolve(showcasePath, SHOWCASE_INFO_FILE),
      );
      let code = '';
      try {
        code = getFileContent(resolve(showcasePath, SHOWCASE_CODE_FILE));
      } catch (error) {
        console.log();
        return undefined;
      }
      return {
        ...info,
        path: relative(showcaseDirectoryPath, showcasePath),
        code: code,
      };
    })
    .filter(Boolean);
};

export const extractShowcaseRegistryData = (
  showcaseDirectoryPath,
  outputPath,
) => {
  writeFileSync(
    outputPath,
    JSON.stringify(buildShowcaseRegistryData(showcaseDirectoryPath)),
  );
};
