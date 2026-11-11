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

import { expect, test } from '@jest/globals';
import { flattenGenerationSpecificationContent } from '../DepotGenerationSpecificationFlattenState.js';

test('puts every generation element into the first stage, in stage order', () => {
  const fileGenerations = [{ type: 'FILE_GENERATION', path: 'test::Avro' }];
  const { content, repeatedElementPaths } =
    flattenGenerationSpecificationContent({
      _type: 'generationSpecification',
      name: 'Gens',
      package: 'test',
      generationNodes: [
        {
          id: 'first',
          children: [],
          generationElements: ['test::A', 'test::B'],
        },
        { id: 'second', generationElement: 'test::C' },
        { id: 'third', generationElements: ['test::D'] },
      ],
      fileGenerations,
    });

  expect(content).toEqual({
    _type: 'generationSpecification',
    name: 'Gens',
    package: 'test',
    generationNodes: [
      {
        id: 'first',
        children: [],
        generationElements: ['test::A', 'test::B', 'test::C', 'test::D'],
      },
    ],
    fileGenerations,
  });
  expect(repeatedElementPaths).toEqual([]);
});

test('replaces a first stage written in the singular form', () => {
  const { content } = flattenGenerationSpecificationContent({
    generationNodes: [
      { id: 'first', generationElement: 'test::A' },
      { id: 'second', generationElement: 'test::B' },
    ],
  });

  expect(content.generationNodes).toEqual([
    { id: 'first', generationElements: ['test::A', 'test::B'] },
  ]);
});

test('keeps an element in more than one stage once, and says which', () => {
  const { content, repeatedElementPaths } =
    flattenGenerationSpecificationContent({
      generationNodes: [
        { id: 'first', generationElements: ['test::A', 'test::B'] },
        { id: 'second', generationElement: 'test::A' },
        { id: 'third', generationElements: ['test::C', 'test::B', 'test::A'] },
      ],
    });

  expect(content.generationNodes).toEqual([
    { id: 'first', generationElements: ['test::A', 'test::B', 'test::C'] },
  ]);
  expect(repeatedElementPaths).toEqual(['test::A', 'test::B']);
});

test('writes a single element left in the singular form', () => {
  const { content, repeatedElementPaths } =
    flattenGenerationSpecificationContent({
      generationNodes: [
        { id: 'first', generationElement: 'test::A' },
        { id: 'second', generationElements: ['test::A'] },
      ],
    });

  expect(content.generationNodes).toEqual([
    { id: 'first', generationElement: 'test::A' },
  ]);
  expect(repeatedElementPaths).toEqual(['test::A']);
});
