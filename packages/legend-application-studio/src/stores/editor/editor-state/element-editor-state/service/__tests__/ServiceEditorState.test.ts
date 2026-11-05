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

import { expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import { RawLambda, resolveServiceQueryRawLambda } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { TEST__getTestEditorStore } from '../../../../__test-utils__/EditorStoreTestUtils.js';
import { getSavedServiceQueryHash } from '../ServiceEditorState.js';

const SERVICE_PATH = 'model::MyService';

const createServiceEntity = (execution: object | undefined): Entity => ({
  path: SERVICE_PATH,
  classifierPath: 'meta::legend::service::metamodel::Service',
  content: { _type: 'service', name: 'MyService', execution },
});

const body = [{ _type: 'string', value: 'a' }];
const parameters: object[] = [];

test(
  unitTest(
    'getSavedServiceQueryHash matches the hash of the same query held in memory',
  ),
  () => {
    const entities = [
      createServiceEntity({
        _type: 'pureSingleExecution',
        func: { _type: 'lambda', parameters, body },
      }),
    ];
    expect(getSavedServiceQueryHash(entities, SERVICE_PATH)).toBe(
      new RawLambda(parameters, body).hashCode,
    );
  },
);

test(unitTest('getSavedServiceQueryHash ignores source information'), () => {
  const entities = [
    createServiceEntity({
      _type: 'pureSingleExecution',
      func: {
        _type: 'lambda',
        parameters,
        body: [
          {
            _type: 'string',
            value: 'a',
            sourceInformation: { startLine: 1, startColumn: 1 },
          },
        ],
      },
    }),
  ];
  expect(getSavedServiceQueryHash(entities, SERVICE_PATH)).toBe(
    new RawLambda(parameters, body).hashCode,
  );
});

test(
  unitTest('getSavedServiceQueryHash differs when the saved query differs'),
  () => {
    const entities = [
      createServiceEntity({
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          parameters,
          body: [{ _type: 'string', value: 'b' }],
        },
      }),
    ];
    expect(getSavedServiceQueryHash(entities, SERVICE_PATH)).not.toBe(
      new RawLambda(parameters, body).hashCode,
    );
  },
);

test(
  unitTest(
    'getSavedServiceQueryHash reads the query of a multi execution service',
  ),
  () => {
    const entities = [
      createServiceEntity({
        _type: 'pureMultiExecution',
        executionKey: 'env',
        func: { _type: 'lambda', parameters, body },
      }),
    ];
    expect(getSavedServiceQueryHash(entities, SERVICE_PATH)).toBe(
      new RawLambda(parameters, body).hashCode,
    );
  },
);

test(
  unitTest(
    'getSavedServiceQueryHash is undefined when there is no saved service or no query to compare',
  ),
  () => {
    expect(getSavedServiceQueryHash([], SERVICE_PATH)).toBeUndefined();
    expect(
      getSavedServiceQueryHash(
        [{ ...createServiceEntity(undefined), path: 'model::Other' }],
        SERVICE_PATH,
      ),
    ).toBeUndefined();
    expect(
      getSavedServiceQueryHash([createServiceEntity(undefined)], SERVICE_PATH),
    ).toBeUndefined();
  },
);

test(
  unitTest('saved query hash is found in a really serialized service'),
  async () => {
    // the saved JSON shape here comes from the actual serializer, not from this test
    const editorStore = TEST__getTestEditorStore();
    await TEST__buildGraphWithEntities(editorStore.graphManagerState, [
      {
        path: SERVICE_PATH,
        classifierPath: 'meta::legend::service::metamodel::Service',
        content: {
          _type: 'service',
          name: 'MyService',
          package: 'model',
          pattern: '/myService',
          owners: ['owner'],
          documentation: '',
          autoActivateUpdates: true,
          execution: {
            _type: 'pureSingleExecution',
            func: { _type: 'lambda', parameters, body },
          },
        },
      },
    ]);
    const service =
      editorStore.graphManagerState.graph.getService(SERVICE_PATH);
    const entity =
      editorStore.graphManagerState.graphManager.elementToEntity(service);

    expect(getSavedServiceQueryHash([entity], SERVICE_PATH)).toBe(
      resolveServiceQueryRawLambda(service)?.hashCode,
    );
    expect(getSavedServiceQueryHash([entity], SERVICE_PATH)).toBeDefined();
  },
);
