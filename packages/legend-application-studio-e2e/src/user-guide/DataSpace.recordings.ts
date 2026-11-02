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
import { getExplorer } from '../support/StudioHelpers.js';
import type { Entity } from '../support/TEST_DATA__SDLC.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  caption,
  hold,
  pointAndClick,
  showPointerAndCaptions,
  startRecording,
  typeSlowly,
} from './UserGuideRecording.js';

/**
 * A data product whose model access point group gives the guide's mapping, to
 * be a data space's mapping provider. It is written as protocol JSON, and only
 * these recordings have it: the open-source engine has no data products, so
 * the guide's other screens, which run queries, would fail with it.
 */
const FIRM_DATA_PRODUCT: Entity = {
  path: 'guide::dataproduct::FirmDataProduct',
  classifierPath:
    'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  content: {
    _type: 'dataProduct',
    name: 'FirmDataProduct',
    package: 'guide::dataproduct',
    title: 'Firm data product',
    description: 'Firms and the people they employ',
    accessPointGroups: [
      {
        _type: 'modelAccessPointGroup',
        id: 'firmModel',
        title: 'Firm model',
        accessPoints: [],
        diagrams: [],
        featuredElements: [],
        stereotypes: [],
        mapping: { path: 'guide::mapping::FirmMapping', type: 'MAPPING' },
      },
    ],
    stereotypes: [],
    taggedValues: [],
    testSuites: [],
  },
};

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** Opens a selector and picks one of its options, in view */
const pick = async (
  page: Page,
  selector: Locator,
  option: string,
): Promise<void> => {
  await pointAndClick(page, selector, { atPointer: true });
  await hold(page, 500);
  await pointAndClick(page, page.getByRole('option', { name: option }));
};

// One walk through the data space editor, cut into a GIF per task: creating a
// data space, adding an execution context, one with a mapping provider, and
// an executable. Each GIF starts where the one before ends.
test('the data space editor', async ({ page }) => {
  await showPointerAndCaptions(page);
  await openGuideWorkspace(page, { extraEntities: [FIRM_DATA_PRODUCT] });
  await page.mouse.move(700, 450);
  const recording = await startRecording(page, 'data-space');
  const editor = page.locator('.editor-group').first();
  const sidebar = editor.locator('.dataSpace-editor__sidebar');

  recording.chapter('data-space-create');
  await caption(page, 'Pick the package, then New Element › Data Space');
  await hold(page);
  await pointAndClick(
    page,
    getExplorer(page).getByText('guide', { exact: true }),
  );
  await pointAndClick(
    page,
    getExplorer(page).getByText('dataspace', { exact: true }),
  );
  await pointAndClick(page, button(page, 'New Element... (Ctrl + Shift + N)'));
  await hold(page, 700);
  await pointAndClick(page, button(page, 'Data Space'));
  await caption(page, 'Give it a name, a title and a description');
  await typeSlowly(page, page.getByPlaceholder(/^Enter a name/u), 'Employees');
  await typeSlowly(
    page,
    page.getByPlaceholder(/^Choose a title/u),
    'Employees',
  );
  await typeSlowly(
    page,
    page.getByPlaceholder(/meaningful description/u),
    'The people firms employ, and the firms they work for.',
  );
  await pointAndClick(page, button(page, 'Create'));
  await caption(page, 'It opens in the data space editor');
  await hold(page, 2500);

  recording.chapter('data-space-add-execution-context');
  await caption(page, 'Execution Contexts › + adds one');
  await hold(page);
  await pointAndClick(
    page,
    sidebar.getByRole('button', { name: /^Execution Contexts/u }),
  );
  await pointAndClick(page, button(editor, 'Add an execution context'));
  await typeSlowly(
    page,
    page.getByRole('dialog').getByPlaceholder('Enter a unique name'),
    'Firm database',
  );
  await pointAndClick(page, button(page, 'Create'));
  await caption(page, 'Pick its mapping and its default runtime');
  await hold(page, 800);
  await pick(page, editor.getByText('Select a mapping...'), 'FirmMapping');
  await pick(
    page,
    editor.getByText('Select a default runtime (optional)...'),
    'FirmRuntime',
  );
  await caption(page, 'Make it the default context');
  await pointAndClick(page, button(editor, 'Make default'));
  await hold(page, 2500);

  recording.chapter('data-space-mapping-provider');
  await caption(page, 'Another context, whose mapping a data product provides');
  await hold(page);
  await pointAndClick(page, button(editor, 'Add an execution context'));
  await typeSlowly(
    page,
    page.getByRole('dialog').getByPlaceholder('Enter a unique name'),
    'Firm data product',
  );
  await pointAndClick(page, button(page, 'Create'));
  await hold(page, 800);
  await caption(page, 'Mapping Provider, then the data product');
  await pointAndClick(page, button(editor, 'Mapping Provider'));
  await pick(
    page,
    editor.getByText('Select a mapping provider...'),
    'FirmDataProduct',
  );
  await caption(page, 'Its model access point group fills in');
  await hold(page, 2500);

  recording.chapter('data-space-add-executable');
  await caption(page, 'Executables › + adds one');
  await hold(page);
  await pointAndClick(
    page,
    sidebar.getByRole('button', { name: /^Executables/u }),
  );
  await pointAndClick(page, button(editor, 'Add an executable'));
  await caption(page, 'An existing service or function, with a title');
  await pick(
    page,
    page.getByText('Select a function or service...'),
    'FirmEmployees',
  );
  await typeSlowly(
    page,
    page.getByPlaceholder('Enter a title'),
    'Firm employees',
  );
  await pointAndClick(page, button(page, 'Create'));
  await caption(page, 'Describe it, and pick the context it runs with');
  await typeSlowly(
    page,
    editor.getByRole('textbox', { name: 'Description' }),
    'Every person, with the firm they work for',
  );
  await pick(
    page,
    editor.getByText('Use default execution context'),
    'Firm database',
  );
  await hold(page, 2500);

  await caption(page, undefined);
  await recording.finish();
});
