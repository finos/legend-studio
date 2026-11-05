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

import { test, expect } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import type { DerivedProperty } from '../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';

const FIRMS_BODY = [
  {
    _type: 'func',
    function: 'getAll',
    parameters: [{ _type: 'packageableElementPtr', fullPath: 'Firm' }],
  },
];
const LABEL_BODY = [
  {
    _type: 'func',
    function: 'cast',
    parameters: [
      { _type: 'string', value: 'person' },
      {
        _type: 'genericTypeInstance',
        genericType: {
          rawType: { _type: 'packageableType', fullPath: 'String' },
        },
      },
    ],
  },
];

// `model::Person.firms` returns `Firm.all()`, with `Firm` imported from
// `model`; `model::Person.label` only uses full paths and primitive types
const ENTITIES = [
  {
    path: '__internal__::SectionIndex',
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          parserName: 'Pure',
          elements: ['model::Firm', 'model::Person'],
          imports: ['model'],
        },
      ],
    },
  },
  {
    path: 'model::Firm',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [],
    },
  },
  {
    path: 'model::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [],
      qualifiedProperties: [
        {
          name: 'firms',
          body: FIRMS_BODY,
          parameters: [],
          returnGenericType: {
            rawType: { _type: 'packageableType', fullPath: 'model::Firm' },
          },
          returnMultiplicity: { lowerBound: 0 },
        },
        {
          name: 'label',
          body: LABEL_BODY,
          parameters: [],
          returnGenericType: {
            rawType: { _type: 'packageableType', fullPath: 'String' },
          },
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
        },
      ],
    },
  },
] as Entity[];

const getPersonDerivedProperty = async (
  name: string,
): Promise<DerivedProperty> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    JSON.parse(JSON.stringify(ENTITIES)) as Entity[],
  );
  return guaranteeNonNullable(
    graphManagerState.graph
      .getClass('model::Person')
      .derivedProperties.find((property) => property.name === name),
  );
};

test(
  unitTest('Lambdas get the full path of elements named through imports'),
  async () => {
    const firms = await getPersonDerivedProperty('firms');
    expect(JSON.stringify(firms.body)).toContain('"fullPath":"model::Firm"');
  },
);

test(
  unitTest(
    'Lambdas with only full paths and primitive types are kept as they are',
  ),
  async () => {
    const label = await getPersonDerivedProperty('label');
    expect(label.body).toEqual(LABEL_BODY);
  },
);
