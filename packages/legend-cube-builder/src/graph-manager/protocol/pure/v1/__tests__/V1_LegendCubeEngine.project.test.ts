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
  elementPtr,
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import { createCubeProjectModel } from '../../../../CubeProject.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// A cube on a published project (PLAN §6.3) on a client whose calls are
// mocked: the engine gets the project's pointer as the cube saved it, and a
// version that moves is refused before any call

const PROJECT = {
  groupId: 'com.example',
  artifactId: 'sales',
  versionId: '1.10.0',
};
const MODEL = createCubeProjectModel(PROJECT);
const DATABASE = 'sales::store::SalesDb';
const RUNTIME = 'sales::SalesRuntime';

const ACCESSOR = storeAccessor([DATABASE, 'SALES', 'ORDERS'], {
  nodeId: 'relational101',
  role: EmitRole.ACCESSOR,
});

const runOf = (relation: IR): IR =>
  lambda(
    [],
    [
      func(
        'from',
        [
          func('limit', [relation, literal({ kind: 'integer', value: '11' })]),
          elementPtr(RUNTIME),
        ],
        { nodeId: 'relational101', role: EmitRole.FROM },
      ),
    ],
  );

const RESULT = `{"builder": {"_type":"tdsBuilder","columns":[{"name":"ID","type":"Integer"}]}, "activities": [], "result" : {"columns" : ["ID"], "rows" : [{"values": [1]}]}}`;

/** The engine's answer when it can't fetch the pointer's project from its depot */
const DEPOT_FAILURE = {
  code: -1,
  status: 'error',
  message:
    "Engine was unable to load information from the Pure SDLC using: <a href='http://depot/api/projects/com.example/sales/versions/1.10.0/pureModelContextData' target='_blank'>link</a>",
};

const setUp = () => {
  const engine = new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
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
  return { engine, run, batch, parse };
};

/** The JSON body of a mocked call */
const bodyOf = (mock: { mock: { calls: unknown[][] } }): PlainObject =>
  JSON.parse(mock.mock.calls[0]?.[0] as string) as PlainObject;

describe('A project cube on the engine', () => {
  test('Types its tables on the pointer as saved, with no grammar call', async () => {
    const { engine, batch, parse } = setUp();
    await engine.resolveSchemas(
      MODEL,
      new Map([['relational101', [DATABASE, 'SALES', 'ORDERS'] as const]]),
    );
    expect(batch).toHaveBeenCalledTimes(1);
    expect(bodyOf(batch).model).toEqual(MODEL);
    expect(parse).not.toHaveBeenCalled();
  });

  test('Runs on the pointer as saved', async () => {
    const { engine, run } = setUp();
    const result = await engine.execute(MODEL, runOf(ACCESSOR));
    expect(result.rows).toHaveLength(1);
    expect(bodyOf(run).model).toEqual(MODEL);
  });

  test('Refuses a SNAPSHOT or an alias version before any call', async () => {
    const { engine, run, batch } = setUp();
    for (const versionId of ['master-SNAPSHOT', 'latest', 'HEAD']) {
      const moving = createCubeProjectModel({ ...PROJECT, versionId });
      const typed = await engine.typeLambdas(
        moving,
        new Map([['relational101', lambda([], [ACCESSOR])]]),
      );
      const error = typed.get('relational101');
      expect(error).toBeInstanceOf(CubeEngineError);
      expect((error as CubeEngineError).kind).toBe(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
      );
      expect((error as CubeEngineError).detail).toContain(
        'Cube reads released versions only',
      );
      await expect(engine.execute(moving, runOf(ACCESSOR))).rejects.toThrow(
        'Cube reads released versions only',
      );
    }
    expect(batch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test("Leaves a project's outline to the project catalog", async () => {
    const { engine, parse } = setUp();
    await expect(engine.loadModel(MODEL)).rejects.toThrow(
      'through the project catalog',
    );
    expect(parse).not.toHaveBeenCalled();
  });

  test("Says in plain words when the engine can't fetch the project from its depot", async () => {
    const { engine, batch, run } = setUp();
    const failure = new NetworkClientError(
      {
        status: 500,
        statusText: 'Server Error',
        url: 'http://engine',
      } as Response,
      DEPOT_FAILURE as NetworkClientError['payload'],
    );
    batch.mockRejectedValueOnce(failure);
    run.mockRejectedValueOnce(failure);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([['relational101', lambda([], [ACCESSOR])]]),
    );
    const expected =
      "The engine couldn't load the cube's project from its depot (http://depot/api/projects/com.example/sales/versions/1.10.0/pureModelContextData): check that the version is published and the depot can be reached";
    expect((typed.get('relational101') as CubeEngineError).detail).toBe(
      expected,
    );
    await expect(engine.execute(MODEL, runOf(ACCESSOR))).rejects.toThrow(
      expected,
    );
  });
});
