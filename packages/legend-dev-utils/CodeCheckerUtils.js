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

import { dirname } from 'path';
import { existsSync, lstatSync } from 'fs';
import micromatch from 'micromatch';
import { execSync } from 'child_process';
import { isBinaryFileSync } from 'isbinaryfile';
import chalk from 'chalk';
import { getFileContent, exitWithError } from './DevUtils.js';

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

const collectMarkerStats = (filesWithMarker, markerSet, groupByDirectory) => {
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
    if (fileContent.includes(markerSet.dirMarker)) {
      dirs.add(dirname(file));
    }
    if (fileContent.includes(markerSet.fileMarker)) {
      files.add(file);
    }
    if (
      fileContent.includes(markerSet.startSectionMarker) ||
      fileContent.includes(markerSet.endSectionMarker)
    ) {
      sections.add(file);
    }
  });
  result.dirs = Array.from(dirs.values());
  if (groupByDirectory) {
    // simplify stats - if a directory includes file or section, the latter will not be listed
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
  } else {
    result.files = Array.from(files.values());
    result.sections = Array.from(sections.values());
  }
  return result;
};

export const findFiles = ({
  marker,
  phrases,
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  groupByDirectory,
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
        existsSync(file) &&
        !lstatSync(file).isDirectory() &&
        !isBinaryFileSync(file),
    );

  const markerSet = generateMarkerSet(marker.key);
  const filesWithMarker = files.filter((file) =>
    hasPhrases(file, [markerSet.marker]),
  );
  const markerStats = collectMarkerStats(
    filesWithMarker,
    markerSet,
    groupByDirectory,
  );

  const filesWithPhrases = files.filter(
    (file) =>
      !micromatch.isMatch(file, phrases.excludePatterns) &&
      hasPhrases(file, phrases.list),
  );

  const result = markerStats.dirs // sort directories to the top
    .toSorted((a, b) => a.localeCompare(b))
    .map((dir) => ({
      path: dir,
      hasMarker: true,
      hasDirectoryMarker: true,
      hasPhrase: filesWithPhrases.some((file) => file.startsWith(dir)),
    }))
    .concat(
      Array.from(new Set([...filesWithMarker, ...filesWithPhrases]).values())
        .filter(
          (file) =>
            !groupByDirectory ||
            // if the directory is already marked, skip all of its sub-dirs and files
            markerStats.dirs.every((dir) => !file.startsWith(`${dir}/`)),
        )
        .map((file) => {
          const res = { path: file };
          if (markerStats.sections.some((section) => section === file)) {
            res.hasSectionMarker = true;
          }
          if (filesWithPhrases.includes(file)) {
            res.hasPhrase = true;
          }
          if (filesWithMarker.includes(file)) {
            res.hasMarker = true;
          }
          return res;
        }),
    );

  return result;
};

export const findMatches = ({
  /* e.g. marker: { key: 'internal' } */
  marker,
  /* e.g. phrases: { list: [], excludePatterns: [] } */
  phrases,
  /**
   * If files or directories match this, they are automatically counted.
   * We should really only use this for files that do not allow marker comments: e.g. JSON, generated files
   *
   * micromatch glob patterns
   */
  forceMatchPatterns = [],
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  groupByDirectory,
}) => {
  const foundFiles = findFiles({
    marker,
    groupByDirectory,
    phrases,
    includePatterns,
    excludePatterns,
  });

  const forceMatchFiles = Array.from(
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
            forceMatchPatterns.length &&
            micromatch.isMatch(file, forceMatchPatterns) &&
            !micromatch.isMatch(file, excludePatterns) &&
            existsSync(file) &&
            !lstatSync(file).isDirectory() &&
            !isBinaryFileSync(file),
        ),
    ).values(),
  );

  // add to the list force-matches that are not already in the result set
  forceMatchFiles.forEach((file) => {
    if (
      foundFiles
        .map((_file) => _file.path)
        .every((_path) => !file.startsWith(`${_path}/`))
    ) {
      foundFiles.push({ path: file, isForceMatched: true });
    }
  });

  return foundFiles;
};

export const reportMatches = ({
  /* e.g. marker: { key: 'internal' } */
  marker,
  /* e.g. phrases: { list: [], excludePatterns: [] } */
  phrases,
  /**
   * If files or directories match this, they are automatically counted.
   * We should really only use this for files that do not allow marker comments: e.g. JSON, generated files
   *
   * micromatch glob patterns
   */
  forceMatchPatterns = [],
  /* micromatch glob patterns */
  includePatterns = [],
  /* micromatch glob patterns */
  excludePatterns = [],
  groupByDirectory,
  messageFormatter,
  helpMessage,
}) => {
  const foundMatches = findMatches({
    marker,
    phrases,
    forceMatchPatterns,
    includePatterns,
    excludePatterns,
    groupByDirectory,
  });

  if (foundMatches.length > 0) {
    exitWithError(
      `${
        messageFormatter
          ? messageFormatter(foundMatches)
          : `Found ${foundMatches.length} matches:`
      }:\n${foundMatches
        .map((match) => {
          const status = [
            match.hasMarker && chalk.cyan('(marker)'),
            match.hasDirectoryMarker && chalk.cyan('(DIR)'),
            match.hasSectionMarker && chalk.cyan('(section)'),
            match.isForceMatched && chalk.yellow('(force-matched)'),
            match.hasPhrase && chalk.red('(phrase)'),
          ].filter(Boolean);
          return `${chalk.grey(match.path)} ${status.join(' ')}`;
        })
        .join('\n')}${helpMessage ? `\n${helpMessage}` : ''}`,
    );
  } else {
    console.log('No issues found!');
  }
};
