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
import {
  colSpec,
  columnAccess,
  CubeLambdaReadError,
  dataProductAccessor,
  enumValue,
  func,
  genericType,
  ingestAccessor,
  isSameCubeIR,
  JOIN_KIND_PATH,
  lambda,
  letBinding,
  literal,
  relationType,
  storeAccessor,
  variable,
  type IR,
} from '@finos/legend-cube';
import {
  parseLosslessJSON,
  stringifyLosslessJSON,
  type PlainObject,
} from '@finos/legend-shared';
import { TEST__cubeLambdaSamples } from '../../../../../__test-utils__/CubeLambdaCorpus.js';
import {
  V1_CUBE_LAMBDA_READER_MESSAGE,
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from '../V1_CubeLambdaReader.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';

const SAMPLES = TEST__cubeLambdaSamples();
const COMPARISON = {
  readExpression: (json: object): IR => V1_readCubeValueSpecification(json),
};

/** The JSON a host keeps: written with lossless numbers, read back as plain JSON, as Studio's content holds it */
const asHostJson = (json: PlainObject): unknown =>
  JSON.parse(stringifyLosslessJSON(json));

const TABLE_JSON = {
  _type: 'classInstance',
  type: '>',
  value: { path: ['db::Store', 'S', 'T'] },
};
const queryOf = (body: unknown): unknown => ({
  _type: 'lambda',
  parameters: [],
  body: [body],
});
const call = (name: string, ...parameters: unknown[]): unknown => ({
  _type: 'func',
  function: name,
  parameters,
});

describe('Reading the JSON of a lambda', () => {
  test('Has the samples to read', () => {
    expect(SAMPLES.length).toBeGreaterThan(20);
  });

  test.each(SAMPLES.map((sample) => [sample.key, sample] as const))(
    'Reads back what Cube writes for %s, as a matview and as Show Pure',
    (_key, sample) => {
      [sample.relation, sample.run].forEach((written) => {
        const json = V1_serializeCubeLambda(written);
        // as sent to the engine, with lossless numbers
        expect(
          isSameCubeIR(
            V1_readCubeLambda(parseLosslessJSON(stringifyLosslessJSON(json))),
            written,
            COMPARISON,
          ),
        ).toBe(true);
        // as a host keeps it, plain JSON
        expect(
          isSameCubeIR(
            V1_readCubeLambda(asHostJson(json)),
            written,
            COMPARISON,
          ),
        ).toBe(true);
      });
    },
  );

  test("Reads the shapes the engine's grammar gives", () => {
    // |#>{db::Store.S.T}#->filter(x|$x.QTY > -5 && $x.P == 1.5d && $x.F == 0.0)
    //   ->join(#>{db::Store.T}#, JoinKind.LEFT, {l, r|$l.A == $r.A})->sort([~A->ascending()])
    const json = queryOf(
      call(
        'sort',
        call(
          'join',
          call('filter', TABLE_JSON, {
            _type: 'lambda',
            parameters: [{ _type: 'var', name: 'x' }],
            body: [
              call(
                'and',
                call(
                  'and',
                  call(
                    'greaterThan',
                    {
                      _type: 'property',
                      property: 'QTY',
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                    call('minus', { _type: 'integer', value: 5 }),
                  ),
                  call(
                    'equal',
                    {
                      _type: 'property',
                      property: 'P',
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                    { _type: 'decimal', value: 1.5 },
                  ),
                ),
                call(
                  'equal',
                  {
                    _type: 'property',
                    property: 'F',
                    parameters: [{ _type: 'var', name: 'x' }],
                  },
                  { _type: 'float', value: 0 },
                ),
              ),
            ],
            sourceInformation: { sourceId: '', startLine: 1 },
          }),
          {
            _type: 'classInstance',
            type: '>',
            value: { path: ['db::Store', 'T'] },
          },
          {
            _type: 'property',
            property: 'LEFT',
            parameters: [
              { _type: 'packageableElementPtr', fullPath: 'JoinKind' },
            ],
          },
          {
            _type: 'lambda',
            parameters: [
              { _type: 'var', name: 'l' },
              { _type: 'var', name: 'r' },
            ],
            body: [
              call(
                'equal',
                {
                  _type: 'property',
                  property: 'A',
                  parameters: [{ _type: 'var', name: 'l' }],
                },
                {
                  _type: 'property',
                  property: 'A',
                  parameters: [{ _type: 'var', name: 'r' }],
                },
              ),
            ],
          },
        ),
        {
          _type: 'collection',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          values: [
            call('ascending', {
              _type: 'classInstance',
              type: 'colSpec',
              value: { name: 'A' },
            }),
          ],
        },
      ),
    );
    const row = (name: string): IR => columnAccess('row', name);
    const expected = lambda(
      [],
      [
        func('sort', [
          func('join', [
            func('filter', [
              storeAccessor(['db::Store', 'S', 'T']),
              lambda(
                ['row'],
                [
                  func('and', [
                    func('and', [
                      func('greaterThan', [
                        row('QTY'),
                        literal({ kind: 'integer', value: '-5' }),
                      ]),
                      func('equal', [
                        row('P'),
                        literal({ kind: 'decimal', value: '1.50' }),
                      ]),
                    ]),
                    func('equal', [
                      row('F'),
                      literal({ kind: 'float', value: '0.0' }),
                    ]),
                  ]),
                ],
              ),
            ]),
            storeAccessor(['db::Store', 'default', 'T']),
            enumValue(JOIN_KIND_PATH, 'LEFT'),
            lambda(
              ['a', 'b'],
              [func('equal', [columnAccess('a', 'A'), columnAccess('b', 'A')])],
            ),
          ]),
          func('ascending', [colSpec('A')]),
        ]),
      ],
    );
    expect(isSameCubeIR(V1_readCubeLambda(json), expected)).toBe(true);
  });

  test('Reads lets, accessors and a relation type', () => {
    const read = V1_readCubeLambda({
      _type: 'lambda',
      parameters: [],
      body: [
        call(
          'letFunction',
          { _type: 'string', value: 'n_1' },
          {
            _type: 'classInstance',
            type: 'I',
            multiplicity: { lowerBound: 1, upperBound: 1 },
            value: { path: ['demo::Ingest', 'TRADES'], metadata: false },
          },
        ),
        call(
          'cast',
          call(
            'concatenate',
            { _type: 'var', name: 'n_1' },
            {
              _type: 'classInstance',
              type: 'P',
              value: { path: ['demo::Product', 'trades'], parameters: [] },
            },
          ),
          {
            _type: 'genericTypeInstance',
            genericType: {
              rawType: { _type: 'packageableType', fullPath: 'Relation' },
              typeArguments: [
                {
                  rawType: {
                    _type: 'relationType',
                    columns: [
                      {
                        name: 'A',
                        genericType: {
                          rawType: {
                            _type: 'packageableType',
                            fullPath: 'meta::pure::precisePrimitives::Varchar',
                          },
                          typeVariableValues: [{ _type: 'integer', value: 15 }],
                        },
                        multiplicity: { lowerBound: 0, upperBound: 1 },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ),
      ],
    });
    expect(
      isSameCubeIR(
        read,
        lambda(
          [],
          [
            letBinding('n_a', ingestAccessor(['demo::Ingest', 'TRADES'])),
            func('cast', [
              func('concatenate', [
                variable('n_a'),
                dataProductAccessor(['demo::Product', 'trades']),
              ]),
              relationType([
                {
                  name: 'A',
                  type: genericType('meta::pure::precisePrimitives::Varchar', [
                    15,
                  ]),
                  nullable: true,
                },
              ]),
            ]),
          ],
        ),
      ),
    ).toBe(true);
  });

  test('Refuses what Cube has no IR for, by name', () => {
    expect(() =>
      V1_readCubeLambda(
        queryOf(
          call('greaterThan', TABLE_JSON, {
            _type: 'strictTime',
            value: '10:00:00',
          }),
        ),
      ),
    ).toThrow(V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a strictTime'));
    expect(() =>
      V1_readCubeLambda(
        queryOf({
          _type: 'classInstance',
          type: 'SQL',
          value: { code: 'select 1' },
        }),
      ),
    ).toThrow(V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR('SQL'));
    expect(() =>
      V1_readCubeLambda(
        queryOf({
          _type: 'classInstance',
          type: 'I',
          value: { path: ['demo::Ingest', 'TRADES'], metadata: true },
        }),
      ),
    ).toThrow(V1_CUBE_LAMBDA_READER_MESSAGE.INGEST_METADATA);
    expect(() =>
      V1_readCubeLambda(
        queryOf({
          _type: 'classInstance',
          type: 'P',
          value: {
            path: ['demo::Product', 'trades'],
            parameters: [{ _type: 'integer', value: 1 }],
          },
        }),
      ),
    ).toThrow(V1_CUBE_LAMBDA_READER_MESSAGE.DATA_PRODUCT_PARAMETERS);
    expect(() => V1_readCubeLambda(TABLE_JSON)).toThrow(CubeLambdaReadError);
    expect(() =>
      V1_readCubeLambda(queryOf({ _type: 'integer', value: 2 ** 60 })),
    ).toThrow(V1_CUBE_LAMBDA_READER_MESSAGE.NUMBER(2 ** 60));
  });
});
