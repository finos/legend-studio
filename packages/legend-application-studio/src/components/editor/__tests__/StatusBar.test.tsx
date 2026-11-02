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

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import {
  type RenderResult,
  act,
  getByRole,
  getByText,
} from '@testing-library/react';
import { runInAction } from 'mobx';
import { integrationTest } from '@finos/legend-shared/test';
import TEST_DATA__m2mGraphEntities from '../../../stores/editor/__tests__/TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';

let renderResult: RenderResult;
let editorStore: EditorStore;

beforeEach(async () => {
  editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__m2mGraphEntities,
  });
  // the running state ticks every second: control it
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** What compile and generate are doing, in the status bar. */
const getActivity = (): HTMLElement =>
  getByRole(
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.STATUS_BAR),
    'status',
  );

test(
  integrationTest('Status bar shows a running compile and how long it has run'),
  () => {
    const graphState = editorStore.graphState;
    expect(getActivity().textContent).toBe('');
    act(() => {
      runInAction(() => {
        graphState.isRunningGlobalCompile = true;
      });
      graphState.setCompileStartedAt(Date.now());
    });
    getByText(getActivity(), 'Compiling…');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    getByText(getActivity(), '2s');

    // how it ended is left to the notifications
    act(() => {
      runInAction(() => {
        graphState.isRunningGlobalCompile = false;
      });
      graphState.setCompileStartedAt(undefined);
    });
    expect(getActivity().textContent).toBe('');
  },
);

test(
  integrationTest('Status bar shows the step a running generation is on'),
  () => {
    const generationState = editorStore.graphState.graphGenerationState;
    act(() => {
      runInAction(() => {
        generationState.isRunningGlobalGenerate = true;
        generationState.generationStep = 'models';
        generationState.generationStartedAt = Date.now();
      });
    });
    getByText(getActivity(), 'Generating models…');
    getByText(getActivity(), '1/2');
    act(() => {
      runInAction(() => {
        generationState.generationStep = 'artifacts';
      });
    });
    getByText(getActivity(), 'Generating artifacts…');
    getByText(getActivity(), '2/2');

    act(() => {
      runInAction(() => {
        generationState.isRunningGlobalGenerate = false;
        generationState.generationStep = undefined;
        generationState.generationStartedAt = undefined;
      });
    });
    expect(getActivity().textContent).toBe('');
  },
);
