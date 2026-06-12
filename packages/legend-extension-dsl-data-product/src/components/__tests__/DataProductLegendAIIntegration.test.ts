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
  extractTDSServicesFromDataProduct,
  inferAccessPointRelationships,
} from '../DataProduct/DataProductLegendAIIntegration.js';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  V1_ServiceExecutableInfo,
  V1_MultiExecutionServiceExecutableInfo,
  V1_ExecutableTDSResult,
  V1_ExecutableTDSResultColumn,
  V1_ExecutableTDSResultInfo,
  V1_SampleQuery,
  V1_RelationType,
  V1_RelationTypeColumn,
  V1_GenericType,
  V1_PackageableType,
  V1_Multiplicity,
  V1_DatabaseDDL,
  V1_LakehouseAccessPoint,
  RawLambda,
  VariableExpression,
  Multiplicity,
} from '@finos/legend-graph';
import { TDSServiceSourceType } from '@finos/legend-lego/legend-ai';

function makeTDSColumn(
  name: string,
  opts?: { type?: string; doc?: string; relationalType?: string },
): V1_ExecutableTDSResultColumn {
  const col = new V1_ExecutableTDSResultColumn();
  col.name = name;
  if (opts?.type !== undefined) {
    col.type = opts.type;
  }
  if (opts?.doc !== undefined) {
    col.doc = opts.doc;
  }
  if (opts?.relationalType !== undefined) {
    col.relationalType = opts.relationalType;
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
  apgStates?: unknown[],
  opts?: {
    dataProductArtifact?: unknown;
    dataProductArtifactPromise?: Promise<unknown>;
    productOverrides?: Record<string, unknown>;
  },
): DataProductViewerState {
  const artifact = opts?.dataProductArtifact;
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
    product: {
      path: 'test::DataProduct',
      accessPointGroups: [],
      ...opts?.productOverrides,
    },
    apgStates: apgStates ?? [],
    dataProductArtifact: artifact,
    dataProductArtifactPromise:
      opts?.dataProductArtifactPromise ??
      (artifact !== undefined ? Promise.resolve(artifact) : undefined),
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

function makeRelationTypeColumn(
  name: string,
  typePath: string,
  opts?: { nullable?: boolean },
): V1_RelationTypeColumn {
  const col = new V1_RelationTypeColumn();
  col.name = name;
  const gt = new V1_GenericType();
  const pt = new V1_PackageableType();
  pt.fullPath = typePath;
  gt.rawType = pt;
  col.genericType = gt;
  col.multiplicity = new V1_Multiplicity(opts?.nullable ? 0 : 1, 1);
  return col;
}

function makeAccessPointState(
  id: string,
  columns: V1_RelationTypeColumn[],
  opts?: {
    title?: string;
    description?: string;
    classification?: string;
    relationElement?: { columns: string[]; rows: { values: string[] }[] };
  },
): unknown {
  const relationType = new V1_RelationType();
  relationType.columns = columns;
  const ap =
    opts?.classification !== undefined
      ? Object.assign(new V1_LakehouseAccessPoint(), {
          id,
          title: opts.title,
          description: opts.description,
          classification: opts.classification,
        })
      : { id, title: opts?.title, description: opts?.description };
  return {
    accessPoint: ap,
    relationType,
    relationElement: opts?.relationElement,
  };
}

function makeApgState(
  groupId: string,
  accessPointStates: unknown[],
  opts?: { title?: string },
): unknown {
  return {
    apg: { id: groupId, title: opts?.title },
    accessPointStates,
  };
}

describe(unitTest('extractTDSServicesFromDataProduct — access points'), () => {
  test('extracts access points with columns and sourceType', async () => {
    const apState = makeAccessPointState(
      'positions',
      [
        makeRelationTypeColumn('positionId', 'String'),
        makeRelationTypeColumn('value', 'Number'),
      ],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Positions');
    expect(result[0]?.pattern).toBe('/positions');
    expect(result[0]?.sourceType).toBe(TDSServiceSourceType.ACCESS_POINT);
    expect(result[0]?.dataProductPath).toBe('test::DataProduct');
    expect(result[0]?.columns).toHaveLength(2);
    expect(result[0]?.columns[0]?.name).toBe('positionId');
    expect(result[0]?.columns[0]?.type).toBe('String');
  });

  test('filters out metadata access points', async () => {
    const regularAp = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      { title: 'Positions' },
    );
    const metadataAp = makeAccessPointState(
      'positions_AP_LH_MIGRATION_METADATA',
      [makeRelationTypeColumn('key', 'String')],
      { title: 'Metadata' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [
        makeApgState('group1', [regularAp, metadataAp]),
      ]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Positions');
  });

  test('skips access points without relationType columns', async () => {
    const emptyAp = {
      accessPoint: { id: 'empty', title: 'Empty' },
      relationType: new V1_RelationType(),
      relationElement: undefined,
    };
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [emptyAp])]),
    );
    expect(result).toEqual([]);
  });

  test('filters out lakehouse system columns like __lake_action', async () => {
    const apState = makeAccessPointState(
      'positions',
      [
        makeRelationTypeColumn('id', 'String'),
        makeRelationTypeColumn('__lake_action', 'Varchar'),
        makeRelationTypeColumn('value', 'Number'),
      ],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.columns).toHaveLength(2);
    expect(result[0]?.columns.map((c) => c.name)).toEqual(['id', 'value']);
  });

  test('includes description when present on access point', async () => {
    const apState = makeAccessPointState(
      'trades',
      [makeRelationTypeColumn('tradeId', 'String')],
      { title: 'Trades', description: 'All trade data' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.description).toBe('All trade data');
  });

  test('omits description when absent on access point', async () => {
    const apState = makeAccessPointState(
      'trades',
      [makeRelationTypeColumn('tradeId', 'String')],
      { title: 'Trades' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]).not.toHaveProperty('description');
  });

  test('enriches columns with sample data from relationElement', async () => {
    const apState = makeAccessPointState(
      'accounts',
      [makeRelationTypeColumn('accountId', 'String')],
      {
        title: 'Accounts',
        relationElement: {
          columns: ['accountId'],
          rows: [
            { values: ['ACC-001'] },
            { values: ['ACC-002'] },
            { values: ['ACC-003'] },
          ],
        },
      },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.columns[0]?.sampleValues).toBe(
      'ACC-001, ACC-002, ACC-003',
    );
  });

  test('uses id as title when title is undefined', async () => {
    const apState = makeAccessPointState('positions', [
      makeRelationTypeColumn('id', 'String'),
    ]);
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.title).toBe('positions');
  });

  test('extracts access points alongside services', async () => {
    const sq = makeSampleQuery('TradeService', '/trades', [
      makeTDSColumn('tradeId', { type: 'String' }),
    ]);
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('positionId', 'String')],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('TradeService');
    expect(result[0]?.sourceType).toBeUndefined();
    expect(result[1]?.title).toBe('Positions');
    expect(result[1]?.sourceType).toBe(TDSServiceSourceType.ACCESS_POINT);
  });

  test('includes accessPointGroupTitle on extracted APs', async () => {
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [
        makeApgState('apg1', [apState], { title: 'Trading Group' }),
      ]),
    );
    expect(result[0]?.accessPointGroupTitle).toBe('Trading Group');
  });

  test('falls back to group id when group title is undefined', async () => {
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [
        makeApgState('defaultGroup', [apState]),
      ]),
    );
    expect(result[0]?.accessPointGroupTitle).toBe('defaultGroup');
  });

  test('extracts nullable from column multiplicity', async () => {
    const apState = makeAccessPointState(
      'positions',
      [
        makeRelationTypeColumn('id', 'String'),
        makeRelationTypeColumn('optionalField', 'String', { nullable: true }),
      ],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.columns[0]?.nullable).toBeUndefined();
    expect(result[0]?.columns[1]?.nullable).toBe(true);
  });

  test('extracts DDL script from artifact resourceBuilder', async () => {
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      { title: 'Positions' },
    );
    const ddl = new V1_DatabaseDDL();
    ddl.script = 'CREATE VIEW positions AS SELECT id FROM raw_positions';
    const artifact = {
      accessPointGroups: [
        {
          id: 'group1',
          accessPointImplementations: [
            { id: 'positions', resourceBuilder: ddl },
          ],
        },
      ],
    };
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])], {
        dataProductArtifact: artifact,
      }),
    );
    expect(result[0]?.ddlScript).toBe(
      'CREATE VIEW positions AS SELECT id FROM raw_positions',
    );
  });

  test('appends classification to description for LakehouseAccessPoint', async () => {
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      {
        title: 'Positions',
        description: 'Position data',
        classification: 'PII',
      },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.description).toBe('Position data [Classification: PII]');
  });

  test('sets classification-only description when no description exists', async () => {
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('id', 'String')],
      { title: 'Positions', classification: 'RESTRICTED' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])]),
    );
    expect(result[0]?.description).toBe('[Classification: RESTRICTED]');
  });

  test('enriches columns with relationalType from sample queries', async () => {
    const sq = makeSampleQuery('Svc', '/svc', [
      makeTDSColumn('amount', {
        type: 'Number',
        relationalType: 'DECIMAL(18,4)',
      }),
    ]);
    const apState = makeAccessPointState(
      'positions',
      [makeRelationTypeColumn('amount', 'Number')],
      { title: 'Positions' },
    );
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([sq], undefined, [makeApgState('group1', [apState])]),
    );
    const apService = result.find((s) => s.title === 'Positions');
    expect(apService?.columns[0]?.relationalType).toBe('DECIMAL(18,4)');
  });

  test('falls back to artifact relationType when state relationType is undefined', async () => {
    // Simulate an AP whose schema has not been lazily loaded yet —
    // the extraction function reads from the artifact directly.
    const ap = { id: 'positions', title: 'Positions', description: undefined };
    const apState = {
      accessPoint: ap,
      relationType: undefined,
      relationElement: undefined,
    };
    const rt = new V1_RelationType();
    rt.columns = [makeRelationTypeColumn('id', 'String')];
    const typeArg = new V1_GenericType();
    typeArg.rawType = rt;
    const lambdaGenericType = new V1_GenericType();
    lambdaGenericType.typeArguments = [typeArg];
    const artifact = {
      accessPointGroups: [
        {
          id: 'group1',
          accessPointImplementations: [{ id: 'positions', lambdaGenericType }],
        },
      ],
    };
    const result = await extractTDSServicesFromDataProduct(
      makeViewerStateStub([], undefined, [makeApgState('group1', [apState])], {
        dataProductArtifact: artifact,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Positions');
    expect(result[0]?.columns).toHaveLength(1);
    expect(result[0]?.columns[0]?.name).toBe('id');
    expect(result[0]?.sourceType).toBe(TDSServiceSourceType.ACCESS_POINT);
  });
});

describe(unitTest('inferAccessPointRelationships'), () => {
  test('returns empty for fewer than two access points', () => {
    const services = [
      {
        title: 'Positions',
        pattern: '/positions',
        columns: [{ name: 'id' }, { name: 'value' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    expect(inferAccessPointRelationships(services)).toEqual([]);
  });

  test('detects shared columns between two access points', () => {
    const services = [
      {
        title: 'Positions',
        pattern: '/positions',
        columns: [{ name: 'accountId' }, { name: 'value' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'Accounts',
        pattern: '/accounts',
        columns: [{ name: 'accountId' }, { name: 'name' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = inferAccessPointRelationships(services);
    expect(result).toHaveLength(1);
    expect(result[0]?.leftAccessPoint).toBe('Positions');
    expect(result[0]?.rightAccessPoint).toBe('Accounts');
    expect(result[0]?.sharedColumns).toEqual(['accountId']);
  });

  test('detects multiple shared columns', () => {
    const services = [
      {
        title: 'Trades',
        pattern: '/trades',
        columns: [
          { name: 'tradeId' },
          { name: 'accountId' },
          { name: 'securityId' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'Settlements',
        pattern: '/settlements',
        columns: [
          { name: 'settlementId' },
          { name: 'tradeId' },
          { name: 'accountId' },
        ],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = inferAccessPointRelationships(services);
    expect(result).toHaveLength(1);
    expect(result[0]?.sharedColumns).toEqual(['tradeId', 'accountId']);
  });

  test('ignores non-access-point services', () => {
    const services = [
      {
        title: 'TradeService',
        pattern: '/trades',
        columns: [{ name: 'tradeId' }],
        parameters: [],
      },
      {
        title: 'Positions',
        pattern: '/positions',
        columns: [{ name: 'tradeId' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    expect(inferAccessPointRelationships(services)).toEqual([]);
  });

  test('returns empty when no shared columns exist', () => {
    const services = [
      {
        title: 'Positions',
        pattern: '/positions',
        columns: [{ name: 'positionId' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'Accounts',
        pattern: '/accounts',
        columns: [{ name: 'accountId' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    expect(inferAccessPointRelationships(services)).toEqual([]);
  });

  test('detects relationships across three access points', () => {
    const services = [
      {
        title: 'Trades',
        pattern: '/trades',
        columns: [{ name: 'tradeId' }, { name: 'accountId' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'Accounts',
        pattern: '/accounts',
        columns: [{ name: 'accountId' }, { name: 'name' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
      {
        title: 'Settlements',
        pattern: '/settlements',
        columns: [{ name: 'tradeId' }, { name: 'amount' }],
        parameters: [],
        sourceType: TDSServiceSourceType.ACCESS_POINT,
      },
    ];
    const result = inferAccessPointRelationships(services);
    expect(result).toHaveLength(2);
    expect(result[0]?.leftAccessPoint).toBe('Trades');
    expect(result[0]?.rightAccessPoint).toBe('Accounts');
    expect(result[0]?.sharedColumns).toEqual(['accountId']);
    expect(result[1]?.leftAccessPoint).toBe('Trades');
    expect(result[1]?.rightAccessPoint).toBe('Settlements');
    expect(result[1]?.sharedColumns).toEqual(['tradeId']);
  });
});
