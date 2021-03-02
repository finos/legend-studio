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
const fs = require('fs');
const micromatch = require('micromatch');
const { execSync } = require('child_process');
const { isBinaryFileSync } = require('isbinaryfile');
const { getFileContent, exitWithError } = require('./DevUtils');
const chalk = require('chalk');

const GENERIC_EXCLUDE_PATTERNS = [
  // nothing
];

const generateMarkerSet = (key) => ({
  key,
  marker: `@${key}`,
  startSectionMarker: `${key}-start`,
  endSectionMarker: `${key}-end`,
  fileMarker: `${key}-file`,
  dirMarker: `${key}-dir`,
});

const hasPhrases = (file, phrases = []) => {
  const fileContent = getFileContent(file);
  return (
    fileContent.trim().length > 0 &&
    phrases.some((phrase) => fileContent.includes(phrase))
  );
};

const collectMarkerStats = (filesWithMarker, markerSet) => {
  const result = {
    dirs: [],
    files: [],
    sections: [],
  };
  // use set to de-duplicate
  const dirs = new Set();
  const files = new Set();
  const sections = new Set();
  // classify marker types
  filesWithMarker.forEach((file) => {
    const fileContent = getFileContent(file).trim();
    // respect the scope: dir > file > section
    if (fileContent.includes(markerSet.dirMarker)) {
      dirs.add(path.dirname(file));
    } else if (fileContent.includes(markerSet.fileMarker)) {
      files.add(file);
    } else if (
      fileContent.includes(markerSet.startSectionMarker) ||
      fileContent.includes(markerSet.endSectionMarker)
    ) {
      sections.add(file);
    } else {
      // if no scope marker is provided, it is assumed that the marker is for the whole file
      files.add(file);
    }
  });
  // simplify stats - if a directory includes file or section, the latter will not be listed
  result.dirs = Array.from(dirs.values());
  Array.from(files.values()).forEach((file) => {
    if (result.dirs.every((dir) => !file.startsWith(`${dir}/`))) {
      result.files.push(file);
    }
  });
  Array.from(sections.values()).forEach((file) => {
    if (result.dirs.every((dir) => !file.startsWith(`${dir}/`))) {
      result.sections.push(file);
    }
  });
  return result;
};

const findFiles = ({
  marker,
  phrases,
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  useMarkerScope = false,
  // TODO: collapse by folder option
}) => {
  const files = execSync('git ls-files', { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(
      (file) =>
        !GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
        (!includePatterns.length ||
          micromatch.isMatch(file, includePatterns)) &&
        !micromatch.isMatch(file, excludePatterns) &&
        fs.existsSync(file) &&
        !fs.lstatSync(file).isDirectory() &&
        !isBinaryFileSync(file),
    );

  const markerSet = generateMarkerSet(marker.key);
  const filesWithMarker = files.filter((file) =>
    hasPhrases(file, [markerSet.marker]),
  );
  const markerStats = useMarkerScope
    ? collectMarkerStats(filesWithMarker, markerSet)
    : undefined;

  const filesWithPhrases = files.filter(
    (file) =>
      !micromatch.isMatch(file, phrases.excludePatterns) &&
      hasPhrases(file, phrases.list),
  );

  const result = (markerStats?.dirs ?? []) // sort directories to the top
    .sort((a, b) => a.localeCompare(b))
    .map((dir) => ({ path: dir, isDir: true }))
    .concat(
      Array.from(new Set([...filesWithMarker, ...filesWithPhrases]).values())
        .filter(
          (file) =>
            // if the directory is already marked, skip all of its sub-dirs and files
            !markerStats ||
            markerStats.dirs.every((dir) => !file.startsWith(`${dir}/`)),
        )
        .map((file) => {
          const res = { path: file };
          if (markerStats?.sections.some((section) => section === file)) {
            res.hasMarkerSection = true;
          }
          if (filesWithPhrases.includes(file)) {
            res.hasPhrase = true;
            if (!filesWithMarker.includes(file)) {
              res.hasPhraseOnly = true;
            }
          }
          return res;
        }),
    );

  return result;
};

const findViolations = ({
  /* e.g. marker: { key: 'internal' } */
  marker,
  /* e.g. bannedPhrases: { list: [], excludePatterns: [] } */
  bannedPhrases,
  /* micromatch glob patterns */
  /** NOTE: we should really only use this for files that do not allow marker comments: e.g. JSON, generated files */
  bannedPatterns = [],
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
}) => {
  const violations = findFiles({
    marker,
    useMarkerScope: true,
    phrases: bannedPhrases,
    includePatterns,
    excludePatterns,
  });

  const bannedFiles = Array.from(
    new Set(
      execSync('git ls-files', { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(
          (file) =>
            !GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
            (!includePatterns.length ||
              micromatch.isMatch(file, includePatterns)) &&
            !GENERIC_EXCLUDE_PATTERNS.some((pattern) => pattern.test(file)) &&
            (!bannedPatterns.length ||
              micromatch.isMatch(file, bannedPatterns)) &&
            !micromatch.isMatch(file, excludePatterns) &&
            fs.existsSync(file) &&
            !fs.lstatSync(file).isDirectory() &&
            !isBinaryFileSync(file),
        ),
    ).values(),
  );

  // check if banned files violations are already marked by markers
  bannedFiles.forEach((file) => {
    if (
      violations
        .map((violation) => violation.path)
        .every((dir) => !file.startsWith(`${dir}/`))
    ) {
      violations.push({ path: file, isBanned: true });
    }
  });

  return violations;
};

const reportViolations = ({
  /* e.g. marker: { key: 'internal' } */
  marker,
  /* e.g. bannedPhrases: { list: [], excludePatterns: [] } */
  bannedPhrases,
  /* micromatch glob patterns */
  /** NOTE: we should really only use this for files that do not allow marker comments: e.g. JSON, generated files */
  bannedPatterns = [],
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  messageFormatter,
  helpMessage,
}) => {
  const violations = findViolations({
    marker,
    bannedPhrases,
    bannedPatterns,
    includePatterns,
    excludePatterns,
  });

  if (violations.length > 0) {
    exitWithError(
      `${
        messageFormatter
          ? messageFormatter(violations)
          : `Found ${violations.length} violation(s):`
      }:\n${violations
        .map(
          (file) =>
            `${
              file.hasMarkerSection
                ? `${chalk.bold.yellow('o')} ${file.path} ${chalk.bold.yellow(
                    '(section)',
                  )}`
                : `${chalk.red('\u2717')} ${file.path}${
                    file.isDir ? ` ${chalk.grey('[DIR]')}` : ''
                  }`
            }${
              file.hasPhraseOnly || (file.hasMarkerSection && file.hasPhrase)
                ? ` ${chalk.bold.red('(phrase)')}`
                : ''
            }${file.isBanned ? ` ${chalk.bold.red('(banned)')}` : ''}`,
        )
        .join('\n')}${helpMessage ? `\n${helpMessage}` : ''}`,
    );
  } else {
    console.log('No issues found!');
  }
};

module.exports = {
  findViolations,
  reportViolations,
};
