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

const chalk = require('chalk');
const { exec } = require('child_process');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

// NOTE: since `chalk` uses `supports-color`, we must set `FORCE_COLOR` flag to preserve
// color for child processes
// See https://github.com/chalk/supports-color
process.env.FORCE_COLOR = true;

const prePushCheck = () => {
  let toRunLinting = false;
  let toRunTest = false;
  const runTests = () => {
    if (toRunTest) {
      console.info(`${chalk.gray('i [pre-push-check]')} : Running tests...`);
      const testExec = exec('npm run test', error => {
        if (error) {
          console.log();
          console.log(`${chalk.redBright('x')}${chalk.gray(' [pre-push-check]')} : ${chalk.redBright('Test(s) failed!')}`);
          console.log(`${chalk.gray('i [pre-push-check]')} : Aborting...`);
          process.exit(1);
        }
        console.log();
        console.log(`${chalk.gray('i [pre-push-check]')} : All tests passed!`);
        console.log();
        readline.close();
      });
      testExec.stdout.pipe(process.stdout);
      testExec.stderr.pipe(process.stderr);
    }
  };
  readline.question(`${chalk.gray('i [pre-push-check]')} : ${chalk.greenBright('Run linter with advanced rules before pushing code? (y/n) ')}`, answer => {
    if (['yes', 'y'].includes(answer.toLowerCase())) {
      toRunLinting = true;
    }
    readline.question(`${chalk.gray('i [pre-push-check]')} : ${chalk.greenBright('Run tests before pushing code? (y/n) ')}`, answer => {
      if (['yes', 'y'].includes(answer.toLowerCase())) {
        toRunTest = true;
      }
      readline.close();
      console.log();
      if (toRunLinting) {
        const startTime = Date.now();
        console.info(`${chalk.gray('i [pre-push-check]')} : Linting project...`);
        const lintExec = exec('npm run lint', error => {
          if (error) {
            console.log(`${chalk.redBright('x')}${chalk.gray(' [pre-push-check]')} : ${chalk.redBright(`Linting failed! [${Date.now() - startTime}ms]`)}`);
            console.log(`${chalk.gray('i [pre-push-check]')} : Aborting...`);
            process.exit(1);
          }
          console.log(`${chalk.gray('i [pre-push-check]')} : Linting passed succesfully! [${Date.now() - startTime}ms]`);
          console.log();
          runTests();
        });
        lintExec.stdout.pipe(process.stdout);
        lintExec.stderr.pipe(process.stderr);
      } else {
        runTests();
      }
    });
  });
};

console.log(`${chalk.yellowBright('\nNOTICE: Build pipeline will run tests and linting with advanced rules\n' +
  'so it is recommended to run these checks before pushing. Please see your options below:\n')}`);
prePushCheck();
