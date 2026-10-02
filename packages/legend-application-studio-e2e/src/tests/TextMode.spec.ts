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

import { test, expect, type Locator, type Page } from '@playwright/test';
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import {
  clickExitTextMode,
  compile,
  enterTextMode,
  expectClassProperties,
  expectFormMode,
  expectNotification,
  expectTextMode,
  getCursorLine,
  getErrorLines,
  getGrammarText,
  getLineNumber,
  getProblemsIndicator,
  getPropertyNameInputs,
  getStatusBar,
  openElement,
  openWorkspace,
  replaceInGrammar,
} from '../support/StudioHelpers.js';

/**
 * Switching the workspace between form mode and text mode, and what happens
 * when the grammar doesn't compile along the way. (How the errors themselves
 * are reported is covered in `TextModeErrors.spec.ts`.)
 */

const AGE = 'age: Integer[0..1];';
const AGE_WITH_TYPO = 'age: Integr[0..1];';
const AGE_AND_NICKNAME = `${AGE}\n    nickname: String[0..1];`;

let backends: StudioBackends;

const expectPersonProperties = (page: Page, names: string[]): Promise<void> =>
  expectClassProperties(page, 'model::Person', names);

const getNotCompiledAlert = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ hasText: 'Project is not in a compiled state' });

test.beforeEach(async ({ page }) => {
  backends = await setupStudio(page);
  await openWorkspace(page);
});

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test.describe('round trips', () => {
  test('entering text mode shows the model as grammar', async ({ page }) => {
    await enterTextMode(page);

    const grammar = await getGrammarText(page);
    expect(grammar).toContain('Enum model::IncType');
    expect(grammar).toContain('Class model::Person');
    expect(grammar).toContain(AGE);
    expect(grammar).toContain('employees: model::Person[*];');
  });

  test('a property added in text mode shows in form mode', async ({ page }) => {
    await enterTextMode(page);
    await replaceInGrammar(page, AGE, AGE_AND_NICKNAME);
    await clickExitTextMode(page);

    await expectFormMode(page);
    await expectPersonProperties(page, [
      'firstName',
      'lastName',
      'age',
      'nickname',
    ]);
  });

  test('a property renamed in form mode shows in text mode', async ({
    page,
  }) => {
    await openElement(page, 'model::Person');
    await getPropertyNameInputs(page).nth(2).fill('ageInYears');
    await enterTextMode(page);

    const grammar = await getGrammarText(page);
    expect(grammar).toContain('ageInYears: Integer[0..1];');
    expect(grammar).not.toContain(AGE);
  });
});

test.describe('leaving text mode with errors', () => {
  test('staying keeps the broken grammar to fix, then leaving works', async ({
    page,
  }) => {
    await enterTextMode(page);
    await replaceInGrammar(page, AGE, AGE_WITH_TYPO);
    await clickExitTextMode(page);

    // the user is asked, rather than silently losing their text
    const alert = getNotCompiledAlert(page);
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Stay' }).click();
    await expectTextMode(page);
    expect(await getGrammarText(page)).toContain(AGE_WITH_TYPO);

    // once fixed, the user leaves with their change
    await replaceInGrammar(page, AGE_WITH_TYPO, AGE_AND_NICKNAME);
    await clickExitTextMode(page);
    await expectFormMode(page);
    await expectPersonProperties(page, [
      'firstName',
      'lastName',
      'age',
      'nickname',
    ]);
  });

  test('a syntax error asks too, and staying takes the user to it', async ({
    page,
  }) => {
    await enterTextMode(page);
    // drop the semicolon ending the property
    await replaceInGrammar(page, AGE, 'age: Integer[0..1]');
    const grammar = await getGrammarText(page); // (leaves the cursor on line 1)
    await clickExitTextMode(page);

    const alert = getNotCompiledAlert(page);
    await expect(alert).toBeVisible();
    await expectNotification(page, /Compilation failed: Unexpected token '\}'/);
    await alert.getByRole('button', { name: 'Stay' }).click();

    // the parser reports the missing semicolon at the next token
    await expectTextMode(page);
    await expect
      .poll(() => getCursorLine(page))
      .toBe(getLineNumber(grammar, 'age: Integer') + 1);
  });

  test('a failed exit marks the error, as compiling does', async ({ page }) => {
    // KNOWN BUG: when leaving text mode fails, the app only takes the cursor
    // to the error (`handleCleanupFailure`). Unlike compiling (F9), it
    // doesn't record the error: the editor marks nothing, the status bar
    // counts no error, and the Problems panel says no problems have been
    // detected — leaving the user only the notification to go on. Remove
    // `test.fail()` once fixed.
    test.fail();
    await enterTextMode(page);
    await replaceInGrammar(page, AGE, 'age: Integer[0..1]');
    const grammar = await getGrammarText(page);
    await clickExitTextMode(page);
    await getNotCompiledAlert(page)
      .getByRole('button', { name: 'Stay' })
      .click();

    await expectTextMode(page);
    await expect
      .poll(() => getErrorLines(page))
      .toEqual([getLineNumber(grammar, 'age: Integer') + 1]);
    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Error: 1, Warnings: 0',
    );
  });

  test('discarding, when nothing compiled in text mode, goes back to the model as it was', async ({
    page,
  }) => {
    await enterTextMode(page);
    await replaceInGrammar(page, AGE, AGE_WITH_TYPO);
    await clickExitTextMode(page);

    const alert = getNotCompiledAlert(page);
    await alert.getByRole('button', { name: 'Discard Changes' }).click();

    await expectFormMode(page);
    await expectPersonProperties(page, ['firstName', 'lastName', 'age']);
    await expect(getStatusBar(page)).not.toContainText('unpushed changes');
  });

  test('discarding goes back to the model as it last compiled', async ({
    page,
  }) => {
    // KNOWN BUG: compiling in text mode swaps the app's graph for a "light"
    // one (elements indexed, but classes without properties and enumerations
    // without values), which leaving text mode normally rebuilds in full.
    // Discarding skips that rebuild, as the last compile on the way out
    // failed, so form mode shows the light graph: `model::Person` has no
    // properties, and every element reads as changed — pushing would strip
    // the properties and values from all of them. Remove `test.fail()` once
    // fixed.
    test.fail();
    await enterTextMode(page);
    // a change that compiles...
    await replaceInGrammar(page, AGE, AGE_AND_NICKNAME);
    await compile(page);
    await expectNotification(page, 'Compiled successfully');
    // ...then one that doesn't
    await replaceInGrammar(page, AGE, AGE_WITH_TYPO);
    await clickExitTextMode(page);

    const alert = getNotCompiledAlert(page);
    await alert.getByRole('button', { name: 'Discard Changes' }).click();

    // only what was made since the last successful compile is lost
    await expectFormMode(page);
    await expectPersonProperties(page, [
      'firstName',
      'lastName',
      'age',
      'nickname',
    ]);
  });
});
