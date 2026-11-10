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
import { DepotGenerationSpecification } from '../DepotGenerationSpecification.js';

test('reads generation elements and file generations from entity content', () => {
  const generationSpecification =
    DepotGenerationSpecification.serialization.fromJson({
      _type: 'generationSpecification',
      name: 'GenSpec',
      package: 'test',
      generationNodes: [
        { id: 'a', generationElement: 'test::ModelGenA' },
        { id: 'b', generationElement: 'test::ModelGenB' },
      ],
      fileGenerations: [
        { type: 'FILE_GENERATION', path: 'test::Avro' },
        { type: 'FILE_GENERATION', path: 'test::Protobuf' },
      ],
    });

  expect(
    generationSpecification.generationNodes.map(
      (node) => node.generationElement,
    ),
  ).toEqual(['test::ModelGenA', 'test::ModelGenB']);
  expect(generationSpecification.fileGenerations).toEqual([
    'test::Avro',
    'test::Protobuf',
  ]);
});

test('reads file generations referenced by plain path', () => {
  expect(
    DepotGenerationSpecification.serialization.fromJson({
      fileGenerations: ['test::Avro', { path: 'test::Protobuf' }],
    }).fileGenerations,
  ).toEqual(['test::Avro', 'test::Protobuf']);
});

test('counts nothing when the lists are missing', () => {
  const generationSpecification =
    DepotGenerationSpecification.serialization.fromJson({
      _type: 'generationSpecification',
      name: 'Empty',
      package: 'test',
    });

  expect(generationSpecification.generationNodes).toEqual([]);
  expect(generationSpecification.fileGenerations).toEqual([]);
});
