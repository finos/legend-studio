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

import { test, expect, beforeAll } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import { generateDerivedPropertyCallArguments } from '../DnDUtils.js';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';

const buildParameter = (
  name: string,
  type: string,
): Record<string, unknown> => ({
  _type: 'var',
  name,
  multiplicity: { lowerBound: 1, upperBound: 1 },
  genericType: {
    rawType: { _type: 'packageableType', fullPath: type },
  },
});

const buildDerivedProperty = (
  name: string,
  parameters: Record<string, unknown>[],
): Record<string, unknown> => ({
  name,
  parameters,
  body: [
    {
      _type: 'property',
      property: 'name',
      parameters: [{ _type: 'var', name: 'this' }],
    },
  ],
  returnMultiplicity: { lowerBound: 1, upperBound: 1 },
  returnGenericType: {
    rawType: { _type: 'packageableType', fullPath: 'String' },
  },
});

const TEST_DATA__DerivedPropertyEntities: Entity[] = [
  {
    path: 'test::Status',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'Status',
      package: 'test',
      values: [{ value: 'ACTIVE' }, { value: 'INACTIVE' }],
    },
  },
  {
    path: 'test::Firm',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
      properties: [
        {
          name: 'name',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'String' },
          },
        },
      ],
      qualifiedProperties: [
        buildDerivedProperty('noParameter', []),
        buildDerivedProperty('primitiveParameters', [
          buildParameter('text', 'String'),
          buildParameter('count', 'Integer'),
          buildParameter('flag', 'Boolean'),
        ]),
        buildDerivedProperty('enumerationParameter', [
          buildParameter('status', 'test::Status'),
        ]),
        buildDerivedProperty('classParameter', [
          buildParameter('text', 'String'),
          buildParameter('firm', 'test::Firm'),
        ]),
      ],
    },
  },
];

const editorStore = TEST__getTestEditorStore();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(
    editorStore.graphManagerState,
    TEST_DATA__DerivedPropertyEntities,
  );
});

const getDerivedPropertyCallArguments = (name: string): string =>
  generateDerivedPropertyCallArguments(
    guaranteeNonNullable(
      editorStore.graphManagerState.graph
        .getClass('test::Firm')
        .derivedProperties.find((property) => property.name === name),
    ),
    editorStore.graphManagerState,
  );

test(
  unitTest('Generate call arguments for derived property without parameters'),
  () => {
    expect(getDerivedPropertyCallArguments('noParameter')).toBe('()');
  },
);

test(
  unitTest(
    'Generate default call arguments for derived property with primitive parameters',
  ),
  () => {
    expect(getDerivedPropertyCallArguments('primitiveParameters')).toBe(
      "('', 0, true)",
    );
  },
);

test(
  unitTest(
    'Generate default call arguments for derived property with enumeration parameter',
  ),
  () => {
    expect(getDerivedPropertyCallArguments('enumerationParameter')).toBe(
      '(test::Status.ACTIVE)',
    );
  },
);

test(
  unitTest(
    'Generate placeholder call arguments for derived property with class parameter',
  ),
  () => {
    expect(getDerivedPropertyCallArguments('classParameter')).toBe(
      "('', param1)",
    );
  },
);
