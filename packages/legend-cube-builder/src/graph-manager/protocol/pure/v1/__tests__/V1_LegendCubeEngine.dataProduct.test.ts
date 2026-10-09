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

import { describe, expect, jest, test } from '@jest/globals';
import {
  dataProductAccessor,
  elementPtr,
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type ModelContext,
  storeAccessor,
} from '@finos/legend-cube';
import { type PlainObject, TracerService } from '@finos/legend-shared';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../../../../CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import type { CubeLakehouseEnvironment } from '../../../../CubeLakehouseEnvironment.js';
import {
  V1_buildCubeDataProductExecutionContext,
  V1_buildCubeDataProductTypingContext,
} from '../V1_CubeDataProductModel.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// A data product cube (PLAN §6.8) on a client whose calls are mocked: what a
// run sends, and what is refused before any call

const PROJECT = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
};
const MODEL = createCubeDataProductModel({ ...PROJECT, warehouse: 'SALES_WH' });

const ACCESSOR = dataProductAccessor(
  ['sales::products::OrdersProduct', 'daily_orders'],
  { nodeId: 'dataProductAccessPoint101', role: EmitRole.ACCESSOR },
);

/** A run of a relation, captured at its first node */
const runOf = (relation: IR): IR =>
  lambda(
    [],
    [
      func(
        'from',
        [
          func('limit', [relation, literal({ kind: 'integer', value: '11' })]),
          elementPtr(CUBE_DATA_PRODUCT_RUNTIME_PATH),
        ],
        { nodeId: 'dataProductAccessPoint101', role: EmitRole.FROM },
      ),
    ],
  );

const RESULT = `{"builder": {"_type":"tdsBuilder","columns":[{"name":"ORDER_ID","type":"Integer"}]}, "activities": [], "result" : {"columns" : ["ORDER_ID"], "rows" : [{"values": [1]}]}}`;

const setUp = (
  lakehouseEnvironment?: CubeLakehouseEnvironment,
): {
  engine: V1_LegendCubeEngine;
  run: jest.Mock;
  batch: jest.Mock;
  parse: jest.Mock;
} => {
  const engine = new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
    { lakehouseEnvironment },
  );
  const run = jest.spyOn(engine.client, 'runQuery').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => RESULT,
  } as never);
  const batch = jest
    .spyOn(engine.client, 'batchLambdasRelationType')
    .mockResolvedValue({ result: {} } as never);
  const parse = jest.spyOn(engine.client, 'grammarToJSON_model');
  return {
    engine,
    run: run as unknown as jest.Mock,
    batch: batch as unknown as jest.Mock,
    parse: parse as unknown as jest.Mock,
  };
};

const environmentOf = (name: string): CubeLakehouseEnvironment => ({
  resolveEnvironment: jest.fn(async () => Promise.resolve(name)),
});

const sentBody = (call: unknown[]): PlainObject =>
  JSON.parse(call[0] as string) as PlainObject;

describe('Legend Cube engine: data product cubes', () => {
  test('Outlines the model with its runtime, without calling the engine', async () => {
    const { engine, parse, run } = setUp();
    expect(await engine.loadModel(MODEL)).toEqual({
      databases: [],
      runtimes: [{ path: CUBE_DATA_PRODUCT_RUNTIME_PATH, storePaths: [] }],
    });
    expect(parse).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test('Refuses a model it cannot run, naming the problem, for every call', async () => {
    const { engine, run, batch } = setUp(environmentOf('sales-env'));
    const model = {
      ...MODEL,
      environmentType: 'DEVELOPMENT',
    } as ModelContext;
    const message = "Cube doesn't read development data products yet";
    await expect(engine.loadModel(model)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      detail: message,
    });
    await expect(engine.execute(model, runOf(ACCESSOR))).rejects.toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'dataProductAccessPoint101',
      detail: message,
    });
    expect(
      (
        await engine.typeLambdas(
          model,
          new Map([['join101', lambda([], [ACCESSOR])]]),
        )
      ).get('join101'),
    ).toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      detail: message,
    });
    expect(run).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });

  test("Runs on the project at its saved version with a lakehouse runtime in the viewer's environment and the cube's warehouse", async () => {
    const environment = environmentOf('sales-env');
    const { engine, run } = setUp(environment);
    const result = await engine.execute(MODEL, runOf(ACCESSOR));
    expect(result.rows).toHaveLength(1);
    expect(environment.resolveEnvironment).toHaveBeenCalledWith({
      ...PROJECT,
      warehouse: 'SALES_WH',
    });
    const body = sentBody(run.mock.calls[0] as unknown[]);
    expect(body.model).toEqual(
      V1_buildCubeDataProductExecutionContext(
        { ...PROJECT, warehouse: 'SALES_WH' },
        'sales-env',
        'SALES_WH',
      ),
    );
    expect(JSON.stringify(body.function)).toContain('"type":"P"');
  });

  test('Runs a cube saved without a warehouse on the default one', async () => {
    const { engine, run } = setUp(environmentOf('sales-env'));
    await engine.execute(createCubeDataProductModel(PROJECT), runOf(ACCESSOR));
    const body = sentBody(run.mock.calls[0] as unknown[]);
    const [, data] = (body.model as { contexts: PlainObject[] }).contexts as [
      PlainObject,
      { elements: { runtimeValue: PlainObject }[] },
    ];
    expect(data.elements[0]?.runtimeValue.warehouse).toBe(
      CUBE_DEFAULT_CONSUMER_WAREHOUSE,
    );
  });

  test("Says when the host can't run data products, or the viewer has no environment, on the node run", async () => {
    const { engine, run } = setUp();
    await expect(engine.execute(MODEL, runOf(ACCESSOR))).rejects.toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'dataProductAccessPoint101',
      detail: "This page can't run data products: its host has no lakehouse",
    });
    const failing = setUp({
      resolveEnvironment: async () => {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          'Unable to resolve lakehouse user environment.',
        );
      },
    });
    await expect(
      failing.engine.execute(MODEL, runOf(ACCESSOR)),
    ).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'dataProductAccessPoint101',
      detail: 'Unable to resolve lakehouse user environment.',
    });
    expect(run).not.toHaveBeenCalled();
    expect(failing.run).not.toHaveBeenCalled();
  });

  test('Keeps database tables and data products apart, refusing a mix before any call', async () => {
    const table = storeAccessor(['test::Db', 'S', 'T']);
    const environment = environmentOf('sales-env');
    const { engine, run, batch } = setUp(environment);
    await expect(engine.execute(MODEL, runOf(table))).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      detail: "A data product cube can't read database tables",
    });
    const text: ModelContext = { _type: 'text', code: '###Relational' };
    await expect(engine.execute(text, runOf(ACCESSOR))).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      detail: 'Only a data product cube can read data products',
    });
    const typed = await engine.typeLambdas(
      text,
      new Map([['join101', lambda([], [ACCESSOR])]]),
    );
    expect(typed.get('join101')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
      detail: 'Only a data product cube can read data products',
    });
    expect(run).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
    expect(environment.resolveEnvironment).not.toHaveBeenCalled();
  });

  test('Types on the project alone, with no runtime or environment', async () => {
    const environment = environmentOf('sales-env');
    const { engine, batch } = setUp(environment);
    await engine.typeLambdas(
      MODEL,
      new Map([['join101', lambda([], [ACCESSOR])]]),
    );
    expect(sentBody(batch.mock.calls[0] as unknown[]).model).toEqual(
      V1_buildCubeDataProductTypingContext({
        ...PROJECT,
        warehouse: 'SALES_WH',
      }),
    );
    expect(environment.resolveEnvironment).not.toHaveBeenCalled();
  });

  test('Has no tables to resolve on a data product cube', async () => {
    const { engine, batch } = setUp();
    const resolved = await engine.resolveSchemas(
      MODEL,
      new Map([['relational101', ['test::Db', 'S', 'T'] as const]]),
    );
    expect(resolved.get('relational101')).toMatchObject({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'relational101',
    });
    expect(batch).not.toHaveBeenCalled();
  });
});
