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

import { describe, expect, test } from '@jest/globals';
import { NetworkClientError } from '@finos/legend-shared';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import {
  V1_buildCubeEngineError,
  V1_toCubeEngineError,
} from '../V1_CubeEngineErrors.js';

const TRACE =
  'org.finos.legend.engine.shared.core.operational.errorManagement.EngineException: …\n\tat …';

const networkError = (status: number, payload: unknown): NetworkClientError =>
  new NetworkClientError(
    { status, statusText: 'Bad Request', url: 'http://engine' } as Response,
    payload as NetworkClientError['payload'],
  );

const fields = (error: CubeEngineError | undefined): unknown => ({
  kind: error?.kind,
  nodeId: error?.nodeId,
  role: error?.role,
  firstLine: error?.firstLine,
  detail: error?.detail,
});

describe('Cube engine errors', () => {
  test('Places a compile error on the node its stamp names, with the first line apart and no trace', () => {
    const error = V1_buildCubeEngineError(
      {
        code: -1,
        errorType: 'COMPILATION',
        message: "Can't find the column 'NOPE'\nmore detail",
        sourceInformation: { sourceId: 'cube:filter101:column', startLine: 1 },
        trace: TRACE,
      },
      'relational101',
      CubeEngineErrorKind.EXECUTION,
    );
    expect(fields(error)).toEqual({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'filter101',
      role: 'column',
      firstLine: "Can't find the column 'NOPE'",
      detail: "Can't find the column 'NOPE'\nmore detail",
    });
    expect(error?.message).toBe("Can't find the column 'NOPE'");
  });

  test('Reads a stamp whose node id has a colon', () => {
    expect(
      V1_buildCubeEngineError(
        { message: 'x', sourceInformation: { sourceId: 'cube:a:b:key' } },
        undefined,
        CubeEngineErrorKind.COMPILE,
      )?.nodeId,
    ).toBe('a:b');
  });

  test.each<[string, unknown]>([
    ['no source information', { message: 'Database error' }],
    [
      'an empty source id',
      { message: 'Database error', sourceInformation: { sourceId: '' } },
    ],
    [
      'a source id Cube did not stamp',
      { message: 'Database error', sourceInformation: { sourceId: 'x.pure' } },
    ],
  ])(
    'Places an error with %s on the fallback node, of the kind given',
    (_, payload) => {
      expect(
        fields(
          V1_buildCubeEngineError(
            payload,
            'filter101',
            CubeEngineErrorKind.EXECUTION,
          ),
        ),
      ).toEqual({
        kind: CubeEngineErrorKind.EXECUTION,
        nodeId: 'filter101',
        role: undefined,
        firstLine: 'Database error',
        detail: 'Database error',
      });
    },
  );

  test.each([undefined, null, 'text', {}, { message: '' }, { message: 4 }])(
    'Reads no error from the payload %j',
    (payload) => {
      expect(
        V1_buildCubeEngineError(payload, 'n', CubeEngineErrorKind.COMPILE),
      ).toBeUndefined();
    },
  );

  test("Reads a failed call's error from the engine's payload", () => {
    expect(
      fields(
        V1_toCubeEngineError(
          networkError(400, {
            errorType: 'COMPILATION',
            message: "Can't find type 'X'",
            sourceInformation: { sourceId: 'cube:join101:cast' },
            trace: TRACE,
          }),
          'filter101',
          CubeEngineErrorKind.EXECUTION,
        ),
      ),
    ).toEqual({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
      role: 'cast',
      firstLine: "Can't find type 'X'",
      detail: "Can't find type 'X'",
    });
  });

  test('Reads a failed call with no payload, or any other error, as a network error on the fallback node', () => {
    expect(
      fields(
        V1_toCubeEngineError(
          networkError(502, undefined),
          'filter101',
          CubeEngineErrorKind.EXECUTION,
        ),
      ),
    ).toEqual({
      kind: CubeEngineErrorKind.NETWORK,
      nodeId: 'filter101',
      role: undefined,
      firstLine:
        'Received response with status 502 (Bad Request) for http://engine',
      detail:
        'Received response with status 502 (Bad Request) for http://engine',
    });
    expect(
      fields(
        V1_toCubeEngineError(
          new TypeError('Failed to fetch'),
          'filter101',
          CubeEngineErrorKind.COMPILE,
        ),
      ),
    ).toHaveProperty('kind', CubeEngineErrorKind.NETWORK);
  });

  test('Keeps a Cube engine error, placing it on the fallback node when it has none', () => {
    const placed = new CubeEngineError(
      CubeEngineErrorKind.COMPILE,
      'x',
      'join101',
    );
    expect(
      V1_toCubeEngineError(placed, 'filter101', CubeEngineErrorKind.EXECUTION),
    ).toBe(placed);
    const unplaced = new CubeEngineError(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
      'not supported',
    );
    expect(
      fields(
        V1_toCubeEngineError(
          unplaced,
          'filter101',
          CubeEngineErrorKind.COMPILE,
        ),
      ),
    ).toEqual({
      kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
      nodeId: 'filter101',
      role: undefined,
      firstLine: 'not supported',
      detail: 'not supported',
    });
  });
});
