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

import { existsSync, lstatSync, writeFile } from 'fs';
import { EOL } from 'os';
import micromatch from 'micromatch';
import { execSync } from 'child_process';
import { isBinaryFileSync } from 'isbinaryfile';
import chalk from 'chalk';
import { getFileContent, createRegExp, exitWithError } from './DevUtils.js';

const GENERIC_INCLUDE_PATTERNS = [
  /\.[^/]+$/, // files with extension
];

const GENERIC_EXCLUDE_PATTERNS = [
  // nothing
];

export const generateCopyrightComment = ({
  text,
  /**
   * Optional. This text will be added prior to the copyright content.
   * This is often useful for bundled code.
   * e.g. `@license some-package v1.0.0`
   */
  pkg: { name, version },
  /**
   * Boolean flag indicating if we are to generate just the content of the comment
   * or the opening/closing syntax for it
   */
  onlyGenerateCommentContent,
  /**
   * TODO: account for file extension to generate different kinds of comments.
   * e.g. `html` comment is a tag `<!-- content -->`
   * e.g. `yaml` comment uses `#`
   */
  file, // eslint-disable-line no-unused-vars
}) => {
  // TODO: depending on the file type, these params might differ
  const headerPrefix = '/**';
  const contentPrefix = ' *';
  const footerPrefix = ' */';

  let lines = text
    .trim()
    .split(EOL)
    .map((line) => `${contentPrefix}${line.length ? ` ${line}` : ''}`);
  if (!onlyGenerateCommentContent) {
    lines = [
      `${headerPrefix}${
        name && version ? ` @license ${name} v${version}` : ''
      }`,
      ...lines,
      footerPrefix,
    ];
  }
  return lines.join(EOL);
};

const getIncludedPatterns = ({ extensions }) => [
  ...extensions.map((extension) => createRegExp(`\\.${extension}$`)),
];

const needsCopyrightHeader = (copyrightText, file) => {
  const fileContent = getFileContent(file);
  // NOTE: while checking for copyright header, we just generate the copyright comment content
  // not including the full comment (with opening/closing syntax) because potentially the copyright
  // comment might have been merged with another comment.
  const text = generateCopyrightComment({
    text: copyrightText,
    pkg: {},
    onlyGenerateCommentContent: true,
  });
  return fileContent.trim().length > 0 && !fileContent.includes(text);
};

const hasCopyrightHeader = (copyrightText, file) => {
  const fileContent = getFileContent(file);
  // NOTE: while checking for copyright header, we just generate the copyright comment content
  // not including the full comment (with opening/closing syntax) because potentially the copyright
  // comment might have been merged with another comment.
  const text = generateCopyrightComment({
    text: copyrightText,
    pkg: {},
    onlyGenerateCommentContent: true,
  });
  return fileContent.trim().length > 0 && fileContent.includes(text);
};

// Jest has a fairly sophisticated check for copyright license header that we used as reference
// See https://github.com/facebook/jest/blob/master/scripts/checkCopyrightHeaders.js
const getInvalidFiles = ({
  extensions = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  copyrightText,
  onlyApplyToModifiedFiles,
}) => {
  const files = execSync(
    `git ls-files ${onlyApplyToModifiedFiles ? '--modified' : ''}`,
    { encoding: 'utf-8' },
  )
    .trim()
    .split('\n');

  const includePatterns = getIncludedPatterns({ extensions });

  return files.filter(
    (file) =>
      GENERIC_INCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
      includePatterns.some((pattern) => pattern.test(file)) &&
      !GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
      !micromatch.isMatch(file, excludePatterns) &&
      existsSync(file) &&
      !lstatSync(file).isDirectory() &&
      !isBinaryFileSync(file) &&
      needsCopyrightHeader(copyrightText, file),
  );
};

export const getFilesWithCopyrightHeader = ({
  extensions = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  copyrightText,
}) => {
  const files = execSync('git ls-files', { encoding: 'utf-8' })
    .trim()
    .split('\n');

  const includePatterns = getIncludedPatterns({ extensions });

  return files.filter(
    (file) =>
      GENERIC_INCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
      includePatterns.some((pattern) => pattern.test(file)) &&
      !GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
      !micromatch.isMatch(file, excludePatterns) &&
      existsSync(file) &&
      !lstatSync(file).isDirectory() &&
      !isBinaryFileSync(file) &&
      hasCopyrightHeader(copyrightText, file),
  );
};

export const checkCopyrightHeaders = ({
  extensions = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  copyrightText,
  helpMessage,
}) => {
  const files = getInvalidFiles({
    extensions,
    excludePatterns,
    copyrightText,
    onlyApplyToModifiedFiles: false,
  });

  if (files.length > 0) {
    exitWithError(
      `Found ${files.length} file(s) without copyright header:\n${files
        .map((file) => `${chalk.red('\u2717')} ${file}`)
        .join('\n')}${helpMessage ? `\n${helpMessage}` : ''}`,
    );
  } else {
    console.log('No issues found!');
  }
};

export const updateCopyrightHeaders = async ({
  extensions = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  copyrightText,
  onlyApplyToModifiedFiles,
}) => {
  const files = getInvalidFiles({
    extensions,
    excludePatterns,
    copyrightText,
    onlyApplyToModifiedFiles,
  });

  if (files.length > 0) {
    console.log(
      `Found ${files.length} file(s) without copyright header. Processing...`,
    );
    const copyrightComment = generateCopyrightComment({
      text: copyrightText,
      pkg: {},
      onlyGenerateCommentContent: false,
    });
    files.forEach((file) =>
      writeFile(
        file,
        `${copyrightComment}\n\n${getFileContent(file)}`,
        (err) => {
          console.log(
            `${err ? chalk.red('\u2717') : chalk.green('\u2713')} ${file}`,
          );
        },
      ),
    );
  } else {
    console.log('All files look good!');
  }
};
