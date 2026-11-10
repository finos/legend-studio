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
import { grammarToEntities } from '../support/StudioSetup.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/**
 * Data quality checks of the guide's database, and a generation specification
 * that runs them in two stages. Only this script has them, so the other
 * pages' explorer stays as it is.
 */
const QUALITY_MODEL = `###DataQualityValidation
DataQualityRelationValidation guide::quality::PersonChecks
{
  query: |#>{guide::store::FirmDatabase.PERSON}#->from(guide::store::FirmRuntime);
  validations: [
    {
      name: 'lastNamePresent';
      description: 'Every person has a last name';
      assertion: row|$row.LAST_NAME->isNotEmpty();
      type: ROW_LEVEL;
    }
  ];
}

DataQualityRelationValidation guide::quality::FirmChecks
{
  query: |#>{guide::store::FirmDatabase.FIRM}#->from(guide::store::FirmRuntime);
  validations: [
    {
      name: 'legalNamePresent';
      description: 'Every firm has a legal name';
      assertion: row|$row.LEGAL_NAME->isNotEmpty();
      type: ROW_LEVEL;
    }
  ];
}

DataQualityRelationValidation guide::quality::FirmsExist
{
  query: |#>{guide::store::FirmDatabase.FIRM}#->from(guide::store::FirmRuntime);
  validations: [
    {
      name: 'firmsExist';
      description: 'The database holds at least one firm';
      assertion: rel|$rel->assertRelationNotEmpty();
      type: AGGREGATE;
    }
  ];
}

DataQualityRelationValidation guide::quality::PersonAges
{
  query: |#>{guide::store::FirmDatabase.PERSON}#->from(guide::store::FirmRuntime);
  validations: [
    {
      name: 'agePositive';
      description: 'Every age is above zero';
      assertion: row|$row.AGE > 0;
      type: ROW_LEVEL;
    }
  ];
}


###GenerationSpecification
GenerationSpecification guide::quality::QualityGeneration
{
  generationNodes: [
    {
      id: 'checks';
      generationElements: [
        guide::quality::PersonChecks,
        guide::quality::FirmChecks,
        guide::quality::FirmsExist
      ];
    },
    {
      id: 'ages';
      generationElement: guide::quality::PersonAges;
    }
  ];
}
`;

const SPECIFICATION_PATH = 'guide::quality::QualityGeneration';

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

/** Opens the guide's generation specification in its editor */
const openSpecification = async (page: Page): Promise<Locator> => {
  await openGuideWorkspace(page, {
    extraEntities: await grammarToEntities(QUALITY_MODEL),
  });
  for (const node of SPECIFICATION_PATH.split('::')) {
    await getExplorer(page).getByText(node, { exact: true }).first().click();
  }
  const editor = getEditorGroup(page);
  await editor.locator('.generation-spec-editor__board').waitFor();
  return editor;
};

test('a generation specification', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const editor = await openSpecification(page);
  await page.mouse.move(1400, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.generation-spec-editor__stat')],
      at: 'below',
    },
    {
      n: 2,
      targets: [editor.locator('.generation-spec-editor__flatten')],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        editor.locator('.generation-spec-editor__palette__section').first(),
      ],
      at: 'below',
    },
    {
      n: 4,
      targets: [
        editor.locator('.generation-spec-editor__divider__label').first(),
      ],
      at: 'right',
    },
    {
      // stage 2, whose one card leaves room for the number
      n: 5,
      targets: [editor.locator('.generation-spec-editor__stage').nth(1)],
      at: 'inside-bottom-right',
    },
    {
      n: 6,
      targets: [editor.locator('.generation-spec-editor__new-stage')],
      at: 'inside-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}generation-specification.png`,
    editor,
    editor.locator('.generation-spec-editor__file-generations'),
    24,
  );
});

test('a generation specification in one stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const editor = await openSpecification(page);
  await editor.locator('.generation-spec-editor__flatten').click();
  await editor.getByText('1 stage, 1 recompile', { exact: true }).waitFor();
  await page.mouse.move(1400, 880);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}generation-specification-one-stage.png`,
    editor,
    editor.locator('.generation-spec-editor__file-generations'),
    24,
  );
});
