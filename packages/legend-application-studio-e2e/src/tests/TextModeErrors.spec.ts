/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect, type Page } from '@playwright/test';
import { getEngineCalls } from '../support/EngineSpy.js';
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import {
  compile,
  enterTextMode,
  expectNotification,
  expectTextMode,
  getCursorLine,
  getErrorLines,
  getGrammarText,
  getLineNumber,
  getProblemLocation,
  getProblems,
  getProblemsIndicator,
  moveCursorToStart,
  openProblemsPanel,
  openWorkspace,
  setGrammarText,
} from '../support/StudioHelpers.js';

/**
 * How text mode reports a grammar that doesn't parse or compile: where the
 * error is marked, how the user gets to it, and how it clears once fixed.
 *
 * Messages are matched on their stable part only: the real engine words
 * them, and may add detail (e.g. the valid alternatives) over time.
 */

const GRAMMAR_TO_JSON = 'pure/v1/grammar/grammarToJson/model';
const COMPILE = 'pure/v1/compilation/compile';

const AGE = 'age: Integer[0..1];';
const AGE_WITH_TYPO = 'age: Integr[0..1];';

let backends: StudioBackends;

/**
 * Edit the grammar with `edit`, move the cursor away to the first line, and
 * compile — so that where the cursor ends up is where the app put it.
 * Returns the edited grammar.
 */
const compileEdited = async (
  page: Page,
  edit: (grammar: string) => string,
): Promise<string> => {
  const grammar = edit(await getGrammarText(page));
  await setGrammarText(page, grammar);
  await moveCursorToStart(page);
  await compile(page);
  return grammar;
};

/**
 * Expect the error to be marked on `line`, and the cursor taken to it — in
 * view, since only lines in view are rendered.
 */
const expectErrorMarkedOn = async (page: Page, line: number): Promise<void> => {
  await expect.poll(() => getErrorLines(page)).toEqual([line]);
  expect(await getCursorLine(page)).toBe(line);
};

test.beforeEach(async ({ page }) => {
  backends = await setupStudio(page);
  await openWorkspace(page);
  await enterTextMode(page);
});

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test.describe('compilation errors', () => {
  test('are marked on their line, with the cursor taken there', async ({
    page,
  }) => {
    const grammar = await compileEdited(page, (text) =>
      text.replace(AGE, AGE_WITH_TYPO),
    );

    await expectNotification(
      page,
      /Compilation failed: Can't find type 'Integr'/,
    );
    await expectErrorMarkedOn(page, getLineNumber(grammar, AGE_WITH_TYPO));
    await expectTextMode(page);
  });

  test('below the fold are scrolled into view', async ({ page }) => {
    // push `model::Firm` well out of view, then break it
    const grammar = await compileEdited(page, (text) =>
      text
        .replace(
          'Class model::Firm',
          `${'// padding\n'.repeat(60)}Class model::Firm`,
        )
        .replace('legalName: String[1];', 'legalName: Strng[1];'),
    );

    await expectNotification(
      page,
      /Compilation failed: Can't find type 'Strng'/,
    );
    await expectErrorMarkedOn(page, getLineNumber(grammar, 'legalName'));
  });

  test('are counted in the status bar, and listed with their location in the Problems panel', async ({
    page,
  }) => {
    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Warnings: 0',
    );
    const grammar = await compileEdited(page, (text) =>
      text.replace(AGE, AGE_WITH_TYPO),
    );
    const line = getLineNumber(grammar, AGE_WITH_TYPO);

    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Error: 1, Warnings: 0',
    );
    await openProblemsPanel(page);
    const problem = getProblems(page);
    await expect(problem).toHaveCount(1);
    await expect(problem).toContainText("Can't find type 'Integr'");
    expect(await getProblemLocation(problem)).toEqual({
      line,
      column: (grammar.split('\n')[line - 1] ?? '').indexOf('Integr') + 1,
    });

    // the problem takes the user back to the error
    await moveCursorToStart(page);
    await problem.click();
    await expect.poll(() => getCursorLine(page)).toBe(line);
  });

  test('clear from the editor on the next edit, and for good once fixed', async ({
    page,
  }) => {
    const grammar = await compileEdited(page, (text) =>
      text.replace(AGE, AGE_WITH_TYPO),
    );
    await expectErrorMarkedOn(page, getLineNumber(grammar, AGE_WITH_TYPO));

    // any edit clears the marker, but the error stands until the next compile
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect.poll(() => getErrorLines(page)).toEqual([]);
    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Error: 1, Warnings: 0',
    );
    await openProblemsPanel(page);
    await expect(
      page.getByText('The following result might be stale'),
    ).toBeVisible();

    // fixed and compiled, the error is gone
    await compileEdited(page, (text) => text.replace(AGE_WITH_TYPO, AGE));
    await expectNotification(page, 'Compiled successfully');
    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Warnings: 0',
    );
    await expect(
      page.getByText('No problems have been detected in the workspace.'),
    ).toBeVisible();
    expect(await getErrorLines(page)).toEqual([]);
  });
});

test.describe('parser errors', () => {
  const PARSER_ERROR_CASES: {
    name: string;
    edit: (grammar: string) => string;
    message: RegExp;
    /** The line the error is on, where the engine's position is meaningful. */
    line?: (grammar: string) => number;
  }[] = [
    {
      name: 'a missing semicolon, reported at the next token',
      edit: (text) => text.replace(AGE, 'age: Integer[0..1]'),
      message: /Unexpected token '\}'/,
      line: (grammar) => getLineNumber(grammar, 'age: Integer') + 1,
    },
    {
      name: 'a misspelled keyword on the first line',
      edit: (text) => `Clas model::Oops\n{\n}\n${text}`,
      message: /Unexpected token 'Clas'/,
      line: () => 1,
    },
    {
      name: 'an element left open at the end of the file',
      edit: (text) => `${text}\nClass model::Broken\n{\n  name: String[1];\n`,
      message: /Unexpected token/,
      // where the file ends, on the empty line after its last newline
      line: (grammar) => grammar.split('\n').length,
    },
    {
      // the engine points after the section header, so only check that the
      // editor and the Problems panel agree on where the error is
      name: 'an unknown section',
      edit: (text) => `###Bogus\nwhatever\n${text}`,
      message: /'Bogus' is not a known section parser/,
    },
  ];

  for (const { name, edit, message, line } of PARSER_ERROR_CASES) {
    test(name, async ({ page }) => {
      const grammar = await compileEdited(page, edit);

      await expectNotification(page, message);
      await openProblemsPanel(page);
      const location = await getProblemLocation(getProblems(page));
      if (line) {
        expect(location.line).toBe(line(grammar));
      }
      await expectErrorMarkedOn(page, location.line);

      // rejected by the parser: the grammar never reached the compiler
      expect(
        getEngineCalls(backends.engine, GRAMMAR_TO_JSON).at(-1)?.status,
      ).toBe(400);
      expect(getEngineCalls(backends.engine, COMPILE)).toHaveLength(0);
      await expectTextMode(page);
    });
  }
});
