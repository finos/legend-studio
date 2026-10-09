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

import {
  test,
  describe,
  expect,
  jest,
  beforeAll,
  afterEach,
} from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
  HttpStatus,
  NetworkClientError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../__test-utils__/GraphManagerTestUtils.js';
import { AbstractPureGraphManager } from '../../../../AbstractPureGraphManager.js';
import { V1_RemoteEngine } from '../engine/V1_RemoteEngine.js';
import type { V1_PureGraphManager } from '../V1_PureGraphManager.js';
import type { V1_RelationType } from '../model/packageableElements/type/V1_RelationType.js';
import type { V1_BatchLambdaRelationTypeResponse } from '../engine/compilation/V1_LambdaReturnType.js';
import { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import type { RelationColumn } from '../../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';
import { PrecisePrimitiveType } from '../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { PrimitiveInstanceValue } from '../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import { CompilationError } from '../../../../action/EngineError.js';
import { CORE_PURE_PATH } from '../../../../../graph/MetaModelConst.js';

const TEST_DATA__entities: Entity[] = [
  {
    path: 'my::Color',
    content: {
      _type: 'Enumeration',
      name: 'Color',
      package: 'my',
      values: [{ value: 'RED' }, { value: 'GREEN' }],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'my::Doc',
    content: {
      _type: 'profile',
      name: 'Doc',
      package: 'my',
      stereotypes: [{ value: 'important' }],
      tags: [{ value: 'note' }],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
];

// The shape of a `compilation/lambdaRelationType` response
const ENGINE_RELATION_TYPE: PlainObject<V1_RelationType> = {
  _type: 'relationType',
  columns: [
    {
      name: 'CUSTOMER_ID',
      genericType: {
        multiplicityArguments: [],
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::precisePrimitives::Varchar',
        },
        typeArguments: [],
        typeVariableValues: [{ _type: 'integer', value: 5 }],
      },
      multiplicity: { lowerBound: 0, upperBound: 1 },
      stereotypes: [{ profile: 'my::Doc', value: 'important' }],
      taggedValues: [
        {
          tag: { profile: 'my::Doc', value: 'note' },
          value: 'from the orders table',
        },
      ],
    },
    {
      name: 'COLOR',
      genericType: {
        multiplicityArguments: [],
        rawType: { _type: 'packageableType', fullPath: 'my::Color' },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    },
  ],
};

const UNRESOLVABLE_RELATION_TYPE: PlainObject<V1_RelationType> = {
  _type: 'relationType',
  columns: [
    {
      name: 'NAME',
      genericType: {
        multiplicityArguments: [],
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::precisePrimitives::Varchar',
        },
        typeArguments: [],
        typeVariableValues: [{ _type: 'integer', value: 9 }],
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    },
    {
      name: 'MISSING',
      genericType: {
        multiplicityArguments: [],
        rawType: { _type: 'packageableType', fullPath: 'my::Missing' },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 0, upperBound: 1 },
    },
  ],
};

const ENGINE_BATCH_RESPONSE: V1_BatchLambdaRelationTypeResponse = {
  result: {
    ok: ENGINE_RELATION_TYPE,
    unresolvable: UNRESOLVABLE_RELATION_TYPE,
  },
  errors: {
    bad: {
      code: -1,
      errorType: 'COMPILATION',
      message:
        "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'",
      sourceInformation: {
        endColumn: 66,
        endLine: 1,
        sourceId: '',
        startColumn: 2,
        startLine: 1,
      },
      status: 'error',
    },
  },
};

const ENGINE_COMPILATION_ERROR = {
  code: -1,
  errorType: 'COMPILATION',
  message: "The store 'test::Db' can't be found.",
  sourceInformation: {
    sourceId: '',
    startLine: 1,
    startColumn: 2,
    endLine: 1,
    endColumn: 20,
  },
  status: 'error',
};

const graphManagerState = TEST__getTestGraphManagerState();
const lambda = new RawLambda([], [{ _type: 'integer', value: 1 }]);

const getEngineServerClient = () =>
  guaranteeType(
    (graphManagerState.graphManager as V1_PureGraphManager).engine,
    V1_RemoteEngine,
  ).getEngineServerClient();

const expectLosslessColumns = (columns: RelationColumn[]): void => {
  expect(columns.map((column) => column.name)).toEqual([
    'CUSTOMER_ID',
    'COLOR',
  ]);

  const customerId = guaranteeNonNullable(columns[0]);
  const customerIdType = customerId.genericType.value;
  expect(customerIdType.rawType).toBe(PrecisePrimitiveType.VARCHAR);
  expect(customerIdType.typeVariableValues).toHaveLength(1);
  expect(
    guaranteeType(
      customerIdType.typeVariableValues?.[0],
      PrimitiveInstanceValue,
    ).values,
  ).toEqual([5]);
  expect(customerId.multiplicity.lowerBound).toBe(0);
  expect(customerId.multiplicity.upperBound).toBe(1);
  expect(
    customerId.stereotypes.map((stereotype) => stereotype.value.value),
  ).toEqual(['important']);
  expect(
    customerId.taggedValues.map((taggedValue) => [
      taggedValue.tag.value.value,
      taggedValue.value,
    ]),
  ).toEqual([['note', 'from the orders table']]);

  const color = guaranteeNonNullable(columns[1]);
  expect(color.genericType.value.rawType).toBe(
    graphManagerState.graph.getEnumeration('my::Color'),
  );
  expect(color.multiplicity.lowerBound).toBe(1);
  expect(color.multiplicity.upperBound).toBe(1);
};

// `NAME` keeps its type; `MISSING`, whose type isn't in the graph, is typed
// `Any` and keeps its multiplicity
const expectUnresolvedColumnTypedAny = (columns: RelationColumn[]): void => {
  expect(columns.map((column) => column.name)).toEqual(['NAME', 'MISSING']);

  const nameType = guaranteeNonNullable(columns[0]).genericType.value;
  expect(nameType.rawType).toBe(PrecisePrimitiveType.VARCHAR);
  expect(
    guaranteeType(nameType.typeVariableValues?.[0], PrimitiveInstanceValue)
      .values,
  ).toEqual([9]);

  const missing = guaranteeNonNullable(columns[1]);
  expect(missing.genericType.value.rawType.path).toBe(CORE_PURE_PATH.ANY);
  expect(missing.multiplicity.lowerBound).toBe(0);
  expect(missing.multiplicity.upperBound).toBe(1);
};

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, TEST_DATA__entities);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('getLambdaResolvedRelationType'), () => {
  test('keeps type parameters, multiplicity and column metadata', async () => {
    const spy = jest
      .spyOn(getEngineServerClient(), 'lambdaRelationType')
      .mockResolvedValue(ENGINE_RELATION_TYPE);

    const { relationType, unresolvedColumns } =
      await graphManagerState.graphManager.getLambdaResolvedRelationType(
        lambda,
        graphManagerState.graph,
      );

    expect(spy).toHaveBeenCalledTimes(1);
    expectLosslessColumns(relationType.columns);
    expect(unresolvedColumns).toEqual([]);
  });

  test('types a column whose type is not in the graph as Any and reports it', async () => {
    jest
      .spyOn(getEngineServerClient(), 'lambdaRelationType')
      .mockResolvedValue(UNRESOLVABLE_RELATION_TYPE);

    const { relationType, unresolvedColumns } =
      await graphManagerState.graphManager.getLambdaResolvedRelationType(
        lambda,
        graphManagerState.graph,
      );

    expectUnresolvedColumnTypedAny(relationType.columns);
    expect(unresolvedColumns).toEqual([
      { name: 'MISSING', typePath: 'my::Missing' },
    ]);
  });

  test('a 400 from the engine becomes a CompilationError', async () => {
    jest
      .spyOn(getEngineServerClient(), 'lambdaRelationType')
      .mockRejectedValue(
        new NetworkClientError(
          { status: HttpStatus.BAD_REQUEST } as Response,
          ENGINE_COMPILATION_ERROR,
        ),
      );

    const error = await graphManagerState.graphManager
      .getLambdaResolvedRelationType(lambda, graphManagerState.graph)
      .catch((e: unknown) => e);
    const compilationError = guaranteeType(error, CompilationError);
    expect(compilationError.message).toBe(
      "The store 'test::Db' can't be found.",
    );
    expect(compilationError.sourceInformation?.startColumn).toBe(2);
  });
});

describe(unitTest('getBatchLambdasResolvedRelationType'), () => {
  test('keeps column metadata per key and reports per-key errors', async () => {
    const spy = jest
      .spyOn(getEngineServerClient(), 'batchLambdasRelationType')
      .mockResolvedValue(ENGINE_BATCH_RESPONSE);

    const { results, unresolvedColumns, errors } =
      await graphManagerState.graphManager.getBatchLambdasResolvedRelationType(
        new Map([
          ['ok', lambda],
          ['unresolvable', lambda],
          ['bad', lambda],
        ]),
        graphManagerState.graph,
      );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(Array.from(results.keys()).sort()).toEqual(['ok', 'unresolvable']);
    expectLosslessColumns(guaranteeNonNullable(results.get('ok')).columns);
    // a column whose type isn't in the graph doesn't fail its key
    expectUnresolvedColumnTypedAny(
      guaranteeNonNullable(results.get('unresolvable')).columns,
    );
    expect(Array.from(unresolvedColumns.entries())).toEqual([
      ['unresolvable', [{ name: 'MISSING', typePath: 'my::Missing' }]],
    ]);

    expect(Array.from(errors.keys())).toEqual(['bad']);
    // the engine error keeps its source information
    const engineError = guaranteeNonNullable(errors.get('bad'));
    expect(engineError.message).toBe(
      "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'",
    );
    expect(engineError.sourceInformation?.startColumn).toBe(2);
    expect(engineError.sourceInformation?.endColumn).toBe(66);
  });

  test('a 400 from the engine becomes a CompilationError', async () => {
    jest
      .spyOn(getEngineServerClient(), 'batchLambdasRelationType')
      .mockRejectedValue(
        new NetworkClientError(
          { status: HttpStatus.BAD_REQUEST } as Response,
          ENGINE_COMPILATION_ERROR,
        ),
      );

    const error = await graphManagerState.graphManager
      .getBatchLambdasResolvedRelationType(
        new Map([['ok', lambda]]),
        graphManagerState.graph,
      )
      .catch((e: unknown) => e);
    expect(guaranteeType(error, CompilationError).message).toBe(
      "The store 'test::Db' can't be found.",
    );
  });
});

describe(unitTest('AbstractPureGraphManager defaults'), () => {
  test('graph managers that do not implement the resolved relation type methods reject', async () => {
    await expect(
      AbstractPureGraphManager.prototype.getLambdaResolvedRelationType.call(
        graphManagerState.graphManager,
        lambda,
        graphManagerState.graph,
      ),
    ).rejects.toThrow(UnsupportedOperationError);
    await expect(
      AbstractPureGraphManager.prototype.getBatchLambdasResolvedRelationType.call(
        graphManagerState.graphManager,
        new Map([['ok', lambda]]),
        graphManagerState.graph,
      ),
    ).rejects.toThrow(UnsupportedOperationError);
  });
});
