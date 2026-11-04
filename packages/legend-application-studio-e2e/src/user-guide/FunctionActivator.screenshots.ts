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
  markCallouts,
  saveRegion,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/**
 * A REST service of the guide's function `initials`, whose URL gives the
 * function its two parameters. It is written as protocol JSON, and only this
 * script has it, so the other pages' explorer stays as it is; the engine
 * knows REST services, so it validates it and renders its artifact.
 */
const INITIALS_SERVICE: Entity = {
  path: 'guide::activators::InitialsService',
  classifierPath:
    'meta::external::function::activator::hostedService::HostedService',
  content: {
    _type: 'hostedService',
    name: 'InitialsService',
    package: 'guide::activators',
    function: {
      path: 'guide::functions::initials(String[1],String[1]):String[1]',
      type: 'FUNCTION',
    },
    pattern: '/guide/initials/{firstName}/{lastName}',
    documentation: 'The initials of a person, from their first and last names',
    autoActivateUpdates: true,
    storeModel: false,
    generateLineage: false,
    // as a new activator's, which its owner fills in
    ownership: { _type: 'DeploymentOwner', id: '' },
    actions: [],
    stereotypes: [],
    taggedValues: [],
  },
};

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** One of the sections of the REST service's form, by its label */
const formSection = (scope: Locator, label: string): Locator =>
  scope.locator('.panel__content__form__section').filter({
    has: scope.page().locator('.panel__content__form__section__header__label', {
      hasText: new RegExp(`^${label}$`, 'u'),
    }),
  });

/** Opens the guide's REST service in its editor */
const openRestService = async (page: Page): Promise<Locator> => {
  await openGuideWorkspace(page, { extraEntities: [INITIALS_SERVICE] });
  for (const node of INITIALS_SERVICE.path.split('::')) {
    await getExplorer(page).getByText(node, { exact: true }).first().click();
  }
  const editor = getEditorGroup(page);
  await editor.getByText('Rest Service Activator', { exact: true }).waitFor();
  return editor;
};

test('activating a function', async ({ page }) => {
  // the dialog is half the window wide: wide enough for its cards' text
  await page.setViewportSize({ width: 3000, height: 900 });
  await openGuideWorkspace(page);
  for (const node of ['guide', 'functions']) {
    await getExplorer(page).getByText(node, { exact: true }).click();
  }
  await getExplorer(page)
    .getByText(/^initials\(/u)
    .click();
  await button(getEditorGroup(page), 'Activate').click();
  const dialog = page.locator('.function-promote-editor');
  await dialog.getByText('REST Service', { exact: true }).click();
  await dialog.locator('input').fill(INITIALS_SERVICE.path);
  await page.mouse.move(2900, 850);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        dialog.locator('.function-promote-editor__content__activator-types'),
      ],
      at: 'above',
    },
    { n: 2, targets: [dialog.locator('input')], at: 'above' },
    {
      n: 3,
      targets: [button(dialog, 'Cancel'), button(dialog, 'Activate')],
      at: 'left',
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}function-activator-activate.png`,
    [dialog],
    0,
  );
});

test('a REST service', async ({ page }) => {
  // the form is taller than the window
  await page.setViewportSize({ width: 1440, height: 1200 });
  const editor = await openRestService(page);
  // the focus out of the URL pattern, which the editor gives it on opening
  await editor.getByText('Rest Service Activator', { exact: true }).click();
  // the owner's field, in the section below the Ownership label's
  const owner = editor
    .locator('.panel__content__form__section')
    .filter({ hasText: 'Provide a deployment identifier' })
    .locator('input');
  await page.mouse.move(1300, 1150);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.function-editor__tabs')],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        button(editor, 'Validate'),
        editor.getByTitle('activator-artifact-dropdown'),
      ],
      at: 'below',
    },
    { n: 3, targets: [button(editor, 'Deploy to Sandbox')], at: 'below' },
    {
      n: 4,
      targets: [
        formSection(editor, 'URL Pattern'),
        formSection(editor, 'Parameters'),
      ],
      at: 'inside-right',
    },
    {
      n: 5,
      targets: [
        editor.locator(
          '.hosted-service-function-activator-editor__configuration__item',
        ),
      ],
      at: 'right',
    },
    {
      n: 6,
      targets: [formSection(editor, 'Documentation').locator('textarea')],
      at: 'right',
    },
    {
      n: 7,
      targets: [
        formSection(editor, 'Auto Activate Updates'),
        formSection(editor, 'Store Model'),
      ],
      // beside Store Model's short prompt, clear of the long one above
      at: 'inside-bottom-right',
    },
    { n: 8, targets: [owner], at: 'right' },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}function-activator.png`,
    editor,
    owner,
    24,
  );
});

test("a REST service's artifact", async ({ page }) => {
  const editor = await openRestService(page);
  await editor.getByTitle('activator-artifact-dropdown').click();
  await page.getByText('Render Artifact', { exact: true }).click();
  const artifact = page.locator('.editor-modal');
  await artifact.getByText('"hostedServiceArtifact"').waitFor();
  await page.mouse.move(1400, 880);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}function-activator-artifact.png`,
    [artifact],
    0,
  );
});
