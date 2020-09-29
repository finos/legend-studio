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

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpackConfigCreate = require('../../webpack.config.js');
const chalk = require('chalk');
const strip = require('strip-ansi');
const table = require('text-table');
const wrap = require('wrap-ansi');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

// Check for proper setup
const engineInfo = require('../../package.json').engines;
if (!semver.satisfies(process.version, engineInfo.node)) {
  console.log(`${chalk.redBright('x')}${chalk.gray(' [check]')} : ${chalk.redBright(`Node version check failed! [required ${engineInfo.node}, found ${process.version}]`)}`);
  throw new Error('Node version check failed');
}
if (!fs.existsSync(path.resolve(__dirname, '../config/config.json'))) {
  console.log(`${chalk.redBright('x')}${chalk.gray(' [check]')} : ${chalk.redBright(`Local config file is missing. Please run setup script.`)}`);
  throw new Error('Local config file is missing');
}
if (!fs.existsSync(path.resolve(__dirname, '../config/version.json'))) {
  console.log(`${chalk.redBright('x')}${chalk.gray(' [check]')} : ${chalk.redBright(`Local version file is missing. Please run setup script.`)}`);
  throw new Error('Local version file is missing');
}

// arguments
const args = process.argv.slice(2);
const useAdvancedLintingRule = args.includes('--advanced-linting');

// settings
const ENABLE_HMR = true;
const CONTENT_LINE_LENGTH = 72;

// custom dev server config (this is useful depending on developer environment (i.e company localhost/proxy with their own certs))
const SERVER_CONFIG_PATH = '../config/serverConfig.json';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', error => { throw error });

const webpackConfig = webpackConfigCreate(undefined, { mode: 'development', enableAsyncTypeCheck: true, useAdvancedLintingRule });
// Type checking
const compiler = webpack(webpackConfig);
const tsCheckerHooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);
let typeCheckingStartTime;
tsCheckerHooks.start.tap('fork-ts-checker-start', () => {
  // this hook is called when type checking is started, so we can reset the time here
  typeCheckingStartTime = Date.now();
});
tsCheckerHooks.error.tap('fork-ts-checker-error', error => console.error(error));
tsCheckerHooks.waiting.tap('fork-ts-checker-waiting', () => {
  // since a chunk of time is spent on waiting for webpack to compile, on the very first type checking
  // the elapsed time then will be off, and since this hook is called only on the first type checking
  // we set the time here so we can compute the elapsed time right after compilation to when type
  // checking report is complete
  typeCheckingStartTime = Date.now();
  console.info(`${chalk.gray('i [ts]')} : Asynchronously checking type...`);
});
tsCheckerHooks.issues.tap('fork-ts-checker-issues', (issues, compilation) => {
  const errors = compilation.errors.filter(error => error.message).map(error => ({ message: error.message, severity: 'error', file: 'Compilation Issues:' }));
  const warnings = compilation.warnings.filter(warning => warning.message).map(warning => ({ message: warning.message, severity: 'warning', file: 'Compilation Issues:' }));
  issues = errors.concat(warnings).concat(issues);
  const issuesByFile = new Map();
  issues.forEach(issue => {
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
  Array.from(issuesByFile.keys()).forEach(file => issuesByFile.set(file, issuesByFile.get(file).sort((a, b) => a.column - b.column).sort((a, b) => a.line - b.line)));
  // Scan and tokenize error/warning message and wrap long message
  const rows = [];
  const fileLineMap = new Map();
  issuesByFile.forEach((items, filePath) => {
    let lineNumber = 0;
    const { dim } = chalk;
    const colors = { error: 'red', warning: 'yellow' };
    items.forEach(item => {
      const message = wrap(item.message, CONTENT_LINE_LENGTH, { hard: true });
      const lines = message.split('\n');
      rows.push(['', dim(`${item.line}:${item.column}`), chalk[colors[item.level]](item.level), chalk.blue(lines[0]), item.code]);
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
  let skipFormatting = false; // if table forming failed, fall back to normal formattting (using tabs)
  try {
    tableFromAllLines = table(rows, {
      align: ['', 'l', 'l', 'l', 'l'],
      stringLength: str => strip(str).length
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
      result = result.concat(rows.slice(lineCounter, lineCounter + fileLineMap.get(filePath)).map(row => row.join('\t')));
      lineCounter += fileLineMap.get(filePath);
    } else {
      result.push('', chalk.underline(filePath));
      result = result.concat(tableFromAllLines.slice(lineCounter, lineCounter + fileLineMap.get(filePath)));
      lineCounter += fileLineMap.get(filePath);
    }
    console.info(result.join('\n'));
  });
  // Summary
  const time = Math.round(Date.now() - typeCheckingStartTime);
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  if (!(errorCount + warningCount)) {
    console.info(`${chalk.gray('i [ts]')} : Type checking passed succesfully! [${time}ms]`);
  } else if (!errorCount) {
    console.info(`\n${chalk.yellowBright('!')}${chalk.gray(' [ts]')} : ${chalk.yellowBright(`Type checking passed with warning(s)! [${time}ms]`)}`);
  } else {
    console.info(`\n${chalk.redBright('x')}${chalk.gray(' [ts]')} : ${chalk.redBright(`Type checking failed! [${time}ms]`)}`);
  }
  // NOTE: since we have already reported all the issues here, we want to pass no more errors down to webpack
  return [];
});

// Custom dev server configs
let webpackDevServerConfig = webpackConfig.devServer;
if (fs.existsSync(path.resolve(__dirname, SERVER_CONFIG_PATH))) {
  const serverConfig = require(SERVER_CONFIG_PATH);
  webpackDevServerConfig = { ...webpackConfig.devServer, ...serverConfig };
}

const server = new WebpackDevServer(compiler, { ...webpackDevServerConfig, hot: ENABLE_HMR });

server.listen(webpackDevServerConfig.port, webpackDevServerConfig.host);
