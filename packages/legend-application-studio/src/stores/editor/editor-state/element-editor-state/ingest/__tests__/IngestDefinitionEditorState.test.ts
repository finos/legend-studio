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
import { waitFor } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import {
  IngestDefinition,
  IngestFunctionSource,
  IngestSerializedSource,
  type RawLambda,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../../../../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../../../../EditorStore.js';
import { IngestDefinitionEditorState } from '../IngestDefinitionEditorState.js';
import { ingestDefinition_addMaterializedView } from '../../../../../graph-modifier/DSL_Ingest_GraphModifierHelper.js';

const INGEST_PATH = 'test::Ingest';

const lambda = (column: string): PlainObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'property',
      property: column,
      parameters: [{ _type: 'var', name: 'x' }],
    },
  ],
});

const INGEST_CONTENT: PlainObject = {
  _type: 'ingestDefinition',
  package: 'test',
  name: 'Ingest',
  readMode: { _type: 'Snapshot', format: { _type: 'Avro' } },
  // as an older protocol stored it
  writeMode: 'batch_milestoned',
  appDirDeployment: { appDirId: 1, level: 'DEPLOYMENT' },
  datasets: [
    {
      name: 'DS',
      primaryKey: ['id'],
      ingestPartitionColumns: ['id'],
      schema: {
        _type: 'relationType',
        columns: [
          {
            name: 'id',
            genericType: {
              rawType: { _type: 'packageableType', fullPath: 'Int' },
            },
            multiplicity: { lowerBound: 1, upperBound: 1 },
          },
        ],
      },
      privacyClassification: { sensitivity: 'DP10' },
    },
  ],
};

const setUp = async (
  content: PlainObject,
): Promise<{ editorStore: EditorStore; ingest: IngestDefinition }> => {
  const editorStore = TEST__getTestEditorStore();
  await TEST__buildGraphWithEntities(editorStore.graphManagerState, [
    {
      path: INGEST_PATH,
      classifierPath:
        'meta::external::ingest::specification::metamodel::IngestDefinition',
      content,
    },
  ]);
  const ingest = guaranteeType(
    editorStore.graphManagerState.graph.getElement(INGEST_PATH),
    IngestDefinition,
  );
  return { editorStore, ingest };
};

// the engine's Pure for each lambda: its first column
const mockLambdasToPureCode = (editorStore: EditorStore) =>
  jest
    .spyOn(editorStore.graphManagerState.graphManager, 'lambdasToPureCode')
    .mockImplementation(async (lambdas: Map<string, RawLambda>) => {
      const result = new Map<string, string>();
      lambdas.forEach((rawLambda, id) => {
        const body = rawLambda.body as { property: string }[];
        result.set(id, `x|$x.${body[0]?.property}`);
      });
      return result;
    });

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('Ingest definition editor state specification'), () => {
  test('is built when the editor opens, with its lambdas as Pure', async () => {
    const { editorStore, ingest } = await setUp(INGEST_CONTENT);
    const lambdasToPureCode = mockLambdasToPureCode(editorStore);

    const state = new IngestDefinitionEditorState(editorStore, ingest);

    expect(state.specification).toBeDefined();
    expect(state.specification).toBe(ingest.specification);
    const dataset = state.specification?.datasets[0];
    expect(dataset?.name).toBe('DS');
    expect(dataset?.source).toBeInstanceOf(IngestSerializedSource);
    const partition = dataset?.ingestPartitionColumns[0] as RawLambda;
    await waitFor(() =>
      expect(state.lambdaGrammars.get(partition)).toBe('x|$x.id'),
    );
    expect(lambdasToPureCode).toHaveBeenCalledTimes(1);
  });

  test('is undefined, with a warning, when the content cannot be read, and the editor still opens', async () => {
    const { editorStore, ingest } = await setUp({
      ...INGEST_CONTENT,
      writeMode: 42,
    });
    const lambdasToPureCode = mockLambdasToPureCode(editorStore);
    const warn = jest
      .spyOn(editorStore.graphManagerState.graphManager.logService, 'warn')
      .mockImplementation(() => undefined);
    const hashCode = ingest.hashCode;

    const state = new IngestDefinitionEditorState(editorStore, ingest);

    expect(state.specification).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(lambdasToPureCode).not.toHaveBeenCalled();
    expect(ingest.hashCode).toBe(hashCode);
  });

  test('is rebuilt when the content changes, e.g. a materialized view is added', async () => {
    const { editorStore, ingest } = await setUp(INGEST_CONTENT);
    const lambdasToPureCode = mockLambdasToPureCode(editorStore);
    const state = new IngestDefinitionEditorState(editorStore, ingest);
    const first = state.specification;

    // nothing changed: nothing is rebuilt or converted again
    state.buildSpecification();
    expect(state.specification).toBe(first);

    ingestDefinition_addMaterializedView(ingest, 'VIEW', lambda('id'), {
      primaryKey: [],
      sensitivity: 'DP10',
    });
    state.buildSpecification();

    expect(state.specification).not.toBe(first);
    const view = state.specification?.datasets[1];
    expect(view?.name).toBe('VIEW');
    const source = guaranteeType(view?.source, IngestFunctionSource);
    await waitFor(() =>
      expect(state.lambdaGrammars.get(source.function)).toBe('x|$x.id'),
    );
    expect(lambdasToPureCode).toHaveBeenCalledTimes(2);
  });

  test('keeps the specification when its lambdas cannot be shown as Pure', async () => {
    const { editorStore, ingest } = await setUp(INGEST_CONTENT);
    jest
      .spyOn(editorStore.graphManagerState.graphManager, 'lambdasToPureCode')
      .mockRejectedValue(new Error('engine unavailable'));
    const warn = jest
      .spyOn(editorStore.applicationStore.logService, 'warn')
      .mockImplementation(() => undefined);

    const state = new IngestDefinitionEditorState(editorStore, ingest);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(state.specification).toBeDefined();
    expect(state.lambdaGrammars.size).toBe(0);
  });

  test('does not call the engine when the specification has no lambdas', async () => {
    const { editorStore, ingest } = await setUp({
      ...INGEST_CONTENT,
      datasets: [
        {
          ...(INGEST_CONTENT.datasets as PlainObject[])[0],
          ingestPartitionColumns: [],
        },
      ],
    });
    const lambdasToPureCode = mockLambdasToPureCode(editorStore);

    const state = new IngestDefinitionEditorState(editorStore, ingest);

    expect(state.specification).toBeDefined();
    expect(lambdasToPureCode).not.toHaveBeenCalled();
    expect(state.lambdaGrammars.size).toBe(0);
  });
});
