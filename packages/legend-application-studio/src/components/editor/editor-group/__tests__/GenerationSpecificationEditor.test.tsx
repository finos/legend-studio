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
import { integrationTest } from '@finos/legend-shared/test';
import {
  fireEvent,
  getAllByText,
  getByText,
  waitFor,
} from '@testing-library/react';
import {
  type DSL_Generation_PureGraphManagerPlugin_Extension,
  type ModelGenerationSpecification,
  type PureModel,
  PureGraphManagerPlugin,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LegendStudioPluginManager } from '../../../../application/LegendStudioPluginManager.js';
import { TEST_DATA__GenerationSpecificationStages } from '../../../../stores/editor/editor-state/__tests__/TEST_DATA__GenerationSpecificationStages.js';

/**
 * What may appear in a stage comes from the extension that owns the element type. Nothing in
 * open-source Studio implements this getter, so the palette has to be fed by a plugin the way a
 * DSL extension would.
 */
class TEST__ModelGenerationPlugin
  extends PureGraphManagerPlugin
  implements DSL_Generation_PureGraphManagerPlugin_Extension
{
  constructor() {
    super('@finos/legend-application-studio-test-model-generation', '0.0.0');
  }

  getExtraModelGenerationElementGetters(): ((
    graph: PureModel,
  ) => ModelGenerationSpecification[])[] {
    return [
      (graph): ModelGenerationSpecification[] =>
        graph.ownMappings as unknown as ModelGenerationSpecification[],
    ];
  }
}

const setUpEditor = async (
  withModelGenerationPlugin: boolean,
): Promise<HTMLElement> => {
  const pluginManager = LegendStudioPluginManager.create();
  if (withModelGenerationPlugin) {
    pluginManager.registerPureGraphManagerPlugin(
      new TEST__ModelGenerationPlugin(),
    );
  }
  const MOCK__editorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    MOCK__editorStore,
    {
      entities:
        TEST_DATA__GenerationSpecificationStages as PlainObject<Entity>[],
    },
  );
  await TEST__openElementFromExplorerTree('test::tGenSpec', renderResult);
  return (await waitFor(() =>
    renderResult.baseElement.querySelector('.generation-spec-editor'),
  )) as HTMLElement;
};

test(
  integrationTest('Generation specification renders its nodes as stages'),
  async () => {
    const editor = await setUpEditor(true);

    // one lane per generation node, in the order they are declared
    await waitFor(() => getByText(editor, 'Stage 1'));
    await waitFor(() => getByText(editor, 'Stage 2'));
    // the elements of a node are the cards of its lane
    await waitFor(() => getByText(editor, 'tMapping'));
    await waitFor(() => getByText(editor, 'tMapping2'));
    await waitFor(() => getByText(editor, 'tMapping3'));
    getByText(
      editor,
      '2 generations, run together against the same compiled model',
    );
    // the cost of the specification, shown permanently
    getByText(editor, '2 stages, 2 recompiles');
    // a stage boundary is a recompile, and the divider says so
    getByText(editor, 'Recompile');
    getByText(editor, 'Stage 2 can use everything stage 1 produced');
    // file generations are a band of their own, after all model generation
    getByText(editor, 'Model generation complete');
    // the palette section and the band at the end of the board
    expect(getAllByText(editor, 'File generations')).toHaveLength(2);
    getByText(editor, 'tFileGen');
    // a stage is never created empty: it comes into being with something in it
    getByText(
      editor,
      'Drop here for a new stage - runs after everything above',
    );
    // the palette offers what the extension says may be generated, and marks what is already used
    getByText(editor, 'test::tMapping2');
    expect(
      Array.from(
        editor.querySelectorAll(
          '.generation-spec-editor__palette__item__usage',
        ),
      ).map((element) => element.textContent),
    ).toEqual(['in use', 'in use', 'in use', 'in use']);
  },
);

test(
  integrationTest('A stage can be made to run earlier or later'),
  async () => {
    const editor = await setUpEditor(true);
    await waitFor(() => getByText(editor, 'Stage 2'));

    const stages = Array.from(
      editor.querySelectorAll('.generation-spec-editor__stage'),
    );
    const secondStage = stages[1] as HTMLElement;
    fireEvent.click(
      secondStage.querySelectorAll(
        '.generation-spec-editor__stage__header__action',
      )[0] as HTMLElement,
    );

    // the single-element stage now runs first
    await waitFor(() => {
      const firstStage = editor.querySelectorAll(
        '.generation-spec-editor__stage',
      )[0] as HTMLElement;
      getByText(firstStage, 'tMapping3');
    });
  },
);

test(
  integrationTest(
    'Without an extension that generates models, the palette says so',
  ),
  async () => {
    const editor = await setUpEditor(false);
    await waitFor(() => getByText(editor, 'Stage 1'));

    getByText(
      editor,
      'No model generation elements. These come from Studio extensions, so this list stays empty unless a DSL extension that generates models is installed.',
    );
    // the stages themselves still render: a specification can be read without the extension
    getByText(editor, '2 stages, 2 recompiles');
  },
);
