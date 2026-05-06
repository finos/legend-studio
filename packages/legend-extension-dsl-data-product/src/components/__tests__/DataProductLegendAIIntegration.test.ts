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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { extractTDSServicesFromDataProduct } from '../DataProduct/DataProductLegendAIIntegration.js';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  V1_ServiceExecutableInfo,
  V1_MultiExecutionServiceExecutableInfo,
  V1_ExecutableTDSResult,
  V1_ExecutableTDSResultColumn,
  V1_ExecutableTDSResultInfo,
  V1_SampleQuery,
  RawLambda,
  VariableExpression,
  Multiplicity,
} from '@finos/legend-graph';

function makeTDSColumn(
  name: string,
  opts?: { type?: string; doc?: string },
): V1_ExecutableTDSResultColumn {
  const col = new V1_ExecutableTDSResultColumn();
  col.name = name;
  if (opts?.type !== undefined) {
    col.type = opts.type;
  }
  if (opts?.doc !== undefined) {
    col.doc = opts.doc;
  }
  return col;
}

function makeSampleQuery(
  title: string,
  pattern: string,
  columns: V1_ExecutableTDSResultColumn[],
  opts?: { description?: string; executable?: string },
): V1_SampleQuery {
  const info = new V1_ServiceExecutableInfo();
  info.query = opts?.executable ?? '|MyClass.all()';
  info.pattern = pattern;

  const tdsResultInfo = new V1_ExecutableTDSResultInfo();
  tdsResultInfo.tdsColumns = columns;

  const tdsResult = new V1_ExecutableTDSResult();
  tdsResult.tdsResult = tdsResultInfo;

  const sq = new V1_SampleQuery();
  sq.title = title;
  sq.info = info;
  sq.result = tdsResult;
  if (opts?.description !== undefined) {
    sq.description = opts.description;
  }
  if (opts?.executable !== undefined) {
    sq.executable = opts.executable;
  }
  return sq;
}

function makeViewerStateStub(
  sampleQueries: V1_SampleQuery[],
  lambdaMocks?: Map<string, RawLambda>,
): DataProductViewerState {
  return {
    getSampleQueries: () => sampleQueries,
    graphManagerState: {
      graphManager: {
        pureCodeToLambda: async (code: string) =>
          lambdaMocks?.get(code) ?? new RawLambda(undefined, undefined),
        buildValueSpecification: (param: { name?: string }) =>
          new VariableExpression(param.name ?? '', new Multiplicity(1, 1)),
      },
      graph: {},
    },
    product: { path: 'test::DataProduct' },
    apgStates: [],
  } as unknown as DataProductViewerState;
}
describe(unitTest('extractTDSServicesFromDataProduct'), () => {
  test('returns empty array for no sample queries', async () => {
    const viewerState = makeViewerStateStub([]);
    expect(await extractTDSServicesFromDataProduct(viewerState)).toEqual([]);
  });

  test('extracts service with columns', async () => {
    const sq = makeSampleQuery('TradeService', '/trades', [
      makeTDSColumn('tradeId', { type: 'String' }),
      makeTDSColumn('amount', { type: 'Number' }),
    ]);
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('TradeService');
    expect(result[0]?.pattern).toBe('/trades');
    expect(result[0]?.columns).toHaveLength(2);
    expect(result[0]?.columns[0]?.name).toBe('tradeId');
    expect(result[0]?.columns[0]?.type).toBe('String');
  });

  test('includes description when present', async () => {
    const sq = makeSampleQuery('Svc', '/svc', [makeTDSColumn('id')], {
      description: 'A service',
    });
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result[0]?.description).toBe('A service');
  });

  test('omits description when absent', async () => {
    const sq = makeSampleQuery('Svc', '/svc', [makeTDSColumn('id')]);
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result[0]).not.toHaveProperty('description');
  });

  test('includes column documentation from doc field', async () => {
    const sq = makeSampleQuery('Svc', '/svc', [
      makeTDSColumn('col', { doc: 'A column doc' }),
    ]);
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result[0]?.columns[0]?.documentation).toBe('A column doc');
  });

  test('extracts parameters from executable lambda', async () => {
    const queryCode = '{orderId: String[1]| $orderId}';
    const lambdaMocks = new Map([
      [queryCode, new RawLambda([{ name: 'orderId' }], undefined)],
    ]);
    const sq = makeSampleQuery('Svc', '/svc', [makeTDSColumn('id')], {
      executable: queryCode,
    });
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq], lambdaMocks),
    );
    expect(result[0]?.parameters).toEqual(['orderId']);
  });

  test('filters out non-TDS results', async () => {
    const tdsSq = makeSampleQuery('TDS', '/tds', [makeTDSColumn('x')]);
    // Create a sample query with a non-TDS result
    const nonTdsSq = new V1_SampleQuery();
    nonTdsSq.title = 'NonTDS';
    const info = new V1_ServiceExecutableInfo();
    info.query = '|';
    info.pattern = '/nontds';
    nonTdsSq.info = info;
    nonTdsSq.result = {} as V1_ExecutableTDSResult; // not instanceof

    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([tdsSq, nonTdsSq]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('TDS');
  });

  test('filters out executables without service info', async () => {
    const sq = new V1_SampleQuery();
    sq.title = 'NoInfo';
    const tdsResultInfo = new V1_ExecutableTDSResultInfo();
    const tdsResult = new V1_ExecutableTDSResult();
    tdsResult.tdsResult = tdsResultInfo;
    sq.result = tdsResult;
    sq.info = {} as V1_ServiceExecutableInfo; // not instanceof

    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result).toEqual([]);
  });

  test('handles multi-execution service info', async () => {
    const info = new V1_MultiExecutionServiceExecutableInfo();
    info.query = '|All.all()';
    info.pattern = '/multi';

    const tdsResultInfo = new V1_ExecutableTDSResultInfo();
    tdsResultInfo.tdsColumns = [makeTDSColumn('id', { type: 'String' })];
    const tdsResult = new V1_ExecutableTDSResult();
    tdsResult.tdsResult = tdsResultInfo;

    const sq = new V1_SampleQuery();
    sq.title = 'MultiService';
    sq.info = info;
    sq.result = tdsResult;

    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('MultiService');
  });

  test('handles multiple sample queries', async () => {
    const sq1 = makeSampleQuery('Svc1', '/svc1', [makeTDSColumn('a')]);
    const sq2 = makeSampleQuery('Svc2', '/svc2', [makeTDSColumn('b')]);
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq1, sq2]),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('Svc1');
    expect(result[1]?.title).toBe('Svc2');
  });
});
