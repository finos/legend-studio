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

import { test, expect, beforeAll, jest } from '@jest/globals';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  Class,
  DEFAULT_SOURCE_PARAMETER_NAME,
  VARIABLE_REFERENCE_TOKEN,
  getAllClassDerivedProperties,
  getAllClassProperties,
} from '@finos/legend-graph';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import { CORE_DND_TYPE, generateTypeTreeNodeLambdaPath } from '../DnDUtils.js';
import type { TypeTreeNodeData } from '../TreeUtils.js';
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

const buildProperty = (
  name: string,
  type: string,
): Record<string, unknown> => ({
  name,
  multiplicity: { lowerBound: 1, upperBound: 1 },
  genericType: {
    rawType: { _type: 'packageableType', fullPath: type },
  },
});

const buildDerivedProperty = (
  name: string,
  parameters: Record<string, unknown>[],
  returnType: string,
  bodyProperty: string,
): Record<string, unknown> => ({
  name,
  parameters,
  body: [
    {
      _type: 'property',
      property: bodyProperty,
      parameters: [{ _type: 'var', name: 'this' }],
    },
  ],
  returnMultiplicity: { lowerBound: 1, upperBound: 1 },
  returnGenericType: {
    rawType: { _type: 'packageableType', fullPath: returnType },
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
        buildProperty('name', 'String'),
        buildProperty('ceo', 'test::Person'),
      ],
      qualifiedProperties: [
        buildDerivedProperty(
          'employeeByStatus',
          [buildParameter('status', 'test::Status')],
          'test::Person',
          'ceo',
        ),
      ],
    },
  },
  {
    path: 'test::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        buildProperty('name', 'String'),
        buildProperty('firm', 'test::Firm'),
      ],
      qualifiedProperties: [
        buildDerivedProperty('noParameter', [], 'String', 'name'),
        buildDerivedProperty(
          'primitiveParameters',
          [
            buildParameter('text', 'String'),
            buildParameter('count', 'Integer'),
            buildParameter('flag', 'Boolean'),
          ],
          'String',
          'name',
        ),
        buildDerivedProperty(
          'enumerationParameter',
          [buildParameter('status', 'test::Status')],
          'String',
          'name',
        ),
        buildDerivedProperty(
          'classParameter',
          [
            buildParameter('text', 'String'),
            buildParameter('firm', 'test::Firm'),
          ],
          'String',
          'name',
        ),
        buildDerivedProperty(
          'firmFor',
          [
            buildParameter('text', 'String'),
            buildParameter('count', 'Integer'),
          ],
          'test::Firm',
          'firm',
        ),
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

// mimic the node chain built by the type tree explorer when expanding nodes
const buildPropertyNode = (
  parentNode: TypeTreeNodeData,
  propertyName: string,
): TypeTreeNodeData => {
  const owner = guaranteeType(parentNode.type, Class);
  const property = guaranteeNonNullable(
    getAllClassProperties(owner)
      .concat(getAllClassDerivedProperties(owner))
      .find((p) => p.name === propertyName),
  );
  return {
    id: `${parentNode.id}.${property.name}`,
    label: property.name,
    type: property.genericType.value.rawType,
    parent: owner,
    parentNode,
    dndType: CORE_DND_TYPE.TYPE_TREE_PRIMITIVE,
    property,
  };
};

const getDroppedPath = (...propertyNames: string[]): string => {
  const sourceClass =
    editorStore.graphManagerState.graph.getClass('test::Person');
  const rootNode: TypeTreeNodeData = {
    id: `${VARIABLE_REFERENCE_TOKEN}${DEFAULT_SOURCE_PARAMETER_NAME}`,
    label: '',
    parent: sourceClass,
    dndType: CORE_DND_TYPE.TYPE_TREE_CLASS,
    type: sourceClass,
  };
  return generateTypeTreeNodeLambdaPath(
    propertyNames.reduce(buildPropertyNode, rootNode),
    editorStore,
  );
};

test(unitTest('Generate dropped path for regular properties'), () => {
  expect(getDroppedPath('name')).toBe('$src.name');
  expect(getDroppedPath('firm', 'name')).toBe('$src.firm.name');
});

test(
  unitTest('Generate dropped path for derived property without parameters'),
  () => {
    expect(getDroppedPath('noParameter')).toBe('$src.noParameter()');
  },
);

test(
  unitTest(
    'Generate default call arguments for derived property with primitive parameters',
  ),
  () => {
    expect(getDroppedPath('primitiveParameters')).toBe(
      "$src.primitiveParameters('', 0, true)",
    );
  },
);

test(
  unitTest(
    'Generate default call arguments for derived property with enumeration parameter',
  ),
  () => {
    expect(getDroppedPath('enumerationParameter')).toBe(
      '$src.enumerationParameter(test::Status.ACTIVE)',
    );
  },
);

test(
  unitTest(
    'Generate placeholder call arguments for derived property with class parameter',
  ),
  () => {
    expect(getDroppedPath('classParameter')).toBe(
      "$src.classParameter('', param1)",
    );
  },
);

test(
  unitTest(
    'Generate call arguments for every derived property along a nested dropped path',
  ),
  () => {
    // property under a derived property returning a class
    expect(getDroppedPath('firmFor', 'name')).toBe("$src.firmFor('', 0).name");
    // derived property under a regular property
    expect(getDroppedPath('firm', 'employeeByStatus')).toBe(
      '$src.firm.employeeByStatus(test::Status.ACTIVE)',
    );
    // multiple derived properties along the path
    expect(getDroppedPath('firmFor', 'employeeByStatus', 'name')).toBe(
      "$src.firmFor('', 0).employeeByStatus(test::Status.ACTIVE).name",
    );
  },
);

test(
  unitTest(
    'Log an error and use a placeholder value when a derived property parameter type cannot be resolved',
  ),
  () => {
    const derivedProperty = guaranteeNonNullable(
      editorStore.graphManagerState.graph
        .getClass('test::Person')
        .derivedProperties.find((p) => p.name === 'noParameter'),
    );
    const originalParameters = derivedProperty.parameters;
    const logErrorSpy = jest
      .spyOn(editorStore.applicationStore.logService, 'error')
      .mockImplementation(() => undefined);
    try {
      derivedProperty.parameters = [
        buildParameter('text', 'String'),
        buildParameter('unknown', 'test::UnknownType'),
      ];
      expect(getDroppedPath('noParameter')).toBe(
        "$src.noParameter('', param1)",
      );
      expect(logErrorSpy).toHaveBeenCalledTimes(1);
    } finally {
      derivedProperty.parameters = originalParameters;
      logErrorSpy.mockRestore();
    }
  },
);
