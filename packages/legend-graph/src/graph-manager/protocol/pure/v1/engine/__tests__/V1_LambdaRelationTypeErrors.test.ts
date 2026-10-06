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
  assertErrorThrown,
  guaranteeType,
  HttpStatus,
  LogService,
  NetworkClientError,
} from '@finos/legend-shared';
import {
  V1_BatchLambdaRelationTypeInput,
  V1_LambdaReturnTypeInput,
} from '../compilation/V1_LambdaReturnType.js';
import { V1_RemoteEngine } from '../V1_RemoteEngine.js';
import { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer.js';
import { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import { CompilationError } from '../../../../../action/EngineError.js';

// The shape the engine sends with a 400 from `compilation/lambdaRelationType`
// (stack trace removed).
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

const buildBadRequestError = (): NetworkClientError =>
  new NetworkClientError(
    { status: HttpStatus.BAD_REQUEST } as Response,
    ENGINE_COMPILATION_ERROR,
  );

const createEngine = (): V1_RemoteEngine =>
  new V1_RemoteEngine({ baseUrl: 'http://engine.test/api' }, new LogService());

const expectCompilationError = async (
  promise: Promise<unknown>,
): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    assertErrorThrown(error);
    const compilationError = guaranteeType(error, CompilationError);
    expect(compilationError.message).toBe(
      "The store 'test::Db' can't be found.",
    );
    expect(compilationError.sourceInformation?.startColumn).toBe(2);
    expect(compilationError.sourceInformation?.endColumn).toBe(20);
    return;
  }
  throw new Error('Expected the call to fail with a compilation error');
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('Lambda relation type: engine compilation errors'), () => {
  test('a 400 from the single call becomes a CompilationError', async () => {
    const engine = createEngine();
    jest
      .spyOn(engine.getEngineServerClient(), 'lambdaRelationType')
      .mockRejectedValue(buildBadRequestError());

    await expectCompilationError(
      engine.getLambdaRelationTypeFromRawInput(
        new V1_LambdaReturnTypeInput(
          new V1_PureModelContextPointer(undefined),
          new V1_RawLambda(),
        ),
      ),
    );
  });

  test('a 400 from the batch call becomes a CompilationError', async () => {
    const engine = createEngine();
    jest
      .spyOn(engine.getEngineServerClient(), 'batchLambdasRelationType')
      .mockRejectedValue(buildBadRequestError());

    await expectCompilationError(
      engine.getBatchLambdasRelationTypeFromRawInput(
        new V1_BatchLambdaRelationTypeInput(
          new V1_PureModelContextPointer(undefined),
          { lambda: new V1_RawLambda() },
        ),
      ),
    );
  });

  test('other failures are rethrown unchanged', async () => {
    const engine = createEngine();
    const serverError = new NetworkClientError(
      { status: HttpStatus.INTERNAL_SERVER_ERROR } as Response,
      'boom',
    );
    jest
      .spyOn(engine.getEngineServerClient(), 'lambdaRelationType')
      .mockRejectedValue(serverError);

    await expect(
      engine.getLambdaRelationTypeFromRawInput(
        new V1_LambdaReturnTypeInput(
          new V1_PureModelContextPointer(undefined),
          new V1_RawLambda(),
        ),
      ),
    ).rejects.toBe(serverError);
  });
});
