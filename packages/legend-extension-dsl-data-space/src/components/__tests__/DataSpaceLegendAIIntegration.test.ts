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
import {
  extractTDSServicesFromDataSpace,
  extractExecutableInfo,
} from '../../components/DataSpaceLegendAIIntegration.js';
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
import type {
  LegendAIModelContext,
  TDSServiceSchema,
} from '@finos/legend-lego/legend-ai';

function makeViewerStateStub(
  executables: DataSpaceExecutableAnalysisResult[],
  lambdaMocks?: Map<string, RawLambda>,
): DataSpaceViewerState {
  return {
    dataSpaceAnalysisResult: { executables, elementDocs: [] },
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

describe(unitTest('extractExecutableInfo'), () => {
  test('extracts root entity from service query', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'test';
    info.executionContextKey = 'ctx';
    info.query =
      'BKEmbs::domain::OrigFhlloan.all()->filter(x|$x.cusip == "ABC")';
    info.pattern = '/loans';

    const tdsResult = new DataSpaceExecutableTDSResult();
    const col = new DataSpaceExecutableTDSResultColumn();
    col.name = 'cusip';
    col.type = 'String';
    tdsResult.columns = [col];

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'FHL Loans Service';
    exec.description = 'Fetch FHL loan data';
    exec.info = info;
    exec.result = tdsResult;

    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'BKEmbs::domain::OrigFhlloan',
          name: 'OrigFhlloan',
          properties: [
            {
              name: 'cusip',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
        {
          path: 'BKEmbs::domain::OrigAggr',
          name: 'OrigAggr',
          properties: [],
        },
      ],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result).toHaveLength(1);
    const firstResult = result[0];
    expect(firstResult?.rootEntityPath).toBe('BKEmbs::domain::OrigFhlloan');
    expect(firstResult?.title).toBe('FHL Loans Service');
    expect(firstResult?.description).toBe('Fetch FHL loan data');
    expect(firstResult?.columns).toEqual(['cusip']);

    // Query template should be stored
    expect(firstResult?.queryTemplate).toBe(
      'BKEmbs::domain::OrigFhlloan.all()->filter(x|$x.cusip == "ABC")',
    );

    // Column-property mapping: 'cusip' column matches 'cusip' property — same name, no mapping needed
    expect(firstResult?.columnPropertyMappings).toBeUndefined();

    // Entity should be marked as queryable
    const fhlEntity = ctx.entities.find(
      (e) => e.path === 'BKEmbs::domain::OrigFhlloan',
    );
    expect(fhlEntity?.isQueryable).toBe(true);

    // Non-executable entity should NOT be queryable
    const aggrEntity = ctx.entities.find(
      (e) => e.path === 'BKEmbs::domain::OrigAggr',
    );
    expect(aggrEntity?.isQueryable).toBeUndefined();
  });

  test('skips executables without .all() in query', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'test';
    info.executionContextKey = 'ctx';
    info.query = 'some::function()';
    info.pattern = '/fn';

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Function Service';
    exec.info = info;
    exec.result = new DataSpaceExecutableTDSResult();

    const ctx: LegendAIModelContext = {
      entities: [],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result).toHaveLength(0);
  });

  test('handles multiple executables targeting different entities', () => {
    const makeExec = (
      title: string,
      entityPath: string,
    ): DataSpaceExecutableAnalysisResult => {
      const info = new DataSpaceServiceExecutableInfo();
      info.id = title;
      info.executionContextKey = 'ctx';
      info.query = `${entityPath}.all()->project([])`;
      info.pattern = `/${title}`;
      const exec = new DataSpaceExecutableAnalysisResult();
      exec.title = title;
      exec.info = info;
      exec.result = new DataSpaceExecutableTDSResult();
      return exec;
    };

    const ctx: LegendAIModelContext = {
      entities: [
        { path: 'a::Loan', name: 'Loan', properties: [] },
        { path: 'a::Security', name: 'Security', properties: [] },
        { path: 'a::RefTable', name: 'RefTable', properties: [] },
      ],
      associations: [],
    };

    const execs = [
      makeExec('LoanSvc', 'a::Loan'),
      makeExec('SecSvc', 'a::Security'),
    ];

    const result = extractExecutableInfo(execs, ctx, []);
    expect(result).toHaveLength(2);

    // Both should be queryable
    expect(ctx.entities[0]?.isQueryable).toBe(true);
    expect(ctx.entities[1]?.isQueryable).toBe(true);
    // RefTable should not
    expect(ctx.entities[2]?.isQueryable).toBeUndefined();
  });

  test('captures every entity referenced in a join and marks them queryable', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'joinSvc';
    info.executionContextKey = 'ctx';
    // Join across two roots: Loan is the lambda subject, Security is joined in.
    info.query =
      'model::Loan.all()->join(model::Security.all(), JoinKind.INNER, {l,s|$l.secId == $s.id})->project([])';
    info.pattern = '/join';

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Loan-Security Join';
    exec.info = info;
    exec.result = new DataSpaceExecutableTDSResult();

    const ctx: LegendAIModelContext = {
      entities: [
        { path: 'model::Loan', name: 'Loan', properties: [] },
        { path: 'model::Security', name: 'Security', properties: [] },
        { path: 'model::RefTable', name: 'RefTable', properties: [] },
      ],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result).toHaveLength(1);
    const joinResult = result[0];

    // Root is still the leftmost subject of the lambda.
    expect(joinResult?.rootEntityPath).toBe('model::Loan');
    // Both entities touched by `.all()` are tracked in source order.
    expect(joinResult?.referencedEntityPaths).toEqual([
      'model::Loan',
      'model::Security',
    ]);

    // Both joined entities are marked queryable; unrelated ones are not.
    expect(ctx.entities[0]?.isQueryable).toBe(true);
    expect(ctx.entities[1]?.isQueryable).toBe(true);
    expect(ctx.entities[2]?.isQueryable).toBeUndefined();
  });

  test('omits referencedEntityPaths for single-root queries', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'soloSvc';
    info.executionContextKey = 'ctx';
    info.query = 'model::Loan.all()->project([])';
    info.pattern = '/solo';

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Solo';
    exec.info = info;
    exec.result = new DataSpaceExecutableTDSResult();

    const ctx: LegendAIModelContext = {
      entities: [{ path: 'model::Loan', name: 'Loan', properties: [] }],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result[0]?.referencedEntityPaths).toBeUndefined();
  });

  test('passes through lambda-derived parameter schemas as requiredParameters', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'test';
    info.executionContextKey = 'ctx';
    info.query =
      '{processingDate: Date[1], businessDate: Date[1], fundIsins: String[*]|model::Holdings.all()->filter(x|$x.fundIsin->in($fundIsins))->project([])}';
    info.pattern = '/holdings';

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Holdings Service';
    exec.info = info;
    exec.result = new DataSpaceExecutableTDSResult();

    const ctx: LegendAIModelContext = {
      entities: [{ path: 'model::Holdings', name: 'Holdings', properties: [] }],
      associations: [],
    };

    // Simulate the lambda-derived parameter schemas that
    // extractTDSServicesFromDataSpace would attach via extractParameterSchemas.
    const services: TDSServiceSchema[] = [
      {
        title: 'Holdings Service',
        pattern: '/holdings',
        columns: [],
        parameters: ['processingDate', 'businessDate', 'fundIsins'],
        parameterSchemas: [
          { name: 'processingDate', type: 'Date', required: true },
          { name: 'businessDate', type: 'Date', required: true },
          { name: 'fundIsins', type: 'String' },
        ],
      },
    ];

    const result = extractExecutableInfo([exec], ctx, services);
    expect(result).toHaveLength(1);
    const holdingsResult = result[0];
    expect(holdingsResult?.requiredParameters).toEqual([
      { name: 'processingDate', type: 'Date' },
      { name: 'businessDate', type: 'Date' },
      { name: 'fundIsins', type: 'String' },
    ]);
  });

  test('builds column-property mappings when names differ', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'test';
    info.executionContextKey = 'ctx';
    info.query = 'model::Holdings.all()->project([])';
    info.pattern = '/holdings';

    const tdsResult = new DataSpaceExecutableTDSResult();
    const col1 = new DataSpaceExecutableTDSResultColumn();
    col1.name = 'LONG COMP NAME';
    col1.type = 'String';
    const col2 = new DataSpaceExecutableTDSResultColumn();
    col2.name = 'POSITION HOLDING POSITION';
    col2.type = 'Float';
    const col3 = new DataSpaceExecutableTDSResultColumn();
    col3.name = 'exactMatch';
    col3.type = 'String';
    tdsResult.columns = [col1, col2, col3];

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Holdings Service';
    exec.info = info;
    exec.result = tdsResult;

    const ctx: LegendAIModelContext = {
      entities: [
        {
          path: 'model::Holdings',
          name: 'Holdings',
          properties: [
            {
              name: 'longCompName',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'positionHoldingPosition',
              type: 'Float',
              isCollection: false,
              isOptional: false,
            },
            {
              name: 'exactMatch',
              type: 'String',
              isCollection: false,
              isOptional: false,
            },
          ],
        },
      ],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result).toHaveLength(1);
    const mappingResult = result[0];
    expect(mappingResult?.columnPropertyMappings).toBeDefined();

    // 'LONG COMP NAME' → 'longCompName'
    expect(mappingResult?.columnPropertyMappings).toEqual(
      expect.arrayContaining([
        { columnName: 'LONG COMP NAME', propertyPath: 'longCompName' },
        {
          columnName: 'POSITION HOLDING POSITION',
          propertyPath: 'positionHoldingPosition',
        },
      ]),
    );

    // 'exactMatch' matches 'exactMatch' — same name, should NOT be in mappings
    const exactMapping = mappingResult?.columnPropertyMappings?.find(
      (m) => m.propertyPath === 'exactMatch',
    );
    expect(exactMapping).toBeUndefined();
  });

  test('stores query template truncated for very long queries', () => {
    const info = new DataSpaceServiceExecutableInfo();
    info.id = 'test';
    info.executionContextKey = 'ctx';
    // Create a query > 1000 chars
    const longFilter = Array(100).fill("$x.prop == 'value'").join(' && ');
    info.query = `model::Entity.all()->filter({x|${longFilter}})`;
    info.pattern = '/entity';

    const exec = new DataSpaceExecutableAnalysisResult();
    exec.title = 'Long Query Service';
    exec.info = info;
    exec.result = new DataSpaceExecutableTDSResult();

    const ctx: LegendAIModelContext = {
      entities: [{ path: 'model::Entity', name: 'Entity', properties: [] }],
      associations: [],
    };

    const result = extractExecutableInfo([exec], ctx, []);
    expect(result).toHaveLength(1);
    const longResult = result[0];
    expect(longResult?.queryTemplate).toBeDefined();
    expect(longResult?.queryTemplate?.length).toBeLessThanOrEqual(1003); // 1000 + '...'
    expect(longResult?.queryTemplate?.endsWith('...')).toBe(true);
  });
});
