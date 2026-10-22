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
import { mkdir } from 'node:fs/promises';
import { setupStudio } from '../support/StudioSetup.js';
import { openElement, openWorkspace } from '../support/StudioHelpers.js';
import {
  TEST_DATA__GenerationSpecificationStages,
  SHOT_DIR,
} from './TEST_DATA__GenerationSpecificationScreenshots.js';

const THEME_STORAGE_KEY = 'legend-studio';
const SETTING_STORE = 'application-settings-storage';
const COLOR_THEME_SETTING = 'application.layout.colorTheme';

const useColorTheme = async (page: Page, theme: string): Promise<void> => {
  await page.addInitScript(
    ([storageKey, store, setting, value]) => {
      window.localStorage.setItem(
        storageKey as string,
        JSON.stringify({
          [store as string]: { [setting as string]: value as string },
        }),
      );
    },
    [THEME_STORAGE_KEY, SETTING_STORE, COLOR_THEME_SETTING, theme],
  );
};

const openGenerationSpecification = async (page: Page): Promise<Locator> => {
  await setupStudio(page, {
    entities: TEST_DATA__GenerationSpecificationStages,
  });
  await openWorkspace(page);
  await openElement(page, 'model::generationSpec');
  const editor = page.locator('.generation-spec-editor');
  await expect(editor).toBeVisible();
  await expect(editor.getByText('Stage 1', { exact: true })).toBeVisible();
  await expect(editor.getByText('Stage 2', { exact: true })).toBeVisible();
  // let the webfonts and the icons settle before anything is captured
  await page.waitForTimeout(1_500);
  return editor;
};

const getCard = (editor: Locator, name: string): Locator =>
  editor
    .locator('.generation-spec-editor__card')
    .filter({ has: editor.page().getByText(name, { exact: true }) })
    .first();

const getStage = (editor: Locator, index: number): Locator =>
  editor.locator('.generation-spec-editor__stage').nth(index);

/**
 * react-dnd's HTML5 backend listens for the real drag events, so the gesture is
 * driven through them; the moves in between are what makes the recording legible.
 */
const dragOver = async (
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> => {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) {
    throw new Error(`Can't drag: an element has no box`);
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await source.dispatchEvent('dragstart');
  for (let step = 1; step <= 12; step++) {
    await page.mouse.move(
      from.x + from.width / 2 + ((to.x - from.x) * step) / 12,
      from.y + from.height / 2 + ((to.y - from.y) * step) / 12,
    );
    await page.waitForTimeout(40);
  }
  await target.dispatchEvent('dragenter');
  await target.dispatchEvent('dragover');
};

const drop = async (source: Locator, target: Locator): Promise<void> => {
  await target.dispatchEvent('drop');
  await source.dispatchEvent('dragend');
};

test.beforeAll(async () => {
  await mkdir(SHOT_DIR, { recursive: true });
});

for (const theme of ['default-dark', 'default-light', 'legacy-light']) {
  test(`the board in the ${theme} theme`, async ({ page }) => {
    await useColorTheme(page, theme);
    const editor = await openGenerationSpecification(page);

    await expect(
      editor.getByText('2 stages, 2 recompiles', { exact: true }),
    ).toBeVisible();
    await editor.screenshot({ path: `${SHOT_DIR}/board-${theme}.png` });
    await page.screenshot({ path: `${SHOT_DIR}/app-${theme}.png` });

    // the drop target, held open so the drag-over treatment is captured
    const card = getCard(editor, 'consolidatedMapping');
    await dragOver(page, card, getStage(editor, 0));
    await expect(getStage(editor, 0)).toHaveClass(/stage--drag-over/u);
    await editor.screenshot({ path: `${SHOT_DIR}/drag-over-${theme}.png` });
    await drop(card, getStage(editor, 0));

    await expect(
      editor.getByText('1 stage, 1 recompile', { exact: true }),
    ).toBeVisible();
    await editor.screenshot({ path: `${SHOT_DIR}/merged-${theme}.png` });
  });
}

test('the gestures', async ({ page }) => {
  await useColorTheme(page, 'default-dark');
  const editor = await openGenerationSpecification(page);

  // merge two stages: drag the last card of stage 2 up into stage 1
  const consolidated = getCard(editor, 'consolidatedMapping');
  await dragOver(page, consolidated, getStage(editor, 0));
  await page.waitForTimeout(700);
  await drop(consolidated, getStage(editor, 0));
  await expect(
    editor.getByText('1 stage, 1 recompile', { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(900);

  // split one back out: drag a card onto the strip at the end
  const strip = editor.locator('.generation-spec-editor__new-stage');
  const party = getCard(editor, 'partyMapping');
  await dragOver(page, party, strip);
  await page.waitForTimeout(700);
  await drop(party, strip);
  await expect(
    editor.getByText('2 stages, 2 recompiles', { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(900);

  // and reorder the two stages, which the lane header buttons do
  await getStage(editor, 1)
    .locator('.generation-spec-editor__stage__header__action')
    .first()
    .click();
  await page.waitForTimeout(1_200);
});
