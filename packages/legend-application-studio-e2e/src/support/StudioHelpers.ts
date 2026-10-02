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

import { expect, type Locator, type Page } from '@playwright/test';
import { TEST_PROJECT_ID, TEST_WORKSPACE_ID } from './TEST_DATA__SDLC.js';

/**
 * UI helpers for driving the workspace editor: opening the test workspace,
 * switching between form and text mode, editing the grammar, and reading
 * what the form editors show.
 */

export const WORKSPACE_URL = `edit/${TEST_PROJECT_ID}/${TEST_WORKSPACE_ID}/`;

// --------------------------------- Locators ---------------------------------

export const getExplorer = (page: Page): Locator =>
  page.getByTestId('explorer-trees');

export const getStatusBar = (page: Page): Locator =>
  page.getByTestId('status-bar');

/** The text mode editor, while the workspace is in text mode. */
export const getGrammarEditor = (page: Page): Locator =>
  page.locator('.editor-group').filter({
    has: page.getByRole('button', { name: 'Exit Text Mode' }),
  });

/** The inputs holding the property names of the class open in form mode. */
export const getPropertyNameInputs = (page: Page): Locator =>
  page.getByTestId('class-form-editor').getByPlaceholder('Property name');

export const getClassEditor = (page: Page): Locator =>
  page.getByTestId('class-form-editor');

export const getFunctionEditor = (page: Page): Locator =>
  page.getByTestId('function-editor');

/**
 * The code editors for the bodies of derived properties, constraints or
 * functions in form mode (within `scope`, e.g. a class editor).
 */
export const getLambdaEditors = (scope: Locator): Locator =>
  scope.locator('.lambda-editor');

/**
 * Where a form's code editor shows the parser or compilation error of the
 * body it holds (within `scope`).
 */
export const getLambdaErrors = (scope: Locator): Locator =>
  scope.locator('.lambda-editor__error-feedback');

/** The tab selected in the class editor, e.g. `Derived Properties`. */
export const getSelectedClassEditorTab = (page: Page): Locator =>
  getClassEditor(page).locator('.uml-element-editor__tab--active');

/** The element editor tabs open in form mode. */
export const getTabs = (page: Page): Locator =>
  page.getByTestId('tab-manager__tab');

/**
 * The status bar's summary of the workspace's local changes:
 * `no changes detected`, or `N unpushed changes`.
 */
export const getLocalChangesStatus = (page: Page): Locator =>
  getStatusBar(page).getByText(/no changes detected|unpushed changes?$/);

// -------------------------------- Navigation --------------------------------

/** Open the test workspace, and wait for its model to show in form mode. */
export const openWorkspace = async (page: Page): Promise<void> => {
  await page.goto(WORKSPACE_URL);
  await expect(
    getExplorer(page).getByText('model', { exact: true }),
  ).toBeVisible();
};

/**
 * Open an element in its form editor from the explorer, e.g.
 * `openElement(page, 'model::Person')`.
 */
export const openElement = async (page: Page, path: string): Promise<void> => {
  const segments = path.split('::');
  const explorer = getExplorer(page);
  for (const [index, segment] of segments.entries()) {
    const node = explorer.getByText(segment, { exact: true }).first();
    const isElement = index === segments.length - 1;
    // expand packages that aren't open yet (the next segment isn't showing)
    if (
      isElement ||
      !(await explorer
        .getByText(segments[index + 1] as string, { exact: true })
        .first()
        .isVisible())
    ) {
      await node.click();
    }
  }
};

/**
 * Open the class at `path` in form mode, and expect its properties to be
 * `names`, in order.
 */
export const expectClassProperties = async (
  page: Page,
  path: string,
  names: string[],
): Promise<void> => {
  await openElement(page, path);
  const inputs = getPropertyNameInputs(page);
  await expect(inputs).toHaveCount(names.length);
  await expect
    .poll(() =>
      inputs.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value),
      ),
    )
    .toEqual(names);
};

/**
 * How long the app's change detection may take to react to the graph
 * changing: it is throttled to run at most once a second (see
 * `ChangeDetectionState.start()`), plus some slack.
 */
export const CHANGE_DETECTION_DELAY = 2_500;

/**
 * Expect `assertion` to keep holding for `duration` ms. Web-first assertions
 * return as soon as they hold, so they can't check that something does _not_
 * happen later — e.g. that throttled change detection doesn't report
 * changes a second after the graph changed.
 */
export const expectToHold = async (
  page: Page,
  assertion: () => Promise<void>,
  duration: number,
): Promise<void> => {
  const end = Date.now() + duration;
  do {
    await assertion();
    await page.waitForTimeout(250);
  } while (Date.now() < end);
};

/** Expect the status bar to report no local changes, and keep doing so. */
export const expectNoLocalChanges = async (page: Page): Promise<void> => {
  await expect(getLocalChangesStatus(page)).toHaveText('no changes detected');
  await expectToHold(
    page,
    async () => {
      expect(await getLocalChangesStatus(page).innerText()).toBe(
        'no changes detected',
      );
    },
    CHANGE_DETECTION_DELAY,
  );
};

/** Push the workspace's local changes, from the status bar. */
export const pushLocalChanges = async (page: Page): Promise<void> => {
  await getStatusBar(page)
    .getByRole('button', { name: 'Push local changes (Ctrl + S)' })
    .click();
};

// --------------------------------- Modes -----------------------------------

/** Switch the workspace from form mode to text mode. */
export const enterTextMode = async (page: Page): Promise<void> => {
  await getStatusBar(page)
    .getByRole('button', { name: 'Toggle text mode (F8)' })
    .click();
  await expect(getGrammarEditor(page).locator('.view-lines')).toContainText(
    'Class',
  );
};

/**
 * Ask to leave text mode. Whether the workspace gets back to form mode
 * depends on whether the grammar compiles — assert on that separately
 * (e.g. with {@link expectFormMode}).
 */
export const clickExitTextMode = async (page: Page): Promise<void> => {
  await getGrammarEditor(page)
    .getByRole('button', { name: 'Exit Text Mode' })
    .click();
};

export const expectFormMode = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('button', { name: 'Exit Text Mode' }),
  ).toHaveCount(0);
  await expect(
    getStatusBar(page).getByRole('button', { name: 'Toggle text mode (F8)' }),
  ).toBeVisible();
};

export const expectTextMode = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('button', { name: 'Exit Text Mode' }),
  ).toBeVisible();
};

// ------------------------------- Text editing -------------------------------

const focusGrammarEditor = async (page: Page): Promise<void> => {
  await getGrammarEditor(page).locator('.view-lines').click();
};

/**
 * The whole grammar in the text mode editor, with `\n` line endings whatever
 * the platform's. (The editor only renders the lines in view, so this copies
 * it out rather than reading the DOM.)
 */
export const getGrammarText = async (page: Page): Promise<string> => {
  await focusGrammarEditor(page);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+C');
  await page.keyboard.press('ControlOrMeta+Home');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  return text.replace(/\r\n/gu, '\n');
};

/**
 * Replace the whole content of a code editor (e.g. the text mode editor, or
 * the editor of a derived property's body in form mode) with `text`, by
 * pasting it: typed text would be auto-indented line by line, and have its
 * brackets and quotes auto-closed, shifting every column the engine reports.
 */
export const pasteIntoCodeEditor = async (
  page: Page,
  editor: Locator,
  text: string,
): Promise<void> => {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  // (click the editor's own box, near its start: its text layer can be
  // wider than the editor, and scrolled sideways under the panels beside it)
  await editor
    .locator('.monaco-editor')
    .first()
    .click({ position: { x: 70, y: 8 } });
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
};

/** Replace the whole grammar in the text mode editor with `text`. */
export const setGrammarText = async (
  page: Page,
  text: string,
): Promise<void> => {
  await pasteIntoCodeEditor(page, getGrammarEditor(page), text);
  await expect.poll(() => getGrammarText(page)).toBe(text);
};

/**
 * Edit the grammar in the text mode editor: replace the first occurrence of
 * `search` with `replacement`.
 */
export const replaceInGrammar = async (
  page: Page,
  search: string,
  replacement: string,
): Promise<void> => {
  const text = await getGrammarText(page);
  expect(text, `the grammar should contain ${search}`).toContain(search);
  await setGrammarText(page, text.replace(search, replacement));
};

/** The (1-based) number of the first line of `grammar` containing `fragment`. */
export const getLineNumber = (grammar: string, fragment: string): number => {
  const index = grammar
    .split('\n')
    .findIndex((line) => line.includes(fragment));
  expect(index, `the grammar should contain ${fragment}`).not.toBe(-1);
  return index + 1;
};

/** Move the text mode editor's cursor to the first line. */
export const moveCursorToStart = async (page: Page): Promise<void> => {
  await focusGrammarEditor(page);
  await page.keyboard.press('ControlOrMeta+Home');
};

/** The line the text mode editor's cursor is on. */
export const getCursorLine = async (page: Page): Promise<number> =>
  Number(
    await getGrammarEditor(page).locator('.active-line-number').textContent(),
  );

/**
 * The lines, among those in view, that the text mode editor marks with an
 * error squiggle. (The editor draws each line's markers in an overlay row
 * placed at the same height as the line's number.)
 */
export const getErrorLines = (page: Page): Promise<number[]> =>
  getGrammarEditor(page).evaluate((root) => {
    const lineNumberByTop = new Map<string, number>();
    root.querySelectorAll('.margin-view-overlays > div').forEach((row) => {
      const lineNumber = row.querySelector('.line-numbers')?.textContent;
      if (lineNumber) {
        lineNumberByTop.set((row as HTMLElement).style.top, Number(lineNumber));
      }
    });
    return Array.from(root.querySelectorAll('.view-overlays > div'))
      .filter((row) => row.querySelector('.squiggly-error'))
      .map((row) => lineNumberByTop.get((row as HTMLElement).style.top) ?? -1)
      .sort((a, b) => a - b);
  });

/** Compile the workspace, in form mode or text mode. */
export const compile = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Compile (F9)' }).first().click();
};

/**
 * Wait for the compile in progress to finish, including what the app does
 * after notifying its result (rebuilding the graph, recomputing local
 * changes). Call once the result is notified: the status bar's compile
 * button stays disabled until then.
 */
export const waitForCompileToFinish = async (page: Page): Promise<void> => {
  await expect(
    getStatusBar(page).getByRole('button', { name: 'Compile (F9)' }),
  ).toBeEnabled();
};

// --------------------------------- Problems ---------------------------------

/**
 * The status bar's problem counts; its title reads e.g.
 * `Error: 1, Warnings: 0`, or `Warnings: 0` when there is no error.
 */
export const getProblemsIndicator = (page: Page): Locator =>
  // (no `u` flag: Playwright can't pass it on to its selector engine)
  getStatusBar(page).getByTitle(/Warnings: \d+$/);

/** The problems listed in the Problems panel, once open. */
export const getProblems = (page: Page): Locator =>
  page.locator('.panel-group__problem');

/** Open the Problems panel, from the status bar's problem counts. */
export const openProblemsPanel = async (page: Page): Promise<void> => {
  await getProblemsIndicator(page).click();
  await expect(
    page
      .locator('.panel-group__problem, .panel-group__problems__placeholder')
      .first(),
  ).toBeVisible();
};

/**
 * Where a problem listed in the Problems panel is, as the panel shows it in
 * text mode (`[Ln 11, Col 16]`).
 */
export const getProblemLocation = async (
  problem: Locator,
): Promise<{ line: number; column: number }> => {
  const match = /\[Ln (?<line>\d+), Col (?<column>\d+)\]/u.exec(
    await problem.innerText(),
  );
  expect(match, 'the problem should show its location').not.toBeNull();
  return {
    line: Number(match?.groups?.line),
    column: Number(match?.groups?.column),
  };
};

// ------------------------------ Notifications ------------------------------

/** Expect the app to have notified the user with `message`. */
export const expectNotification = async (
  page: Page,
  message: string | RegExp,
): Promise<void> => {
  await expect(page.getByText(message).first()).toBeVisible();
};
