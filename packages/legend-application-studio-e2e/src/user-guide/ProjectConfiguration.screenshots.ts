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
import { GUIDE_PROJECT } from './GuideProject.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

const GUIDE_GROUP_ID = 'org.finos.legend.guide';

/**
 * The guide project's configuration on this page: it depends on two other
 * projects of the guide, each released since in a newer version (see the
 * depot's answers in `GuideSetup.ts`). Only this page's project has them, so
 * the other pages' explorer stays as it is.
 */
const CONFIGURATION = {
  ...GUIDE_PROJECT.configuration,
  projectDependencies: [
    { projectId: `${GUIDE_GROUP_ID}:reference-data`, versionId: '1.3.0' },
    { projectId: `${GUIDE_GROUP_ID}:address-model`, versionId: '1.0.0' },
  ],
};

/**
 * The same, with the platform versions frozen a while ago: the SDLC server
 * now lists a newer legend-engine
 */
const FROZEN_CONFIGURATION = {
  ...CONFIGURATION,
  platformConfigurations: [
    { name: 'legend-engine', version: '4.92.0' },
    { name: 'legend-sdlc', version: '0.201.0' },
  ],
};

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** One of the editor's form sections, by its title */
const section = (scope: Locator, title: string): Locator =>
  scope.locator('.editor-form-section').filter({
    has: scope.page().locator('.editor-form-section__title', {
      hasText: new RegExp(`^${title}$`, 'u'),
    }),
  });

/** One of the cards above the dependencies, by its label */
const summaryCard = (scope: Locator, label: string): Locator =>
  scope.locator('.project-dependency-editor__stat').filter({ hasText: label });

/** A dependency's row, by its project's artifact ID */
const dependencyRow = (scope: Locator, artifactId: string): Locator =>
  scope.locator('.project-dependency-editor').filter({ hasText: artifactId });

/**
 * Opens the project configuration, from the explorer's Project Configuration
 * Panel, on one of its tabs
 */
const openConfiguration = async (
  page: Page,
  tab: string,
  configuration: Record<string, unknown> = CONFIGURATION,
): Promise<Locator> => {
  await openGuideWorkspace(page, { configuration });
  await page.getByTitle('Project Configuration Panel').click();
  const editor = getEditorGroup(page);
  await section(editor, 'Coordinates').waitFor();
  await button(editor, tab).click();
  return editor;
};

/**
 * Opens the project's dependencies, once the depot has answered with their
 * versions and their tree
 */
const openDependencies = async (page: Page): Promise<Locator> => {
  const editor = await openConfiguration(page, 'Project Dependencies');
  await button(editor, '1.1.0 available').waitFor();
  await expect(summaryCard(editor, 'conflicts')).toContainText('0');
  return editor;
};

/**
 * Updates address-model to its newer version, whose own dependency on
 * reference-data is newer than the project's
 */
const makeConflict = async (editor: Locator): Promise<void> => {
  await button(editor, '1.1.0 available').click();
  await editor.getByText('is required at 2 versions').waitFor();
};

test("the project's structure", async ({ page }) => {
  const editor = await openConfiguration(page, 'Project Structure');
  await editor.getByText('13.2 available').waitFor();
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      // its text: the button ends at the editor's right edge, which would
      // cut its outline
      targets: [button(editor, 'Update configuration')],
      at: 'left',
      textOnly: true,
    },
    {
      n: 2,
      targets: [editor.locator('.project-configuration-editor__tabs')],
      at: 'right',
    },
    { n: 3, targets: [section(editor, 'Coordinates')], at: 'inside-right' },
    {
      n: 4,
      targets: [section(editor, 'Project structure')],
      at: 'inside-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}project-configuration.png`,
    editor,
    section(editor, 'Project structure'),
    24,
  );
});

test("the project's dependencies", async ({ page }) => {
  const editor = await openDependencies(page);
  const row = dependencyRow(editor, 'address-model');
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        summaryCard(editor, 'direct'),
        summaryCard(editor, 'conflicts'),
      ],
      at: 'right',
    },
    { n: 2, targets: [button(editor, 'Dependency Explorer')], at: 'left' },
    {
      n: 3,
      // its icon, away from the editor's right edge
      targets: [editor.getByTitle('Add project dependencies')],
      at: 'left',
      textOnly: true,
    },
    {
      n: 4,
      targets: [row.locator('.project-dependency-editor__selector').first()],
      at: 'below',
    },
    {
      n: 5,
      targets: [row.locator('.project-dependency-editor__version')],
      at: 'below',
    },
    {
      n: 6,
      targets: [row.locator('.project-dependency-editor__exclusions')],
      at: 'below',
    },
    {
      n: 7,
      targets: [
        row.locator(
          '.project-dependency-editor__visit-project-btn__dropdown-trigger',
        ),
        row.locator('.project-dependency-editor__remove-btn'),
      ],
      at: 'below',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}project-dependencies.png`,
    editor,
    row,
    44,
  );
});

test('a dependency conflict', async ({ page }) => {
  const editor = await openDependencies(page);
  await makeConflict(editor);
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.project-configuration-editor__save__hint')],
      at: 'left',
    },
    { n: 2, targets: [summaryCard(editor, 'conflict')], at: 'right' },
    {
      n: 3,
      targets: [
        editor.locator('.project-dependency-editor__conflict-banner__text'),
      ],
      at: 'right',
      textOnly: true,
    },
    { n: 4, targets: [button(editor, 'Validate Dependencies')], at: 'left' },
    {
      n: 5,
      targets: [
        dependencyRow(editor, 'reference-data').getByRole('button', {
          name: '1.4.0 available',
        }),
      ],
      at: 'above',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}project-dependencies-conflict.png`,
    editor,
    dependencyRow(editor, 'address-model'),
    24,
  );
});

// The dependency explorer takes 80% of the window: a smaller window leaves
// less of it empty below its tree

test("a conflict's paths", async ({ page }) => {
  const editor = await openDependencies(page);
  await makeConflict(editor);
  await page.setViewportSize({ width: 1000, height: 430 });
  await button(editor, 'See where they come from').click();
  const explorer = page
    .getByRole('dialog')
    .filter({ hasText: 'Dependency Explorer' });
  await explorer.getByTitle('Expand All Conflict Paths').click();
  await explorer.getByText('address-model', { exact: true }).waitFor();
  await page.mouse.move(40, 410);
  await markCallouts(page, [
    {
      n: 1,
      targets: [explorer.locator('.project-dependency-report__tabs')],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        explorer
          .locator('.project-dependency-explorer-tree__node__container')
          .first(),
        explorer
          .locator('.project-dependency-explorer-tree__node__container')
          .last(),
      ],
      at: 'right',
      // the rows' text: the rows are as wide as the dialog
      textOnly: true,
    },
    {
      n: 3,
      targets: [
        explorer.getByTitle('Collapse Tree'),
        explorer.getByTitle('Expand All Conflict Paths'),
      ],
      at: 'left',
      // the icons, away from the dialog's right edge
      textOnly: true,
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}project-dependencies-conflict-paths.png`,
    [explorer],
    0,
  );
});

test('compatible versions', async ({ page }) => {
  const editor = await openDependencies(page);
  await makeConflict(editor);
  // taller than for the paths: the versions found and their buttons
  await page.setViewportSize({ width: 1000, height: 570 });
  await button(editor, 'See where they come from').click();
  const explorer = page
    .getByRole('dialog')
    .filter({ hasText: 'Dependency Explorer' });
  await button(explorer, 'Resolution').click();
  await explorer
    .getByRole('button', { name: 'Resolve Compatible Dependencies' })
    .click();
  await explorer.getByText('Compatible Versions Found').waitFor();
  await page.mouse.move(40, 550);
  await markCallouts(page, [
    {
      n: 1,
      targets: [explorer.locator('.project-dependency-resolution__list')],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [
        button(explorer, 'Confirm & Apply Changes'),
        button(explorer, 'Cancel'),
      ],
      at: 'left',
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}project-dependencies-resolution.png`,
    [explorer],
    0,
  );
});

test("the project's platform versions", async ({ page }) => {
  const editor = await openConfiguration(
    page,
    'Platform Configurations',
    FROZEN_CONFIGURATION,
  );
  await button(editor, '4.95.1 available').waitFor();
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.platform-versions__modes')],
      at: 'right',
    },
    { n: 2, targets: [editor.locator('.platform-versions')], at: 'right' },
    {
      n: 3,
      targets: [
        button(editor, 'Update all to latest'),
        button(editor, 'Enter versions manually'),
      ],
      at: 'left',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}project-platform-versions.png`,
    editor,
    section(editor, 'Platform versions'),
    24,
  );
});

test("the project's advanced settings", async ({ page }) => {
  const editor = await openConfiguration(page, 'Advanced');
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [section(editor, 'Dependency tests')],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [editor.locator('.project-advanced-editor__types')],
      at: 'right',
    },
    {
      n: 3,
      targets: [
        editor.locator('.project-advanced-editor__change-type__btn'),
        editor.locator('.project-advanced-editor__change-type__hint'),
      ],
      at: 'right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}project-advanced.png`,
    editor,
    section(editor, 'Project type'),
    24,
  );
});
