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

import { test, expect } from '@jest/globals';
import { fireEvent, getByText, waitFor } from '@testing-library/react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import { ModelGenerationSpecification } from '@finos/legend-graph';
import {
  type EditorStore,
  LegendStudioPluginManager,
} from '@finos/legend-application-studio';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '@finos/legend-application-studio/test';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_DataQuality_GraphManagerPreset } from '../../graph-manager/DSL_DataQuality_GraphManagerPreset.js';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityRelationComparisonConfiguration,
  DataQualityRelationValidationConfiguration,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { DSL_DataQuality_LegendStudioApplicationPlugin } from '../DSL_DataQuality_LegendStudioApplicationPlugin.js';
import { TEST_DATA__DataQualityModelGeneration } from './TEST_DATA__DataQualityModelGeneration.js';

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([
    new DSL_DataSpace_GraphManagerPreset(),
    new DSL_DataQuality_GraphManagerPreset(),
  ])
  .usePlugins([new DSL_DataQuality_LegendStudioApplicationPlugin()])
  .install();

const setUpGenerationSpecificationEditor = async (): Promise<{
  editorStore: EditorStore;
  explorer: HTMLElement;
  editor: HTMLElement;
}> => {
  const editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__DataQualityModelGeneration,
  });
  await TEST__openElementFromExplorerTree('model::genSpec', renderResult);
  const editor = await waitFor(() =>
    guaranteeNonNullable(
      renderResult.container.querySelector<HTMLElement>(
        '.generation-spec-editor',
      ),
    ),
  );
  return {
    editorStore,
    explorer: renderResult.getByTestId('explorer-trees'),
    editor,
  };
};

const getPaletteItem = (editor: HTMLElement, path: string): HTMLElement =>
  guaranteeNonNullable(
    Array.from(
      editor.querySelectorAll<HTMLElement>(
        '.generation-spec-editor__palette__item',
      ),
    ).find(
      (item) =>
        item.querySelector('.generation-spec-editor__palette__item__name')
          ?.textContent === path,
    ),
    `Can't find palette item '${path}'`,
  );

const getStages = (editor: HTMLElement): HTMLElement[] =>
  Array.from(editor.querySelectorAll('.generation-spec-editor__stage'));

const dragAndDrop = (source: HTMLElement, target: HTMLElement): void => {
  fireEvent.dragStart(source);
  fireEvent.dragEnter(target);
  fireEvent.dragOver(target);
  fireEvent.drop(target);
  fireEvent.dragEnd(source);
};

test('Relation validations and relation comparisons are model generations, class validations are not', () => {
  // engine's protocol has both extend ModelGenerationSpecification
  expect(
    new DataQualityRelationValidationConfiguration('relationValidation'),
  ).toBeInstanceOf(ModelGenerationSpecification);
  expect(
    new DataQualityRelationComparisonConfiguration('relationComparison'),
  ).toBeInstanceOf(ModelGenerationSpecification);
  // Studio adds every new model generation to the generation specification, so a class validation
  // must not be one
  expect(
    new DataQualityClassValidationsConfiguration('classValidation'),
  ).not.toBeInstanceOf(ModelGenerationSpecification);

  const plugin = new DSL_DataQuality_LegendStudioApplicationPlugin();
  const getDragType = (
    element: DataQualityClassValidationsConfiguration,
  ): string | undefined =>
    plugin
      .getExtraDragElementClassifiers()
      .map((classifier) => classifier(element))
      .find(Boolean);
  // only what the generation specification accepts can be dragged out of the explorer
  expect(
    getDragType(
      new DataQualityClassValidationsConfiguration('classValidation'),
    ),
  ).toBeUndefined();
  expect(plugin.getExtraModelGenerationSpecificationElementDnDTypes()).toEqual(
    [
      new DataQualityRelationValidationConfiguration('relationValidation'),
      new DataQualityRelationComparisonConfiguration('relationComparison'),
    ].map((element) =>
      plugin
        .getExtraDragElementClassifiers()
        .map((classifier) => classifier(element))
        .find(Boolean),
    ),
  );
});

test(
  integrationTest(
    'Relation validations and relation comparisons are offered in the generation specification palette',
  ),
  async () => {
    const { editorStore, editor } = await setUpGenerationSpecificationEditor();

    await waitFor(() => getByText(editor, 'Stage 1'));
    getPaletteItem(editor, 'model::relationValidation');
    getPaletteItem(editor, 'model::relationComparison');
    // the one already in a stage is marked as used
    expect(
      getPaletteItem(editor, 'model::relationValidation').querySelector(
        '.generation-spec-editor__palette__item__usage',
      )?.textContent,
    ).toBe('in use');
    expect(
      getPaletteItem(editor, 'model::relationComparison').querySelector(
        '.generation-spec-editor__palette__item__usage',
      ),
    ).toBeNull();
    // a relation validation is still a data quality validation everywhere else in Studio
    expect(
      editorStore.graphState.getPackageableElementType(
        editorStore.graphManagerState.graph.getElement(
          'model::relationValidation',
        ),
      ),
    ).toBe('DATAQUALITYVALIDATION');
  },
);

test(
  integrationTest(
    'A relation comparison dragged from the palette joins the stage it is dropped on',
  ),
  async () => {
    const { editor } = await setUpGenerationSpecificationEditor();
    await waitFor(() => getByText(editor, 'Stage 1'));

    dragAndDrop(
      getPaletteItem(editor, 'model::relationComparison'),
      guaranteeNonNullable(getStages(editor)[0]),
    );

    await waitFor(() =>
      getByText(
        guaranteeNonNullable(getStages(editor)[0]),
        '2 generations, run together against the same compiled model',
      ),
    );
    getByText(editor, '1 stage, 1 recompile');
  },
);

test(
  integrationTest(
    'A relation comparison dragged from the explorer gets a stage of its own',
  ),
  async () => {
    const { editor, explorer } = await setUpGenerationSpecificationEditor();
    await waitFor(() => getByText(editor, 'Stage 1'));

    dragAndDrop(
      getByText(explorer, 'relationComparison'),
      guaranteeNonNullable(
        editor.querySelector<HTMLElement>('.generation-spec-editor__new-stage'),
      ),
    );

    await waitFor(() => getByText(editor, '2 stages, 2 recompiles'));
    getByText(guaranteeNonNullable(getStages(editor)[1]), 'relationComparison');
  },
);

const TEST_DATA__WithoutGenerationSpecification =
  TEST_DATA__DataQualityModelGeneration.filter(
    (entity) => entity.path !== 'model::genSpec',
  );

test(
  integrationTest(
    'A workspace with relation validations and comparisons but no generation specification gets one when it opens',
  ),
  async () => {
    const editorStore = TEST__provideMockedEditorStore({ pluginManager });
    await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
      entities: TEST_DATA__WithoutGenerationSpecification,
    });

    // Studio adds a generation specification for the model generations it finds, as it does for
    // any model generation element
    const generationSpecifications =
      editorStore.graphManagerState.graph.ownGenerationSpecifications;
    expect(generationSpecifications.map((spec) => spec.path)).toEqual([
      'model::MyGenerationSpecification',
    ]);
    expect(
      guaranteeNonNullable(generationSpecifications[0]).generationNodes.flatMap(
        (node) => node.generationElements.map((element) => element.value.path),
      ),
    ).toEqual(['model::relationValidation', 'model::relationComparison']);
  },
);

test(
  integrationTest(
    'Viewing a project does not add a generation specification for relation validations and comparisons',
  ),
  async () => {
    const editorStore = TEST__provideMockedEditorStore({ pluginManager });
    await TEST__setUpEditorWithDefaultSDLCData(
      editorStore,
      { entities: TEST_DATA__WithoutGenerationSpecification },
      true,
    );

    // the elements are there, so the generation specification getter had something to find
    await waitFor(() =>
      guaranteeNonNullable(
        editorStore.graphManagerState.graph.getNullableElement(
          'model::relationValidation',
        ),
      ),
    );
    expect(
      editorStore.graphManagerState.graph.ownGenerationSpecifications,
    ).toHaveLength(0);
  },
);
