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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { flowResult } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import { CompilationError } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../EditorStore.js';
import type { GraphEditFormModeState } from '../GraphEditFormModeState.js';
import { FileSystem_File } from '../utils/FileSystemTreeUtils.js';

/**
 * What the status bar shows while compile (F9) and generate (F10) run (when the compile
 * started, and the step a generation is on), and what a generation notifies when it succeeds.
 */

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('Compile in progress'), () => {
  test.each([
    [
      'succeeds',
      (): Promise<{ warnings: [] }> => Promise.resolve({ warnings: [] }),
    ],
    [
      'fails',
      (): Promise<never> =>
        Promise.reject(new CompilationError('compile boom')),
    ],
  ])(
    'a compile in form mode that %s records its start while it runs, then clears it',
    async (_, compile) => {
      const editorStore = TEST__getTestEditorStore();
      let startedAtWhileRunning: number | undefined;
      jest
        .spyOn(editorStore.graphManagerState.graphManager, 'compileGraph')
        .mockImplementation(() => {
          startedAtWhileRunning = editorStore.graphState.compileStartedAt;
          return compile();
        });
      // a compilation error that can't be shown in the form falls back to text mode
      jest
        .spyOn(editorStore, 'switchModes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockReturnValue(Promise.resolve() as any);
      await flowResult(
        (editorStore.graphEditorMode as GraphEditFormModeState).globalCompile(),
      );
      expect(typeof startedAtWhileRunning).toBe('number');
      expect(editorStore.graphState.compileStartedAt).toBeUndefined();
    },
  );
});

describe(unitTest('Generate in progress'), () => {
  test('a generation records its step and start while it runs, then clears them', async () => {
    const editorStore = TEST__getTestEditorStore();
    const generationState = editorStore.graphState.graphGenerationState;
    jest
      .spyOn(
        editorStore.graphState,
        'checkIfApplicationUpdateOperationIsRunning',
      )
      .mockReturnValue(false);
    const steps: (string | undefined)[] = [];
    const startedAt: (number | undefined)[] = [];
    const record = (): Promise<undefined> => {
      steps.push(generationState.generationStep);
      startedAt.push(generationState.generationStartedAt);
      return Promise.resolve(undefined);
    };
    jest
      .spyOn(generationState, 'generateModels')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(record as any);
    jest
      .spyOn(generationState, 'generateArtifacts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(record as any);
    await flowResult(generationState.globalGenerate());
    expect(steps).toEqual(['models', 'artifacts']);
    expect(startedAt.every((value) => typeof value === 'number')).toBe(true);
    expect(generationState.generationStep).toBeUndefined();
    expect(generationState.generationStartedAt).toBeUndefined();
  });
});

describe(unitTest('Generate success notification'), () => {
  const TEST_ENTITY: Entity = {
    path: 'model::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {},
  };

  const runGlobalGenerate = async (
    steps: {
      generateModels?: (editorStore: EditorStore) => Error | undefined;
      generateArtifacts?: (editorStore: EditorStore) => Error | undefined;
    },
    options?: { disableNotificationOnSuccess?: boolean },
  ): Promise<{
    notifySuccess: jest.Mock;
    notify: jest.Mock;
  }> => {
    const editorStore = TEST__getTestEditorStore();
    const generationState = editorStore.graphState.graphGenerationState;
    const notificationService =
      editorStore.applicationStore.notificationService;
    const notifySuccess = jest.fn();
    const notify = jest.fn();
    jest
      .spyOn(notificationService, 'notifySuccess')
      .mockImplementation(notifySuccess);
    jest.spyOn(notificationService, 'notify').mockImplementation(notify);
    jest
      .spyOn(
        editorStore.graphState,
        'checkIfApplicationUpdateOperationIsRunning',
      )
      .mockReturnValue(false);
    jest.spyOn(generationState, 'generateModels').mockImplementation(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Promise.resolve(steps.generateModels?.(editorStore)) as any,
    );
    jest.spyOn(generationState, 'generateArtifacts').mockImplementation(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Promise.resolve(steps.generateArtifacts?.(editorStore)) as any,
    );
    await flowResult(generationState.globalGenerate(options));
    return { notifySuccess, notify };
  };

  const generateTwoElementsAndAFile = {
    generateModels: (editorStore: EditorStore): undefined => {
      editorStore.graphState.graphGenerationState.generatedEntities.set(
        'model::MyGeneration',
        [TEST_ENTITY, { ...TEST_ENTITY, path: 'model::Firm' }],
      );
      return undefined;
    },
    generateArtifacts: (editorStore: EditorStore): undefined => {
      editorStore.graphState.graphGenerationState.filesIndex.set(
        'model/Person.avro',
        new FileSystem_File('Person.avro', '{}'),
      );
      return undefined;
    },
  };

  test('a generation says what it produced', async () => {
    const { notifySuccess } = await runGlobalGenerate(
      generateTwoElementsAndAFile,
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'Generated 2 elements and 1 file',
    );
  });

  test('a generation that produced nothing says so', async () => {
    const { notifySuccess, notify } = await runGlobalGenerate({});
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Nothing to generate');
  });

  test('a generation a viewer runs on opening notifies nothing', async () => {
    const { notifySuccess, notify } = await runGlobalGenerate(
      generateTwoElementsAndAFile,
      { disableNotificationOnSuccess: true },
    );
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test('a failed generation notifies no success', async () => {
    const { notifySuccess, notify } = await runGlobalGenerate({
      generateArtifacts: () => new Error('Generation service unavailable'),
    });
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
