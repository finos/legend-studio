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

import { test, describe, expect, jest, afterEach } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  guaranteeNonNullable,
  guaranteeType,
  LogService,
} from '@finos/legend-shared';
import {
  type V1_BatchLambdaRelationTypeResponse,
  V1_BatchLambdaRelationTypeInput,
  V1_buildBatchLambdaRelationTypeResult,
} from '../compilation/V1_LambdaReturnType.js';
import { V1_RemoteEngine } from '../V1_RemoteEngine.js';
import { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer.js';
import { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_PackageableType } from '../../model/packageableElements/type/V1_PackageableType.js';
import { V1_CInteger } from '../../model/valueSpecification/raw/V1_CInteger.js';

// Trimmed from a real `POST /pure/v1/compilation/lambdaRelationType/batch` response
// (stack traces removed): note the successful map is `result`, not `results`.
const ENGINE_BATCH_RESPONSE: V1_BatchLambdaRelationTypeResponse = {
  result: {
    ok: {
      _type: 'relationType',
      columns: [
        {
          genericType: {
            multiplicityArguments: [],
            rawType: {
              _type: 'packageableType',
              fullPath: 'meta::pure::precisePrimitives::SmallInt',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'ORDER_ID',
        },
        {
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
          name: 'CUSTOMER_ID',
        },
        {
          genericType: {
            multiplicityArguments: [],
            rawType: { _type: 'packageableType', fullPath: 'StrictDate' },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'ORDER_DATE',
        },
      ],
    },
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

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('Batch lambda relation type'), () => {
  test('V1_buildBatchLambdaRelationTypeResult reads the engine response', () => {
    const { results, errors } = V1_buildBatchLambdaRelationTypeResult(
      ENGINE_BATCH_RESPONSE,
    );

    expect(Array.from(results.keys())).toEqual(['ok']);
    const columns = guaranteeNonNullable(results.get('ok')).columns;
    expect(columns.map((column) => column.name)).toEqual([
      'ORDER_ID',
      'CUSTOMER_ID',
      'ORDER_DATE',
    ]);
    const customerId = guaranteeNonNullable(columns[1]);
    expect(
      guaranteeType(customerId.genericType.rawType, V1_PackageableType)
        .fullPath,
    ).toBe('meta::pure::precisePrimitives::Varchar');
    expect(
      guaranteeType(customerId.genericType.typeVariableValues[0], V1_CInteger)
        .value,
    ).toBe(5);
    expect(customerId.multiplicity.lowerBound).toBe(0);
    expect(customerId.multiplicity.upperBound).toBe(1);

    expect(Array.from(guaranteeNonNullable(errors).keys())).toEqual(['bad']);
    expect(guaranteeNonNullable(errors?.get('bad')).message).toBe(
      "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'",
    );
  });

  test('V1_buildBatchLambdaRelationTypeResult handles empty maps', () => {
    const { results, errors } = V1_buildBatchLambdaRelationTypeResult({
      result: {},
      errors: {},
    });

    expect(results.size).toBe(0);
    expect(errors?.size).toBe(0);
  });

  test('V1_RemoteEngine maps batch results to relation type metadata and engine errors', async () => {
    const engine = new V1_RemoteEngine(
      { baseUrl: 'http://engine.test/api' },
      new LogService(),
    );
    const batchSpy = jest
      .spyOn(engine.getEngineServerClient(), 'batchLambdasRelationType')
      .mockResolvedValue(ENGINE_BATCH_RESPONSE);

    const { results, errors } =
      await engine.getBatchLambdasRelationTypeFromRawInput(
        new V1_BatchLambdaRelationTypeInput(
          new V1_PureModelContextPointer(undefined),
          {
            ok: new V1_RawLambda(),
            bad: new V1_RawLambda(),
          },
        ),
      );

    expect(batchSpy).toHaveBeenCalledTimes(1);
    const columns = guaranteeNonNullable(results.get('ok')).columns;
    expect(
      columns.map((column) => [
        column.name,
        column.type,
        column.multiplicity.lowerBound,
        column.multiplicity.upperBound,
      ]),
    ).toEqual([
      ['ORDER_ID', 'meta::pure::precisePrimitives::SmallInt', 1, 1],
      ['CUSTOMER_ID', 'meta::pure::precisePrimitives::Varchar', 0, 1],
      ['ORDER_DATE', 'StrictDate', 0, 1],
    ]);

    const error = guaranteeNonNullable(errors.get('bad'));
    expect(error.message).toBe(
      "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'",
    );
    expect(error.sourceInformation?.startColumn).toBe(2);
    expect(error.sourceInformation?.endColumn).toBe(66);
  });
});
