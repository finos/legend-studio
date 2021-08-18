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

import chalk from 'chalk';
import strip from 'strip-ansi';
import table from 'text-table';
import wrap from 'wrap-ansi';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const CONTENT_LINE_LENGTH = 72;
const PLUGIN_NAME = 'ForkTsCheckerWebpackFormatterPlugin';

class ForkTsCheckerWebpackFormatterPlugin {
  apply(compiler) {
    const tsCheckerHooks =
      ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);
    let typeCheckingStartTime;
    tsCheckerHooks.start.tap(PLUGIN_NAME, () => {
      // this hook is called when type checking is started, so we can reset the time here
      typeCheckingStartTime = Date.now();
    });
    tsCheckerHooks.error.tap(PLUGIN_NAME, (error) => console.error(error));
    tsCheckerHooks.waiting.tap(PLUGIN_NAME, () => {
      // since a chunk of time is spent on waiting for webpack to compile, on the very first type checking
      // the elapsed time then will be off, and since this hook is called only on the first type checking
      // we set the time here so we can compute the elapsed time right after compilation to when type
      // checking report is complete
      typeCheckingStartTime = Date.now();
      console.info(`${chalk.gray('i [ts]')} : Asynchronously checking type...`);
    });
    tsCheckerHooks.issues.tap(PLUGIN_NAME, (issues, compilation) => {
      const errors = compilation.errors
        .filter((error) => error.message)
        .map((error) => ({
          message: error.message,
          severity: 'error',
          file: 'Compilation Issues:',
        }));
      const warnings = compilation.warnings
        .filter((warning) => warning.message)
        .map((warning) => ({
          message: warning.message,
          severity: 'warning',
          file: 'Compilation Issues:',
        }));
      issues = errors.concat(warnings).concat(issues);
      const issuesByFile = new Map();
      issues.forEach((issue) => {
        const file = issue.file;
        if (!issuesByFile.has(file)) {
          issuesByFile.set(file, []);
        }
        issuesByFile.get(file).push({
          file: issue.file,
          message: issue.message,
          code: issue.code ?? 'unknown',
          // NOTE: ignore end location for now
          line: issue.location?.start.line ?? 0,
          column: issue.location?.start.column ?? 0,
          level: issue.severity,
        });
      });
      // Sort issues by location within a file
      Array.from(issuesByFile.keys()).forEach((file) =>
        issuesByFile.set(
          file,
          issuesByFile
            .get(file)
            .sort((a, b) => a.column - b.column)
            .sort((a, b) => a.line - b.line),
        ),
      );
      // Scan and tokenize error/warning message and wrap long message
      const rows = [];
      const fileLineMap = new Map();
      issuesByFile.forEach((items, filePath) => {
        let lineNumber = 0;
        const colors = { error: 'red', warning: 'yellow' };
        items.forEach((item) => {
          const message = wrap(item.message, CONTENT_LINE_LENGTH, {
            hard: true,
          });
          const lines = message.split('\n');
          rows.push([
            '',
            chalk.dim(`${item.line}:${item.column}`),
            chalk[colors[item.level]](item.level),
            chalk.blue(lines[0]),
            item.code,
          ]);
          lineNumber++;
          for (const line of lines.slice(1)) {
            rows.push(['', '', '', chalk.blue(line)]);
            lineNumber++;
          }
        });
        fileLineMap.set(filePath, lineNumber);
      });
      // Try to align messages between file by forming a table
      let tableFromAllLines = [];
      let skipFormatting = false; // if table forming failed, fall back to normal formatting (using tabs)
      try {
        tableFromAllLines = table(rows, {
          align: ['', 'l', 'l', 'l', 'l'],
          stringLength: (str) => strip(str).length,
        }).split('\n');
      } catch (error) {
        console.warn(`Can't format message`, error.message); // handle error as sometimes `table()` throws on long compilation messages
        skipFormatting = true;
      }
      // Print result
      let lineCounter = 0;
      issuesByFile.forEach((items, filePath) => {
        let result = [];
        if (skipFormatting) {
          result.push('', chalk.underline(filePath));
          result = result.concat(
            rows
              .slice(lineCounter, lineCounter + fileLineMap.get(filePath))
              .map((row) => row.join('\t')),
          );
          lineCounter += fileLineMap.get(filePath);
        } else {
          result.push('', chalk.underline(filePath));
          result = result.concat(
            tableFromAllLines.slice(
              lineCounter,
              lineCounter + fileLineMap.get(filePath),
            ),
          );
          lineCounter += fileLineMap.get(filePath);
        }
        console.info(result.join('\n'));
      });
      // Summary
      const time = Math.round(Date.now() - typeCheckingStartTime);
      const warningCount = issues.filter(
        (issue) => issue.severity === 'warning',
      ).length;
      const errorCount = issues.filter(
        (issue) => issue.severity === 'error',
      ).length;
      if (!(errorCount + warningCount)) {
        console.info(
          `${chalk.gray(
            'i [ts]',
          )} : Type checking passed successfully! [${time}ms]`,
        );
      } else if (!errorCount) {
        console.info(
          `\n${chalk.yellowBright('!')}${chalk.gray(
            ' [ts]',
          )} : ${chalk.yellowBright(
            `Type checking passed with warning(s)! [${time}ms]`,
          )}`,
        );
      } else {
        console.info(
          `\n${chalk.redBright('x')}${chalk.gray(' [ts]')} : ${chalk.redBright(
            `Type checking failed! [${time}ms]`,
          )}`,
        );
      }
      // NOTE: since we have already reported all the issues here, we want to pass no more errors down to webpack
      return [];
    });
  }
}

export default ForkTsCheckerWebpackFormatterPlugin;
