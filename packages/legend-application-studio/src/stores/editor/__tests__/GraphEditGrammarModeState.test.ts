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

import { test, expect, jest } from '@jest/globals';
import { flowResult } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import { SourceInformation } from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import { GraphEditGrammarModeState } from '../GraphEditGrammarModeState.js';

const setUpTextModeEntry = (
  editorStore: EditorStore,
  index: Record<string, number>,
): GraphEditGrammarModeState => {
  jest
    .spyOn(editorStore.graphManagerState.graphManager, 'pureCodeToEntities')
    .mockImplementation(async (code, options) => {
      Object.entries(index).forEach(([path, startLine]) =>
        options?.sourceInformationIndex?.set(
          path,
          new SourceInformation('', startLine, 1, startLine + 3, 1),
        ),
      );
      return [];
    });
  jest
    .spyOn(editorStore.changeDetectionState, 'computeLocalChangesInTextMode')
    .mockImplementation(() => Promise.resolve() as never);
  return new GraphEditGrammarModeState(editorStore);
};

test(
  unitTest(
    'Entering text mode puts the cursor on the element whose form editor was open',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    // leaving form mode has already closed the tabs and cached the one that was current
    editorStore.tabManagerState.cachedTabs = {
      openedTabEditorPaths: ['model::Firm', 'model::Person'],
      currentTabState: undefined,
      currentTabElementPath: 'model::Person',
    };
    const grammarModeState = setUpTextModeEntry(editorStore, {
      'model::Firm': 1,
      'model::Person': 12,
    });

    await flowResult(grammarModeState.initialize());

    expect(
      grammarModeState.grammarTextEditorState.forcedCursorPosition,
    ).toEqual({ lineNumber: 12, column: 0 });
  },
);

test(
  unitTest('Entering text mode with no element open leaves the cursor alone'),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const grammarModeState = setUpTextModeEntry(editorStore, {
      'model::Person': 12,
    });

    await flowResult(grammarModeState.initialize());

    expect(
      grammarModeState.grammarTextEditorState.forcedCursorPosition,
    ).toBeUndefined();
  },
);
