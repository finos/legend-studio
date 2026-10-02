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
  expectFormMode,
  expectNotification,
  expectTextMode,
  getClassEditor,
  getCursorLine,
  getErrorLines,
  getFunctionEditor,
  getGrammarText,
  getLambdaEditors,
  getLambdaErrors,
  getLineNumber,
  getLocalChangesStatus,
  getSelectedClassEditorTab,
  openElement,
  openWorkspace,
  pasteIntoCodeEditor,
  replaceInGrammar,
  waitForCompileToFinish,
} from '../support/StudioHelpers.js';

/**
 * Compiling in form mode (F9) when the model's logic doesn't compile. The
 * form can show an error on the derived property, constraint or function it
 * is in — but only in logic the user edited in the form this session: the
 * form's code editors are what tag the logic they parse with where it
 * belongs. For any other error, the app opens the model in text mode to
 * debug. And parser errors in that logic, which the form reports as the
 * user types.
 */

/** A model with logic in it, which compiles. */
const LOGIC_MODEL = `Class model::Person
[
  hasFirstName: $this.firstName->length() > 0
]
{
  firstName: String[1];
  lastName: String[1];
  fullName() {$this.firstName + ' ' + $this.lastName}: String[1];
}

Class model::Firm
{
  legalName: String[1];
}

function model::greeting(person: model::Person[1]): String[1]
{
  'Hello ' + $person.firstName
}
`;

let backends: StudioBackends;

/**
 * Replace the body in a form's code editor with `body`, as the user would,
 * and wait for the form to take it in: it parses the body shortly after the
 * user stops typing, which counts the element as changed.
 */
const editBody = async (
  page: Page,
  editor: Locator,
  body: string,
): Promise<void> => {
  await pasteIntoCodeEditor(page, editor, body);
  await expect(getLocalChangesStatus(page)).toHaveText('1 unpushed changes');
};

/** Open the class editor of `model::Person` on the tab named `tab`. */
const openPersonTab = async (page: Page, tab: string): Promise<Locator> => {
  await openElement(page, 'model::Person');
  const classEditor = getClassEditor(page);
  await classEditor.getByText(tab, { exact: true }).click();
  return classEditor;
};

test.beforeEach(async ({ page }) => {
  backends = await setupStudio(page, { grammar: LOGIC_MODEL });
  await openWorkspace(page);
});

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test('the model compiles in form mode', async ({ page }) => {
  await compile(page);
  await expectNotification(page, 'Compiled successfully');
});

test.describe('compilation errors in logic edited in the form', () => {
  test('in a derived property, are shown on it', async ({ page }) => {
    const classEditor = await openPersonTab(page, 'Derived Properties');
    await editBody(
      page,
      getLambdaEditors(classEditor).first(),
      "$this.firstName + ' ' + $this.lastNam",
    );
    // compile from elsewhere, to see the app take the user to the error
    await openElement(page, 'model::Firm');
    await compile(page);

    await expectNotification(
      page,
      /Compilation failed: Can't find property 'lastNam'/,
    );
    await expectFormMode(page);
    await expect(getSelectedClassEditorTab(page)).toHaveText(
      'Derived Properties',
    );
    await expect(getLambdaErrors(classEditor)).toHaveText([
      /Can't find property 'lastNam'/,
    ]);
  });

  test('in a constraint, are shown on it', async ({ page }) => {
    const classEditor = await openPersonTab(page, 'Constraints');
    await editBody(
      page,
      getLambdaEditors(classEditor).first(),
      '$this.firstNam->length() > 0',
    );
    await openElement(page, 'model::Firm');
    await compile(page);

    await expectNotification(
      page,
      /Compilation failed: Can't find property 'firstNam'/,
    );
    await expectFormMode(page);
    await expect(getSelectedClassEditorTab(page)).toHaveText('Constraints');
    await expect(getLambdaErrors(classEditor)).toHaveText([
      /Can't find property 'firstNam'/,
    ]);
  });

  test('in a function, are shown in its definition', async ({ page }) => {
    // (the explorer labels functions with their signature)
    await openElement(page, 'model::greeting(person:Person[1]):String[1]');
    const functionEditor = getFunctionEditor(page);
    await editBody(
      page,
      getLambdaEditors(functionEditor).first(),
      "'Hello ' + $person.firstNam",
    );
    await openElement(page, 'model::Firm');
    await compile(page);

    await expectNotification(
      page,
      /Compilation failed: Can't find property 'firstNam'/,
    );
    await expectFormMode(page);
    await expect(getLambdaErrors(functionEditor)).toHaveText([
      /Can't find property 'firstNam'/,
    ]);
  });

  test('once fixed in the form, clear, and the model compiles', async ({
    page,
  }) => {
    const classEditor = await openPersonTab(page, 'Derived Properties');
    const bodyEditor = getLambdaEditors(classEditor).first();
    await editBody(page, bodyEditor, "$this.firstName + ' ' + $this.lastNam");
    await compile(page);
    await expect(getLambdaErrors(classEditor)).toHaveCount(1);
    await waitForCompileToFinish(page);

    await pasteIntoCodeEditor(
      page,
      bodyEditor,
      "$this.firstName + ' ' + $this.lastName",
    );
    await expect(getLocalChangesStatus(page)).toHaveText('no changes detected');
    await compile(page);

    await expectNotification(page, 'Compiled successfully');
    await expect(getLambdaErrors(classEditor)).toHaveCount(0);
  });
});

test.describe('compilation errors the form cannot show', () => {
  test('in logic as loaded from the workspace, open the model in text mode at the error', async ({
    page,
  }) => {
    backends = await setupStudio(page, {
      grammar: LOGIC_MODEL.replace('$this.lastName}', '$this.lastNam}'),
    });
    await openWorkspace(page);
    await compile(page);

    await expectNotification(
      page,
      'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
    );
    await expectTextMode(page);
    await waitForCompileToFinish(page);
    // (read before `getGrammarText()`, which moves the cursor)
    const cursorLine = await getCursorLine(page);
    const line = getLineNumber(await getGrammarText(page), '$this.lastNam}');
    expect(cursorLine).toBe(line);
    await expect.poll(() => getErrorLines(page)).toEqual([line]);

    // fixed there, the user gets back to form mode
    await replaceInGrammar(page, '$this.lastNam}', '$this.lastName}');
    await clickExitTextMode(page);
    await expectFormMode(page);
  });
});

test.describe('parser errors in the form', () => {
  test('are shown as the user types, and can be discarded', async ({
    page,
  }) => {
    const classEditor = await openPersonTab(page, 'Derived Properties');
    const bodyEditor = getLambdaEditors(classEditor).first();
    await expect(bodyEditor).toContainText('$this.lastName');

    // a body cut off mid-expression
    await pasteIntoCodeEditor(page, bodyEditor, '$this.firstName +');

    const error = getLambdaErrors(classEditor);
    await expect(error).toHaveText(/Unexpected token/);
    // parsing is the form's own business: no switch to text mode
    await expectFormMode(page);

    // discarding puts back the body as it was
    await error.getByRole('button', { name: 'Discard Changes' }).click();
    await expect(error).toHaveCount(0);
    await expect(bodyEditor).toContainText('$this.lastName');
  });
});
