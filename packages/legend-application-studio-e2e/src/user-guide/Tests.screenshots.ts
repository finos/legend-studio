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

import { expect, test, type Locator, type Page } from '@playwright/test';
import { getExplorer } from '../support/StudioHelpers.js';
import { openGuideElement, openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** Runs every suite on the open element's Test Suites tab, and waits */
const runAllSuites = async (editor: Locator): Promise<void> => {
  await editor.getByText('Test Suites', { exact: true }).first().click();
  await button(editor, 'Run All Suites').click();
  await editor.getByText('Assertion Result Summary').waitFor();
};

test("a mapping's test suite", async ({ page }) => {
  await openGuideElement(page, 'guide::mapping::FirmMapping');
  const editor = getEditorGroup(page);
  await runAllSuites(editor);
  await page.mouse.move(1300, 120);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        button(editor, 'Run All Suites'),
        button(editor, 'Add Mapping Suite'),
        button(editor, 'firmSuite'),
      ],
      at: 'below',
    },
    {
      n: 2,
      targets: [
        editor.getByText('query', { exact: true }),
        button(editor, 'Debug'),
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        button(editor, 'Run All Tests'),
        button(editor, 'Add Mapping Test'),
        button(editor, 'countsEmployees'),
      ],
      at: 'below',
    },
    {
      n: 4,
      targets: [editor.getByText('Test Documentation', { exact: true })],
      at: 'right',
      textOnly: true,
    },
    {
      n: 5,
      targets: [
        editor.getByText('Relational Table Explorer'),
        editor.getByText('CSV Values'),
      ],
      at: 'below',
    },
    {
      n: 6,
      targets: [
        editor.getByText('Expected', { exact: true }),
        button(editor, 'Generate'),
      ],
      at: 'below',
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}mapping-test-suite.png`,
    [editor],
    0,
  );
});

test("a function's tests", async ({ page }) => {
  await openGuideWorkspace(page);
  for (const node of ['guide', 'functions']) {
    await getExplorer(page).getByText(node, { exact: true }).click();
  }
  await getExplorer(page)
    .getByText(/^initials/u)
    .click();
  const editor = getEditorGroup(page);
  await runAllSuites(editor);
  await page.mouse.move(1300, 120);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        button(editor, 'Run All Tests'),
        button(editor, 'Add Function Test'),
        editor.getByText('alanTuring', { exact: true }),
      ],
      at: 'below',
    },
    {
      n: 2,
      targets: [
        editor.getByText('Setup', { exact: true }),
        editor.getByText('Assertion', { exact: true }),
      ],
      at: 'right',
    },
    {
      n: 3,
      targets: [
        editor.getByText('Expected', { exact: true }),
        editor.getByText('Result', { exact: true }),
      ],
      at: 'right',
    },
    {
      n: 4,
      targets: [editor.getByText('Assertion Result Summary')],
      at: 'right',
      textOnly: true,
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}function-tests.png`, [
    editor.getByText('Tests', { exact: true }),
    editor.getByText('adaLovelace', { exact: true }),
    editor.getByText('Result: Passed'),
    button(editor, 'Generate'),
  ]);
});

test('the Test Runner', async ({ page }) => {
  await openGuideWorkspace(page);
  await button(page, 'Test Runner').click();
  await button(page, 'Run All Tests').click();
  // the mapping's and the service's tests pass; the other mapping has none
  await expect(page.locator('[title="Test passed"]')).toHaveCount(2, {
    timeout: 120_000,
  });
  // FirmMapping's suites and tests, opened from the chevrons
  const expand = (name: string): Promise<void> =>
    page
      .locator('.tree-view__node__container')
      .filter({ hasText: name })
      .last()
      .locator(
        '.global-test-runner__explorer__testable-tree__node__icon__expand',
      )
      .click();
  await expand('FirmMapping');
  await expand('firmSuite');
  await page.getByText('countsEmployees', { exact: true }).waitFor();
  await page.mouse.move(1300, 800);
  const panel = page.getByText('GLOBAL TEST RUNNER').locator('..');
  await markCallouts(page, [
    { n: 1, targets: [button(page, 'Reset')], at: 'above' },
    { n: 2, targets: [button(page, 'Run All Tests')], at: 'above' },
    { n: 3, targets: [button(page, 'Show Options Menu...')], at: 'above' },
    {
      n: 4,
      targets: [
        page.getByText('FirmEmployees', { exact: true }),
        page.getByText('countsEmployees', { exact: true }),
        page.getByText('EmployeeRecordMapping', { exact: true }),
      ],
      at: 'right',
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}test-runner.png`, [
    panel,
    page.getByText('EmployeeRecordMapping', { exact: true }),
  ]);
});
