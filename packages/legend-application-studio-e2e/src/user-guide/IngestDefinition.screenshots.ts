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
import { FIRM_INGEST_PATH, getFirmIngest } from './GuideIngest.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

// The Ingest definitions page of the guide: the guide's ingest definition,
// FirmIngest, on its Overview

/** The Cube flow's test IDs (`LEGEND_CUBE_TEST_ID` in `@finos/legend-cube-builder`) */
const CUBE_DEFINITION_FLOW = 'legend-cube__definition-flow';
const CUBE_CANVAS_NODE = 'legend-cube__canvas-node';

const getIngestEditor = (page: Page): Locator =>
  page.locator('.ingest-definition-editor').first();

/** Opens the guide's ingest definition, on its Overview, its first view's flow drawn */
const openFirmIngest = async (page: Page): Promise<Locator> => {
  await openGuideWorkspace(page, { extraEntities: [await getFirmIngest()] });
  for (const node of FIRM_INGEST_PATH.split('::')) {
    await getExplorer(page).getByText(node, { exact: true }).first().click();
  }
  const editor = getIngestEditor(page);
  await expect(
    editor
      .getByTestId(CUBE_DEFINITION_FLOW)
      .getByTestId(CUBE_CANVAS_NODE)
      .first(),
  ).toBeVisible();
  // the canvas fits the flow to its size a moment after it draws it
  await page.waitForTimeout(1_000);
  return editor;
};

const getList = (editor: Locator): Locator =>
  editor.getByRole('tablist', { name: 'Materialized views and data sets' });

/** The picked view's or data set's panel */
const getPanel = (editor: Locator, name: string): Locator =>
  editor.getByRole('tabpanel', { name, exact: true });

const pick = async (editor: Locator, name: string): Promise<Locator> => {
  await getList(editor).getByTitle(name, { exact: true }).click();
  return getPanel(editor, name);
};

/** The section of the views and data sets, below the definition's */
const getDataSetsSection = (editor: Locator): Locator =>
  editor.getByRole('region', { name: 'Its materialized views and data sets' });

/** A panel's tabs, e.g. a view's Flow and Metadata */
const getTabs = (panel: Locator, names: string[]): Locator[] =>
  names.map((name) => panel.getByRole('tab', { name, exact: true }));

test("an ingest definition's Overview", async ({ page }) => {
  const editor = await openFirmIngest(page);
  const panel = getPanel(editor, 'FIRM_EMPLOYEES');
  await page.mouse.move(1430, 890);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.getByRole('group', { name: 'Show the definition as' })],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        editor.locator('.ingest-definition-section__name'),
        editor.locator('.ingest-definition-section__doc'),
      ],
      at: 'right',
    },
    {
      n: 3,
      targets: [editor.getByLabel('Main settings')],
      at: 'inside-right',
    },
    {
      n: 4,
      targets: [editor.getByRole('button', { name: 'All settings' })],
      at: 'left',
    },
    { n: 5, targets: [getList(editor)], at: 'inside-right' },
    {
      n: 6,
      targets: [
        panel.locator('.ingest-definition-flow__view__name'),
        panel.locator('.ingest-definition-properties__chips'),
      ],
      at: 'right',
    },
    {
      n: 7,
      targets: [panel.locator('.ingest-definition-flow__view__actions')],
      at: 'left',
    },
    { n: 8, targets: getTabs(panel, ['Flow', 'Metadata']), at: 'right' },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}ingest-definition.png`,
    [editor],
    0,
  );
});

test("an ingest definition's other settings", async ({ page }) => {
  const editor = await openFirmIngest(page);
  await editor.getByRole('button', { name: 'All settings' }).click();
  await editor.getByLabel("The definition's other settings").waitFor();
  await page.mouse.move(1430, 890);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}ingest-definition-settings.png`,
    [editor.getByRole('region', { name: 'Definition' })],
    12,
  );
});

test("a data set's schema", async ({ page }) => {
  const editor = await openFirmIngest(page);
  const panel = await pick(editor, 'PERSON');
  const columns = panel.getByLabel('Columns of PERSON');
  await expect(columns.locator('.ag-row')).toHaveCount(5);
  // each description under its column's name, once the table has sized its
  // rows to them
  await expect(columns.getByText('In years', { exact: true })).toBeVisible();
  await page.waitForTimeout(1_000);
  await page.mouse.move(1430, 890);
  await markCallouts(page, [
    {
      n: 1,
      targets: [panel.locator('.ingest-definition-properties__chips')],
      at: 'right',
    },
    { n: 2, targets: getTabs(panel, ['Schema', 'Metadata']), at: 'right' },
    { n: 3, targets: [columns], at: 'inside-right' },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}ingest-definition-data-set.png`,
    getDataSetsSection(editor),
    panel.getByText('5 columns, as the definition declares them.'),
    24,
  );
});

test("a data set's metadata", async ({ page }) => {
  const editor = await openFirmIngest(page);
  const panel = await pick(editor, 'PERSON');
  await panel.getByRole('tab', { name: 'Metadata', exact: true }).click();
  const metadata = panel.getByLabel('Metadata of PERSON');
  await metadata.waitFor();
  await page.mouse.move(1430, 890);
  await markCallouts(page, [
    {
      n: 1,
      targets: [metadata.getByRole('region', { name: 'Key and governance' })],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [metadata.getByRole('region', { name: 'Read by' })],
      at: 'inside-right',
    },
    {
      n: 3,
      targets: [metadata.getByRole('region', { name: 'Writing' })],
      at: 'inside-right',
    },
    {
      n: 4,
      targets: [
        metadata.getByRole('region', { name: 'Storage' }),
        metadata.getByRole('region', { name: 'Reading' }),
      ],
      at: 'inside-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}ingest-definition-metadata.png`,
    getDataSetsSection(editor),
    metadata.getByRole('region', { name: 'Reading' }),
    24,
  );
});
