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
import { extractTDSServicesFromDataSpace } from '../../components/DataSpaceLegendAIIntegration.js';
import type { DataSpaceViewerState } from '../../stores/DataSpaceViewerState.js';
import {
  DataSpaceServiceExecutableInfo,
  DataSpaceMultiExecutionServiceExecutableInfo,
  DataSpaceExecutableTDSResult,
  DataSpaceExecutableTDSResultColumn,
  DataSpaceExecutableAnalysisResult,
} from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  RawLambda,
  VariableExpression,
  Multiplicity,
} from '@finos/legend-graph';

function makeViewerStateStub(
  executables: DataSpaceExecutableAnalysisResult[],
  lambdaMocks?: Map<string, RawLambda>,
): DataSpaceViewerState {
  return {
    dataSpaceAnalysisResult: { executables },
    graphManagerState: {
      graphManager: {
        pureCodeToLambda: async (code: string) =>
          lambdaMocks?.get(code) ?? new RawLambda(undefined, undefined),
        buildValueSpecification: (param: { name?: string }) =>
          new VariableExpression(param.name ?? '', new Multiplicity(1, 1)),
      },
      graph: {},
    },
  } as unknown as DataSpaceViewerState;
}

function makeTDSColumn(
  name: string,
  opts?: {
    type?: string;
    documentation?: string;
    sampleValues?: string;
  },
): DataSpaceExecutableTDSResultColumn {
  const col = new DataSpaceExecutableTDSResultColumn();
  col.name = name;
  if (opts?.type !== undefined) {
    col.type = opts.type;
  }
  if (opts?.documentation !== undefined) {
    col.documentation = opts.documentation;
  }
  if (opts?.sampleValues !== undefined) {
    col.sampleValues = opts.sampleValues;
  }
  return col;
}

function makeServiceExecutable(
  title: string,
  pattern: string,
  columns: DataSpaceExecutableTDSResultColumn[],
  opts?: { description?: string; query?: string },
): DataSpaceExecutableAnalysisResult {
  const info = new DataSpaceServiceExecutableInfo();
  info.id = title;
  info.executionContextKey = 'default';
  info.query = opts?.query ?? '|MyClass.all()';
  info.pattern = pattern;

  const tdsResult = new DataSpaceExecutableTDSResult();
  tdsResult.columns = columns;

  const exec = new DataSpaceExecutableAnalysisResult();
  exec.title = title;
  exec.info = info;
  exec.result = tdsResult;
  if (opts?.description !== undefined) {
    exec.description = opts.description;
  }
  return exec;
}
describe(unitTest('extractTDSServicesFromDataSpace'), () => {
  test('returns empty array for no executables', async () => {
    const viewerState = makeViewerStateStub([]);
    expect(await extractTDSServicesFromDataSpace(viewerState)).toEqual([]);
  });

  test('extracts service with columns', async () => {
    const exec = makeServiceExecutable('TradeService', '/api/trades', [
      makeTDSColumn('tradeId', { type: 'String' }),
      makeTDSColumn('amount', { type: 'Number' }),
    ]);
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('TradeService');
    expect(result[0]?.pattern).toBe('/api/trades');
    expect(result[0]?.columns).toHaveLength(2);
    expect(result[0]?.columns[0]?.name).toBe('tradeId');
    expect(result[0]?.columns[0]?.type).toBe('String');
    expect(result[0]?.columns[1]?.name).toBe('amount');
  });

  test('includes description when present', async () => {
    const exec = makeServiceExecutable('Svc', '/svc', [makeTDSColumn('id')], {
      description: 'A service',
    });
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result[0]?.description).toBe('A service');
  });

  test('omits description when absent', async () => {
    const exec = makeServiceExecutable('Svc', '/svc', [makeTDSColumn('id')]);
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result[0]).not.toHaveProperty('description');
  });

  test('includes column documentation when present', async () => {
    const exec = makeServiceExecutable('Svc', '/svc', [
      makeTDSColumn('col', { documentation: 'Column doc' }),
    ]);
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result[0]?.columns[0]?.documentation).toBe('Column doc');
  });

  test('includes column sampleValues when present', async () => {
    const exec = makeServiceExecutable('Svc', '/svc', [
      makeTDSColumn('col', { sampleValues: 'a, b, c' }),
    ]);
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result[0]?.columns[0]?.sampleValues).toBe('a, b, c');
  });

  test('extracts parameters from query lambda', async () => {
    const queryCode = '{orderId: String[1]| $orderId}';
    const lambdaMocks = new Map([
      [queryCode, new RawLambda([{ name: 'orderId' }], undefined)],
    ]);
    const exec = makeServiceExecutable('Svc', '/svc', [makeTDSColumn('id')], {
      query: queryCode,
    });
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec], lambdaMocks),
    );
    expect(result[0]?.parameters).toEqual(['orderId']);
  });

  test('filters out non-TDS results', async () => {
    const tdsExec = makeServiceExecutable('TDS', '/tds', [makeTDSColumn('x')]);
    // Create an executable with a non-TDS result
    const nonTdsExec = new DataSpaceExecutableAnalysisResult();
    nonTdsExec.title = 'NonTDS';
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'nontds';
    info.executionContextKey = 'default';
    info.query = '|';
    info.pattern = '/nontds';
    nonTdsExec.info = info;
    nonTdsExec.result = {} as DataSpaceExecutableTDSResult; // not instanceof

    const viewerState = makeViewerStateStub([tdsExec, nonTdsExec]);
    const result = await extractTDSServicesFromDataSpace(viewerState);
    // Only the TDS executable passes the instanceof filter
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('TDS');
  });

  test('filters out executables without service info', async () => {
    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'NoInfo';
    exec.result = new DataSpaceExecutableTDSResult();
    // info is undefined → filtered out

    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result).toEqual([]);
  });

  test('handles multi-execution service info', async () => {
    const info = new DataSpaceMultiExecutionServiceExecutableInfo();
    info.id = 'multi';
    info.executionContextKey = 'default';
    info.query = '|All.all()';
    info.pattern = '/multi';

    const tdsResult = new DataSpaceExecutableTDSResult();
    tdsResult.columns = [makeTDSColumn('id', { type: 'String' })];

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'MultiService';
    exec.info = info;
    exec.result = tdsResult;

    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('MultiService');
  });

  test('handles multiple executables', async () => {
    const exec1 = makeServiceExecutable('Svc1', '/svc1', [makeTDSColumn('a')]);
    const exec2 = makeServiceExecutable('Svc2', '/svc2', [makeTDSColumn('b')]);
    const result = await extractTDSServicesFromDataSpace(
      makeViewerStateStub([exec1, exec2]),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('Svc1');
    expect(result[1]?.title).toBe('Svc2');
  });
});
