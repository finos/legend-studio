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
import {
  INGEST_DEFINITION_CLASSIFIER_PATH,
  ingestColumn,
  ingestDataSet,
  ingestFunction,
  ingestMaterializedView,
} from '../support/IngestEntities.js';
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import { openElement, openWorkspace } from '../support/StudioHelpers.js';
import {
  TEST_DATA__Entities,
  type Entity,
} from '../support/TEST_DATA__SDLC.js';

/**
 * An ingest definition's Definition tab opens on its Overview: the
 * definition's settings, then its materialized views, each drawn by Legend
 * Cube, and its data sets, each with its schema and its metadata. Studio
 * reads all of it from the definition's content, in the browser. The engine
 * has no grammar for ingest definitions, so nothing here reads their text.
 */

const INGEST_PATH = 'model::ingest::TradesIngest';

/** A definition with two data sets, one with its own write mode, and a view of one of them */
const getTradesIngest = async (): Promise<Entity> => ({
  path: INGEST_PATH,
  classifierPath: INGEST_DEFINITION_CLASSIFIER_PATH,
  content: {
    _type: 'ingestDefinition',
    name: 'TradesIngest',
    package: 'model::ingest',
    owner: { _type: 'kerberos', id: 'svc_trades' },
    readMode: { _type: 'Snapshot', format: { _type: 'Parquet' } },
    writeMode: { _type: 'append_only' },
    datasetGroup: 'TRADING',
    datasets: [
      ingestDataSet(
        'TRADES',
        [
          ingestColumn('ID', 'Int', {
            required: true,
            description: 'The trade, as its desk books it',
          }),
          ingestColumn('DESK', 'Varchar', { size: 20 }),
          ingestColumn('QUANTITY', 'Int'),
        ],
        { privacyClassification: { sensitivity: 'DP20' } },
      ),
      ingestDataSet(
        'DESKS',
        [
          ingestColumn('ID', 'Varchar', { size: 20, required: true }),
          ingestColumn('NAME', 'Varchar', { size: 200 }),
        ],
        { writeMode: { _type: 'batch_milestoned' } },
      ),
      ingestMaterializedView(
        'QUANTITY_BY_DESK',
        await ingestFunction(
          `|#>{${INGEST_PATH}.TRADES}#->groupBy(~[DESK], ~[QUANTITY : x | $x.QUANTITY : y | $y->sum()])`,
        ),
        {
          primaryKey: ['DESK'],
          privacyClassification: { sensitivity: 'DP10' },
        },
      ),
    ],
  },
});

/** The Cube flow's test IDs (`LEGEND_CUBE_TEST_ID` in `@finos/legend-cube-builder`) */
const CUBE_DEFINITION_FLOW = 'legend-cube__definition-flow';
const CUBE_CANVAS_NODE = 'legend-cube__canvas-node';

const getEditor = (page: Page): Locator =>
  page.locator('.ingest-definition-editor');

/** The picked view's or data set's panel */
const getPanel = (editor: Locator, name: string): Locator =>
  editor.getByRole('tabpanel', { name, exact: true });

const getList = (editor: Locator): Locator =>
  editor.getByRole('tablist', { name: 'Materialized views and data sets' });

/** The rows of a data set's table of columns */
const getColumnRows = (panel: Locator, name: string): Locator =>
  panel
    .getByLabel(`Columns of ${name}`)
    .locator('.ag-center-cols-container .ag-row');

/** A group of a view's or a data set's Metadata, e.g. `Writing` */
const getMetadataGroup = (
  panel: Locator,
  name: string,
  group: string,
): Locator =>
  panel.getByLabel(`Metadata of ${name}`).getByRole('region', { name: group });

const showTab = async (panel: Locator, tab: string): Promise<void> => {
  await panel.getByRole('tab', { name: tab, exact: true }).click();
};

let backends: StudioBackends;

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test("an ingest definition opens on its Overview: its settings, then its views' flows and its data sets", async ({
  page,
}) => {
  backends = await setupStudio(page, {
    entities: [...TEST_DATA__Entities, await getTradesIngest()],
  });
  await openWorkspace(page);
  await openElement(page, INGEST_PATH);
  const editor = getEditor(page);

  const viewSwitch = editor.getByRole('group', {
    name: 'Show the definition as',
  });
  await expect(
    viewSwitch.getByRole('button', { name: 'Overview' }),
  ).toHaveAttribute('aria-pressed', 'true');

  // the settings every data set follows unless it sets its own
  const definition = editor.getByRole('region', { name: 'Definition' });
  const mainSettings = definition.getByLabel('Main settings');
  await expect(mainSettings).toContainText('Kerberos svc_trades');
  await expect(mainSettings).toContainText('Snapshot · Parquet');
  await expect(mainSettings).toContainText('append only');
  await expect(mainSettings).toContainText('TRADING');

  // the view, drawn by Legend Cube in the browser: its data set, then its group
  const view = getPanel(editor, 'QUANTITY_BY_DESK');
  await expect(
    view.getByTestId(CUBE_DEFINITION_FLOW).getByTestId(CUBE_CANVAS_NODE),
  ).toHaveCount(2);
  await expect(getList(editor).getByTitle('QUANTITY_BY_DESK')).toContainText(
    '2 steps',
  );

  // its Metadata, and the data set it reads, a link to it
  await showTab(view, 'Metadata');
  await expect(
    getMetadataGroup(view, 'QUANTITY_BY_DESK', 'Key and governance'),
  ).toContainText('DP10');
  await getMetadataGroup(view, 'QUANTITY_BY_DESK', 'Reads')
    .getByRole('button', { name: 'TRADES', exact: true })
    .click();

  // the data set's Schema: its columns, read-only, a description under its name
  const trades = getPanel(editor, 'TRADES');
  await expect(getColumnRows(trades, 'TRADES')).toHaveCount(3);
  await expect(trades.getByLabel('Columns of TRADES')).toContainText(
    'The trade, as its desk books it',
  );

  // its Metadata: the view that reads it, the write mode it takes from the
  // definition
  await showTab(trades, 'Metadata');
  await expect(getMetadataGroup(trades, 'TRADES', 'Read by')).toContainText(
    'QUANTITY_BY_DESK',
  );
  await expect(getMetadataGroup(trades, 'TRADES', 'Writing')).toContainText(
    "append only the definition's",
  );

  // the tab stays as another data set is picked: one with its own write mode
  await getList(editor).getByTitle('DESKS', { exact: true }).click();
  const desks = getPanel(editor, 'DESKS');
  await expect(getMetadataGroup(desks, 'DESKS', 'Writing')).toContainText(
    'batch milestoned its own',
  );
  // its Schema: its two columns, then the three its write mode adds
  await showTab(desks, 'Schema');
  await expect(getColumnRows(desks, 'DESKS')).toHaveCount(5);

  // the definition's other settings open below its main ones, and close
  await definition.getByRole('button', { name: 'All settings' }).click();
  const otherSettings = definition.getByLabel(
    "The definition's other settings",
  );
  await expect(otherSettings).toContainText(
    'Data sets with their own write mode',
  );
  await definition.getByRole('button', { name: 'Fewer settings' }).click();
  await expect(otherSettings).toHaveCount(0);

  // Pure: the whole definition's Pure, in place of the Overview
  await viewSwitch.getByRole('button', { name: 'Pure' }).click();
  await expect(definition).toHaveCount(0);
  await expect(
    viewSwitch.getByRole('button', { name: 'Pure' }),
  ).toHaveAttribute('aria-pressed', 'true');
});
