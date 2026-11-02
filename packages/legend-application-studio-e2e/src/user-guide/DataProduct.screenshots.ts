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
import type { Entity } from '../support/TEST_DATA__SDLC.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/** A column of an ingest's data set, e.g. `LEGAL_NAME: Varchar(200)[0..1]` */
const column = (
  name: string,
  type: string,
  options: { size?: number; required?: boolean } = {},
): Record<string, unknown> => ({
  name,
  genericType: {
    multiplicityArguments: [],
    rawType: { _type: 'packageableType', fullPath: type },
    typeArguments: [],
    typeVariableValues:
      options.size === undefined
        ? []
        : [{ _type: 'integer', value: options.size }],
  },
  multiplicity: { lowerBound: options.required ? 1 : 0, upperBound: 1 },
});

/** A data set of an ingest, sent as CSV files */
const dataset = (
  name: string,
  columns: Record<string, unknown>[],
): Record<string, unknown> => ({
  name,
  primaryKey: ['ID'],
  source: {
    _type: 'serializedSource',
    format: {
      _type: 'CSV',
      fieldDelimiter: ',',
      headerRowsToSkipCount: 1,
      recordDelimiter: '\n',
    },
    schema: { _type: 'relationType', columns },
  },
});

/**
 * The ingest that brings the firm database's tables into the Lakehouse, one
 * data set each, which the data product's access points read
 */
const FIRM_INGEST: Entity = {
  path: 'guide::ingest::FirmIngest',
  classifierPath:
    'meta::external::ingest::specification::metamodel::IngestDefinition',
  content: {
    _type: 'ingestDefinition',
    name: 'FirmIngest',
    package: 'guide::ingest',
    datasets: [
      dataset('FIRM', [
        column('ID', 'Int', { required: true }),
        column('LEGAL_NAME', 'Varchar', { size: 200 }),
        column('INC_TYPE', 'Varchar', { size: 10 }),
      ]),
      dataset('PERSON', [
        column('ID', 'Int', { required: true }),
        column('FIRST_NAME', 'Varchar', { size: 200 }),
        column('LAST_NAME', 'Varchar', { size: 200 }),
        column('AGE', 'Int'),
        column('FIRM_ID', 'Int'),
      ]),
    ],
  },
};

/**
 * An access point that gives some columns of one of the ingest's data sets:
 * `|#I{guide::ingest::FirmIngest.FIRM}#->select(~[LEGAL_NAME, INC_TYPE])`
 */
const accessPoint = (
  id: string,
  text: { title: string; description: string },
  source: { dataset: string; columns: string[] },
  reproducible: boolean,
): Record<string, unknown> => ({
  _type: 'lakehouseAccessPoint',
  id,
  ...text,
  targetEnvironment: 'Snowflake',
  reproducible,
  stereotypes: [],
  func: {
    _type: 'lambda',
    parameters: [],
    body: [
      {
        _type: 'func',
        function: 'select',
        parameters: [
          {
            _type: 'classInstance',
            type: 'I',
            value: {
              metadata: false,
              path: [FIRM_INGEST.path, source.dataset],
            },
          },
          {
            _type: 'classInstance',
            type: 'colSpecArray',
            value: { colSpecs: source.columns.map((name) => ({ name })) },
          },
        ],
      },
    ],
  },
});

/**
 * The guide's data product: the ingest's tables, as an access point group,
 * and the firm model, as a model access point group. It is written as
 * protocol JSON, and only this script has it: the open-source engine has no
 * data products or ingests, so the guide's other screens, which compile and
 * run queries, would fail with them.
 */
const FIRM_DATA_PRODUCT: Entity = {
  path: 'guide::dataproduct::FirmDataProduct',
  classifierPath:
    'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  content: {
    _type: 'dataProduct',
    name: 'FirmDataProduct',
    package: 'guide::dataproduct',
    title: 'Firms and employees',
    description:
      'Firms and the people they employ: as tables to query, and as the classes of the firm model.',
    icon: {
      _type: 'libraryIcon',
      libraryId: 'react-icons',
      iconId: 'TbBuildingBank',
    },
    type: { _type: 'internalDataProductType' },
    accessPointGroups: [
      {
        _type: 'defaultAccessPointGroup',
        id: 'firmTables',
        title: 'Firm tables',
        description: 'Firms and their employees, a table each.',
        stereotypes: [],
        accessPoints: [
          accessPoint(
            'firms',
            {
              title: 'Firms',
              description:
                'Each firm, with its legal name and incorporation type.',
            },
            { dataset: 'FIRM', columns: ['LEGAL_NAME', 'INC_TYPE'] },
            false,
          ),
          accessPoint(
            'employees',
            {
              title: 'Employees',
              description: 'Each person, with their names and age.',
            },
            {
              dataset: 'PERSON',
              columns: ['FIRST_NAME', 'LAST_NAME', 'AGE'],
            },
            true,
          ),
        ],
      },
      {
        _type: 'modelAccessPointGroup',
        id: 'firmModel',
        title: 'Firm model',
        description: 'Firms and their employees, as the classes of the model.',
        accessPoints: [],
        diagrams: [],
        featuredElements: [],
        stereotypes: [],
        mapping: { path: 'guide::mapping::FirmMapping', type: 'MAPPING' },
      },
    ],
    operationalMetadata: {
      coverageRegions: ['namr', 'emea'],
      updateFrequency: 'daily',
    },
    supportInfo: {
      documentation: {
        url: 'https://example.com/firm-model',
        label: 'Firm model',
      },
      emails: [{ address: 'firm-model@example.com', title: 'Firm model team' }],
      expertise: [
        {
          description: 'Firms and the people they employ',
          expertIds: ['ada.lovelace', 'grace.hopper'],
        },
      ],
    },
    stereotypes: [],
    taggedValues: [],
    testSuites: [],
  },
};

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** One of the sections of the data product editor's form, by its label */
const formSection = (scope: Locator, label: string): Locator =>
  scope.locator('.panel__content__form__section').filter({
    has: scope.page().locator('.panel__content__form__section__header__label', {
      hasText: new RegExp(`^${label}$`, 'u'),
    }),
  });

/** A button of the data product editor's side bar, e.g. `APG` */
const sideBarButton = (editor: Locator, name: string): Locator =>
  editor
    .locator('.data-space__viewer__activity-bar__items')
    .getByRole('button', { name, exact: true });

/** Opens the guide's data product on one of the pages of its editor */
const openDataProductPage = async (
  page: Page,
  name: string,
): Promise<Locator> => {
  await openGuideWorkspace(page, {
    extraEntities: [FIRM_INGEST, FIRM_DATA_PRODUCT],
  });
  for (const node of FIRM_DATA_PRODUCT.path.split('::')) {
    await getExplorer(page).getByText(node, { exact: true }).first().click();
  }
  const editor = getEditorGroup(page);
  await sideBarButton(editor, name).click();
  return editor;
};

test("a data product's home page", async ({ page }) => {
  // the page is taller than the window
  await page.setViewportSize({ width: 1440, height: 1150 });
  const editor = await openDataProductPage(page, 'Home');
  await formSection(editor, 'Icon/Image').waitFor();
  await page.mouse.move(1300, 1100);
  await markCallouts(page, [
    {
      n: 1,
      // by their labels, the widest of which is wider than the side bar
      targets: ['Home', 'Operational', 'Support'].map((name) =>
        sideBarButton(editor, name),
      ),
      at: 'below',
      textOnly: true,
    },
    { n: 2, targets: [button(editor, 'Preview')], at: 'left' },
    // the fields themselves, as their sections are as wide as the editor
    {
      n: 3,
      targets: [formSection(editor, 'Title').locator('input')],
      at: 'right',
    },
    {
      n: 4,
      targets: [formSection(editor, 'Description').locator('textarea')],
      at: 'right',
    },
    {
      n: 5,
      targets: [
        formSection(editor, 'Data Product Type').locator(
          '.panel__content__form__section__dropdown',
        ),
      ],
      at: 'right',
    },
    {
      n: 6,
      // the icon; the upload below takes the prompt's full width
      targets: [
        editor.locator('.data-product-editor__icon-preview'),
        editor.locator('.icon-selector__grid'),
      ],
      at: 'right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-product.png`,
    editor,
    formSection(editor, 'Icon/Image'),
    12,
  );
});

test("a data product's access points", async ({ page }) => {
  const editor = await openDataProductPage(page, 'APG');
  // the functions' text, which the engine writes
  const firms = editor.locator('.access-point-editor').first();
  await expect(firms).toContainText('FirmIngest.FIRM');
  await page.mouse.move(1300, 850);
  await markCallouts(page, [
    {
      n: 1,
      // by their text, as the tabs' bar reaches up to the page's title
      targets: [
        editor.getByRole('tab', { name: 'firmTables' }),
        editor.getByRole('tab', { name: 'firmModel' }),
        editor.locator('.uml-element-editor__tabs .panel__header__action'),
      ],
      at: 'right',
      textOnly: true,
    },
    {
      n: 2,
      targets: [
        editor
          .locator('.access-point-editor__group-container__name-editor')
          .first(),
        editor.locator('.data-product-editor__apg-targets-input'),
      ],
      at: 'inside-bottom-right',
    },
    {
      n: 3,
      targets: [editor.getByTitle('Create new access point')],
      at: 'left',
    },
    {
      n: 4,
      // by their text, as the name's box reaches across to the buttons
      targets: [
        firms.locator('.access-point-editor__name__label'),
        firms.locator('.access-point-editor__title'),
        firms.locator('.access-point-editor__description-container').last(),
      ],
      at: 'right',
      textOnly: true,
    },
    {
      n: 5,
      targets: [firms.locator('.access-point-editor__entry')],
      at: 'below',
    },
    {
      n: 6,
      targets: [firms.locator('.access-point-editor__info')],
      at: 'above',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-product-access-points.png`,
    editor,
    editor.locator('.access-point-editor').last(),
    24,
  );
});

test("a data product's support information", async ({ page }) => {
  const editor = await openDataProductPage(page, 'Support');
  await editor.getByText('Expertise', { exact: true }).waitFor();
  await page.mouse.move(1300, 850);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor
          .locator('.data-product-editor__support-info__link-container')
          .first(),
        editor
          .locator('.data-product-editor__support-info__link-container')
          .last(),
      ],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [
        editor.getByText('Emails', { exact: true }),
        button(editor, 'Add Value'),
      ],
      at: 'inside-right',
    },
    {
      n: 3,
      targets: [
        editor.getByText('Expertise', { exact: true }),
        editor.locator('.data-product-editor__expertise'),
      ],
      // below its remove button; its add button is at the top right
      at: 'inside-bottom-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-product-support.png`,
    editor,
    editor.locator('.data-product-editor__expertise'),
    24,
  );
});
