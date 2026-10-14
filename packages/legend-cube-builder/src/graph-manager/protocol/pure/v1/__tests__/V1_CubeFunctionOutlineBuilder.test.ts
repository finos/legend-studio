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
import type { PlainObject } from '@finos/legend-shared';
import {
  V1_buildCubeFunctionOutlines,
  V1_CUBE_FUNCTION_PROBLEM,
} from '../V1_CubeFunctionOutlineBuilder.js';
import { V1_buildCubeModelOutline } from '../V1_CubeModelOutlineBuilder.js';
// the engine's JSON of a model with functions, written by the engine
import MODEL from './V1_CubeFunctions.model.json' with { type: 'json' };

const ELEMENTS = MODEL.elements as PlainObject[];

const byPath = (path: string) =>
  V1_buildCubeFunctionOutlines(ELEMENTS).find((fn) => fn.path === path);

describe("A model's functions that return a relation", () => {
  test('Lists each, by the path it is called by and its full name, leaving out others', () => {
    expect(
      V1_buildCubeFunctionOutlines(ELEMENTS).map((fn) => [
        fn.path,
        fn.signature,
      ]),
    ).toEqual([
      ['sales::allOrders', 'sales::allOrders__Relation_1_'],
      [
        'sales::ordersAbove',
        'sales::ordersAbove_Float_1__String_$0_1$__Relation_1_',
      ],
      ['sales::shippedOrders', 'sales::shippedOrders__Relation_1_'],
      ['sales::bigShippedOrders', 'sales::bigShippedOrders__Relation_1_'],
      ['sales::mixedOrders', 'sales::mixedOrders__Relation_1_'],
      ['sales::ordersOf', 'sales::ordersOf_Integer_MANY__Relation_1_'],
      ['sales::ordersIn', 'sales::ordersIn_Status_1__Relation_1_'],
    ]);
  });

  test('Gives its parameters and the columns it declares', () => {
    expect(byPath('sales::ordersAbove')).toEqual({
      path: 'sales::ordersAbove',
      signature: 'sales::ordersAbove_Float_1__String_$0_1$__Relation_1_',
      parameters: [
        { name: 'min', type: 'Float', multiplicity: '[1]' },
        { name: 'status', type: 'String', multiplicity: '[0..1]' },
      ],
      columns: [
        { name: 'ID', type: 'Integer' },
        { name: 'AMOUNT', type: 'Float' },
        { name: 'STATUS', type: 'String' },
      ],
      runtime: undefined,
      problem: undefined,
    });
  });

  test('Reads the runtime its from() names, directly or through a function it calls', () => {
    expect(byPath('sales::allOrders')?.runtime).toBeUndefined();
    expect(byPath('sales::shippedOrders')?.runtime).toBe('sales::SalesRuntime');
    expect(byPath('sales::bigShippedOrders')?.runtime).toBe(
      'sales::SalesRuntime',
    );
    expect(byPath('sales::bigShippedOrders')?.problem).toBeUndefined();
  });

  test("Says why one can't be added: two runtimes, or a parameter Cube can't take a value for", () => {
    expect(byPath('sales::mixedOrders')?.problem).toBe(
      V1_CUBE_FUNCTION_PROBLEM.TWO_RUNTIMES([
        'sales::SalesRuntime',
        'sales::ArchiveRuntime',
      ]),
    );
    expect(byPath('sales::ordersOf')?.problem).toBe(
      V1_CUBE_FUNCTION_PROBLEM.PARAMETER_MULTIPLICITY('ids', '[*]'),
    );
    expect(byPath('sales::ordersIn')?.problem).toBe(
      V1_CUBE_FUNCTION_PROBLEM.PARAMETER_TYPE('status', 'Status'),
    );
  });

  test("Follows calls into functions it is not asked to list, e.g. a dependency's", () => {
    const own = ELEMENTS.filter(
      (element) => element.name === 'bigShippedOrders__Relation_1_',
    );
    expect(V1_buildCubeFunctionOutlines(own)[0]?.runtime).toBeUndefined();
    expect(V1_buildCubeFunctionOutlines(own, ELEMENTS)[0]?.runtime).toBe(
      'sales::SalesRuntime',
    );
  });

  test("Says so when its from()'s runtime is an expression", () => {
    const element: PlainObject = {
      _type: 'function',
      package: 'sales',
      name: 'viaVariable__Relation_1_',
      parameters: [],
      returnGenericType: (
        ELEMENTS.find(
          (each) => each.name === 'allOrders__Relation_1_',
        ) as PlainObject
      ).returnGenericType,
      returnMultiplicity: { lowerBound: 1, upperBound: 1 },
      body: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            { _type: 'func', function: 'sales::allOrders', parameters: [] },
            { _type: 'var', name: 'runtime' },
          ],
        },
      ],
    };
    expect(V1_buildCubeFunctionOutlines([element])[0]?.problem).toBe(
      V1_CUBE_FUNCTION_PROBLEM.RUNTIME_NOT_AN_ELEMENT,
    );
  });

  test("Are part of the model's outline", () => {
    expect(
      V1_buildCubeModelOutline(MODEL as PlainObject).functions?.map(
        (fn) => fn.path,
      ),
    ).toHaveLength(7);
  });
});
