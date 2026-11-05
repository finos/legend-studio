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

import { test, type Locator, type Page } from '@playwright/test';
import { openGuideElement } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

/** A class mapping's header: what it maps, and from what source */
const getClassMappingHeader = (editor: Locator): Locator[] => {
  const pills = editor
    .locator('.mapping-element-editor__metadata')
    .first()
    .locator('.mapping-element-editor__metadata__sub-chunk');
  return [pills.first(), pills.last()];
};

test('a database', async ({ page }) => {
  await openGuideElement(page, 'guide::store::FirmDatabase');
  const editor = getEditorGroup(page);
  // the tables drawn
  await editor.getByText('LEGAL_NAME').waitFor();
  await page.mouse.move(1300, 120);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.getByText('View', { exact: true }),
        editor.getByText('Grammar', { exact: true }),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [editor.locator('.database-editor__read-only-badge')],
      at: 'left',
    },
    {
      n: 3,
      targets: [
        editor.getByPlaceholder('Filter schemas, tables, columns...'),
        editor.getByText('No filters defined.'),
      ],
      at: 'right',
    },
    { n: 4, targets: [editor.getByText('FirmPerson').last()], at: 'below' },
    {
      n: 5,
      targets: [editor.getByText('PNG'), editor.getByText('SVG')],
      at: 'below',
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}database.png`, [editor], 0);
});

test('a connection', async ({ page }) => {
  await openGuideElement(page, 'guide::store::FirmConnection');
  const editor = getEditorGroup(page);
  await editor.getByText('Test Data Setup SQL').waitFor();
  await page.mouse.move(1300, 800);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.getByText('General', { exact: true }),
        editor.getByText('Post Processors', { exact: true }),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [editor.getByText('Database Type', { exact: true })],
      at: 'right',
      textOnly: true,
    },
    {
      n: 3,
      targets: [editor.getByText('Datasource', { exact: true })],
      at: 'right',
      textOnly: true,
    },
    {
      n: 4,
      targets: [editor.getByText('Test Data Setup SQL', { exact: true })],
      at: 'right',
      textOnly: true,
    },
    {
      n: 5,
      targets: [editor.getByText('Authentication', { exact: true })],
      at: 'right',
      textOnly: true,
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}connection.png`, [editor], 0);
});

test('a runtime', async ({ page }) => {
  await openGuideElement(page, 'guide::store::FirmRuntime');
  const editor = getEditorGroup(page);
  await editor
    .locator('.runtime-explorer')
    .getByText('FirmDatabase', { exact: true })
    .click();
  await editor.getByText('connection_1').waitFor();
  await page.mouse.move(1300, 800);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.locator('.runtime-explorer').getByText('FirmMapping'),
        editor
          .locator('.runtime-explorer')
          .getByText('FirmDatabase', { exact: true }),
      ],
      at: 'below',
    },
    { n: 2, targets: [editor.getByText('connection_1')], at: 'below' },
    {
      n: 3,
      targets: [editor.getByText('guide::store::FirmConnection')],
      at: 'below',
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}runtime.png`, [editor], 0);
});

test('a relational mapping', async ({ page }) => {
  await openGuideElement(page, 'guide::mapping::FirmMapping');
  const editor = getEditorGroup(page);
  await editor.getByRole('button', { name: 'C Person' }).click();
  const firstName = editor
    .locator('.mapping-element-editor__content')
    .getByText('firstName', { exact: true });
  await firstName.waitFor();
  await page.mouse.move(1300, 1000);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.getByRole('button', { name: 'A Firm_Person' }),
        editor.getByRole('button', { name: 'C Person' }),
      ],
      at: 'below',
    },
    {
      n: 2,
      targets: [
        editor.getByRole('button', { name: 'Create new mapping element' }),
      ],
      at: 'above',
    },
    { n: 3, targets: getClassMappingHeader(editor), at: 'right' },
    {
      n: 4,
      targets: [
        firstName,
        editor.getByText('[guide::store::FirmDatabase]PERSON.FIRST_NAME'),
      ],
      at: 'left',
    },
    { n: 5, targets: [editor.locator('.source-panel__explorer')], at: 'left' },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}relational-mapping.png`,
    [editor],
    0,
  );
});

test('a model-to-model mapping', async ({ page }) => {
  await openGuideElement(page, 'guide::mapping::EmployeeRecordMapping');
  const editor = getEditorGroup(page);
  await editor.getByRole('button', { name: 'C EmployeeRecord' }).click();
  const content = editor.locator('.mapping-element-editor__content');
  await content.getByText('$src.fullName').waitFor();
  await page.mouse.move(1300, 1000);
  await markCallouts(page, [
    { n: 1, targets: getClassMappingHeader(editor), at: 'right' },
    {
      n: 2,
      targets: [
        content.getByText('name', { exact: true }),
        content.getByText('$src.fullName'),
      ],
      at: 'left',
    },
    { n: 3, targets: [editor.locator('.source-panel__explorer')], at: 'left' },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}model-to-model-mapping.png`, [
    editor.locator('.mapping-element-editor__metadata').first(),
    editor.locator('.source-panel__explorer'),
    content.getByText('$src.employer.legalName'),
  ]);
});
