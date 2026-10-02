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

import { test, expect } from '@playwright/test';
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import {
  clickExitTextMode,
  compile,
  enterTextMode,
  expectClassProperties,
  expectFormMode,
  expectNoLocalChanges,
  expectNotification,
  expectTextMode,
  getCursorLine,
  getExplorer,
  getGrammarText,
  getLineNumber,
  getLocalChangesStatus,
  getTabs,
  openElement,
  openWorkspace,
  pushLocalChanges,
  replaceInGrammar,
  setGrammarText,
  waitForCompileToFinish,
} from '../support/StudioHelpers.js';

/**
 * Adding, deleting and renaming elements in text mode, and what the switch
 * back to form mode keeps: the explorer, the open tabs, and the workspace's
 * local changes.
 */

const ADDRESS = 'Class model::Address\n{\n  street: String[1];\n}\n';

let backends: StudioBackends;

const addAddress = async (
  page: Parameters<typeof getGrammarText>[0],
): Promise<void> =>
  setGrammarText(page, `${await getGrammarText(page)}\n${ADDRESS}`);

test.beforeEach(async ({ page }) => {
  backends = await setupStudio(page);
  await openWorkspace(page);
});

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test.describe('switching', () => {
  test('back and forth without edits changes nothing', async ({ page }) => {
    await enterTextMode(page);
    const grammar = await getGrammarText(page);
    await clickExitTextMode(page);
    await expectFormMode(page);
    await expectNoLocalChanges(page);

    // the model reads back the same, however many times it goes round
    await enterTextMode(page);
    expect(await getGrammarText(page)).toBe(grammar);
    await clickExitTextMode(page);
    await expectFormMode(page);
    await expectNoLocalChanges(page);
  });

  test('F8 toggles text mode, and F9 compiles in it', async ({ page }) => {
    await page.keyboard.press('F8');
    await expectTextMode(page);

    await page.keyboard.press('F9');
    await expectNotification(page, 'Compiled successfully');
    // (the app ignores the toggle until the compile is done)
    await waitForCompileToFinish(page);

    await page.keyboard.press('F8');
    await expectFormMode(page);
  });
});

test.describe('elements added, deleted or renamed in text mode', () => {
  test('an added element shows in the explorer on compiling, and stays after leaving', async ({
    page,
  }) => {
    // expand the package, to see its elements
    await getExplorer(page).getByText('model', { exact: true }).click();
    await enterTextMode(page);
    await addAddress(page);
    await compile(page);
    await expectNotification(page, 'Compiled successfully');
    await expect(
      getExplorer(page).getByText('Address', { exact: true }),
    ).toBeVisible();

    await clickExitTextMode(page);
    await expectFormMode(page);
    await expect(getLocalChangesStatus(page)).toHaveText('1 unpushed changes');
    await expectClassProperties(page, 'model::Address', ['street']);
  });

  test('deleting the element open in form mode closes its tab', async ({
    page,
  }) => {
    await openElement(page, 'model::Person');
    await expect(getTabs(page)).toHaveText([/Person$/]);
    await enterTextMode(page);
    // delete the class, and the property referring to it
    const grammar = await getGrammarText(page);
    await setGrammarText(
      page,
      grammar
        .replace(/Class model::Person\n\{[^}]*\}\n\n/u, '')
        .replace('  employees: model::Person[*];\n', ''),
    );
    await clickExitTextMode(page);

    await expectFormMode(page);
    await expect(getTabs(page)).toHaveCount(0);
    await expect(
      getExplorer(page).getByText('Person', { exact: true }),
    ).toHaveCount(0);
    // the deleted class, and the class that referred to it
    await expect(getLocalChangesStatus(page)).toHaveText('2 unpushed changes');
  });

  test('renaming the element open in form mode closes its tab, and the new name shows', async ({
    page,
  }) => {
    await openElement(page, 'model::Person');
    await enterTextMode(page);
    const grammar = await getGrammarText(page);
    await setGrammarText(
      page,
      grammar
        .replace('Class model::Person', 'Class model::Human')
        .replace('model::Person[*]', 'model::Human[*]'),
    );
    await clickExitTextMode(page);

    await expectFormMode(page);
    await expect(getTabs(page)).toHaveCount(0);
    await expect(
      getExplorer(page).getByText('Person', { exact: true }),
    ).toHaveCount(0);
    await expectClassProperties(page, 'model::Human', [
      'firstName',
      'lastName',
      'age',
    ]);
  });

  test('an element still there is reopened in form mode', async ({ page }) => {
    await openElement(page, 'model::Firm');
    await enterTextMode(page);
    // no tabs in text mode
    await expect(getTabs(page)).toHaveCount(0);
    await replaceInGrammar(
      page,
      'age: Integer[0..1];',
      'age: Integer[0..1];\n  nickname: String[0..1];',
    );
    await clickExitTextMode(page);

    await expectFormMode(page);
    await expect(getTabs(page)).toHaveText([/Firm$/]);
  });
});

test.describe('local changes in text mode', () => {
  test('pushing from text mode sends only what changed', async ({ page }) => {
    await enterTextMode(page);
    await addAddress(page);
    await compile(page);
    await expectNotification(page, 'Compiled successfully');
    await waitForCompileToFinish(page);
    await pushLocalChanges(page);

    await expect.poll(() => backends.sdlc.entityChanges).toHaveLength(1);
    const [change, ...others] =
      backends.sdlc.entityChanges[0]?.entityChanges ?? [];
    expect(others).toEqual([]);
    expect(change).toMatchObject({
      type: 'CREATE',
      entityPath: 'model::Address',
      content: { _type: 'class', name: 'Address', package: 'model' },
    });
    // the positions the text mode compile works with stay out of the model
    expect(JSON.stringify(change?.content)).not.toContain('sourceInformation');
  });

  test('compiling without edits leaves no changes', async ({ page }) => {
    // KNOWN BUG: about a second after compiling in text mode — once the
    // app's throttled change detection runs — every element reads as changed,
    // even with no edits: the status bar says "3 unpushed changes" and marks
    // the workspace name with `*`. The compile leaves the app on the "light"
    // graph (classes without properties), which change detection then
    // compares with the workspace. Pushing is not affected: it sends only real
    // changes (see above). Remove `test.fail()` once fixed.
    test.fail();
    await enterTextMode(page);
    await compile(page);
    await expectNotification(page, 'Compiled successfully');
    await waitForCompileToFinish(page);

    await expectNoLocalChanges(page);
  });
});

test('entering text mode takes the cursor to the element open in form mode', async ({
  page,
}) => {
  // KNOWN BUG: text mode means to take the cursor to the element open in form
  // mode (`GraphEditGrammarModeState.initialize`), but form mode has already
  // closed its tabs by then (`cacheAndClose`), so the cursor stays on the
  // first line. Remove `test.fail()` once fixed.
  test.fail();
  await openElement(page, 'model::Firm');
  await enterTextMode(page);

  // (read before `getGrammarText()`, which moves the cursor)
  const cursorLine = await getCursorLine(page);
  expect(cursorLine).toBe(
    getLineNumber(await getGrammarText(page), 'Class model::Firm'),
  );
});
