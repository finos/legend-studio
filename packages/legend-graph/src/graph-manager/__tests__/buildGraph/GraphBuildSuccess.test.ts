/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, expect, beforeAll, describe, jest } from '@jest/globals';
import TEST_DATA__m2mGraphEntities from './TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import {
  AbstractServerClient,
  guaranteeNonNullable,
  isType,
} from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../__test-utils__/GraphManagerTestUtils.js';
import { PRIMITIVE_TYPE } from '../../../graph/MetaModelConst.js';
import type { OperationSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import type { PureInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import { fromElementPathToMappingElementId } from '../../../graph/MetaModelUtils.js';
import { Enum } from '../../../graph/metamodel/pure/packageableElements/domain/Enum.js';
import { PrimitiveType } from '../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { INTERNAL__UnknownElement } from '../../../graph/metamodel/pure/packageableElements/INTERNAL__UnknownElement.js';
import { TEST_DATA__SimpleGraph } from './TEST_DATA__Core.js';

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__m2mGraphEntities as Entity[],
  );
});

test(unitTest('Graph has been initialized properly'), () => {
  const graph = graphManagerState.graph;
  expect(graphManagerState.graphBuildState.hasSucceeded).toBeTruthy();
  Object.values(PRIMITIVE_TYPE).forEach((primitiveType) =>
    expect(graph.getPrimitiveType(primitiveType)).toBeDefined(),
  );
});

test(unitTest('Enumeration is loaded properly'), () => {
  const graph = graphManagerState.graph;
  const pureEnum = graph.getEnumeration('ui::TestEnumeration');
  expect(pureEnum.values).toHaveLength(3);
  pureEnum.values.forEach((val) => expect(val instanceof Enum).toBeTruthy());
  const profile = graph.getProfile('ui::test1::ProfileTest');
  const taggedValue = guaranteeNonNullable(pureEnum.taggedValues[0]);
  expect(taggedValue.value).toEqual('Enumeration Tag');
  expect(profile).toEqual(taggedValue.tag.value._OWNER);
  expect(profile).toEqual(pureEnum.stereotypes[0]?.value._OWNER);
});

test(unitTest('Class is loaded properly'), () => {
  const graph = graphManagerState.graph;
  const testClass = graph.getClass('ui::TestClass');
  const stereotype = guaranteeNonNullable(testClass.stereotypes[0]).value;
  expect(
    graph
      .getProfile(stereotype._OWNER.path)
      .p_stereotypes.find((s) => s.value === stereotype.value),
  ).toBeDefined();
  const personClass = graph.getClass('ui::test2::Person');
  const personWithoutConstraints = graph.getClass(
    'ui::test2::PersonWithoutConstraints',
  );
  expect(personClass.generalizations[0]?.value.rawType).toEqual(
    personWithoutConstraints,
  );
  expect(personClass.constraints.length).toBe(4);
  expect(personWithoutConstraints.derivedProperties.length).toBe(1);
  expect(
    personWithoutConstraints.derivedProperties[0]?.genericType.value.rawType,
  ).toEqual(PrimitiveType.STRING);
  const degree = personWithoutConstraints.properties.find(
    (property) =>
      property.genericType.value.rawType ===
      graph.getEnumeration('ui::test2::Degree'),
  );
  expect(degree).toBeDefined();
});

test(unitTest('Mapping is loaded properly'), () => {
  const graph = graphManagerState.graph;
  const simpleMapping = graph.getMapping('ui::testMapping');
  expect(simpleMapping.classMappings).toHaveLength(3);
  const targetClass = graph.getClass('ui::test1::Target_Something');
  const pureInstanceMapping = simpleMapping.classMappings.find(
    (classMapping) =>
      classMapping.id.value ===
      fromElementPathToMappingElementId(targetClass.path),
  ) as PureInstanceSetImplementation;
  expect(pureInstanceMapping).toBeDefined();
  expect(pureInstanceMapping.class.value).toEqual(targetClass);
  expect(pureInstanceMapping.srcClass?.value).toEqual(
    graph.getClass('ui::test1::Source_Something'),
  );
  expect(pureInstanceMapping.propertyMappings.length).toBe(3);
  const unionSetImpl = simpleMapping.classMappings.find(
    (p) => p.id.value === 'unionOfSomething',
  ) as OperationSetImplementation;
  expect(unionSetImpl).toBeDefined();
  expect(unionSetImpl.parameters.length).toBe(2);
  unionSetImpl.parameters.forEach((param) =>
    expect(param.setImplementation.value).toEqual(
      simpleMapping.classMappings.find(
        (classMapping) =>
          classMapping.id.value === param.setImplementation.value.id.value,
      ),
    ),
  );
});

test(unitTest('Mapping is loaded with auto mapped properties'), () => {
  const graph = graphManagerState.graph;
  const simpleMapping = graph.getMapping('ui::testAutoMapping');
  expect(simpleMapping.classMappings).toHaveLength(1);
  const targetClass = graph.getClass('ui::test2::Firm');
  const pureInstanceMapping = simpleMapping.classMappings.find(
    (classMapping) =>
      classMapping.id.value ===
      fromElementPathToMappingElementId(targetClass.path),
  ) as PureInstanceSetImplementation;
  expect(pureInstanceMapping).toBeDefined();
  expect(pureInstanceMapping.class.value).toEqual(targetClass);
  expect(pureInstanceMapping.srcClass?.value).toEqual(targetClass);
  expect(pureInstanceMapping.propertyMappings.length).toBe(2);
});

test(unitTest('Milestoning properties are generated for class'), () => {
  const graph = graphManagerState.graph;
  const testClass = graph.getClass('ui::testB');
  expect(testClass._generatedMilestonedProperties).toHaveLength(3);
});

test(unitTest('Milestoning properties are generated for association'), () => {
  const graph = graphManagerState.graph;
  const testClass = graph.getAssociation('ui::testC');
  expect(testClass._generatedMilestonedProperties).toHaveLength(3);
});

describe('UnknownElement', () => {
  beforeAll(async () => {
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__SimpleGraph as Entity[],
    );
  });

  test(unitTest('Loaded properly'), () => {
    const graph = graphManagerState.graph;
    const unknownElements = graph.allOwnElements.filter((element) =>
      isType(element, INTERNAL__UnknownElement),
    );
    expect(unknownElements.length).toBe(2);
  });

  test(
    unitTest('Excluded in grammar and continues to exist when converted back'),
    async () => {
      const graph = graphManagerState.graph;

      // Check if we are only sending known elements when converting to grammar

      const knownElementsOnly = graph.allOwnElements.filter(
        (element) => !isType(element, INTERNAL__UnknownElement),
      );

      jest
        .spyOn(AbstractServerClient.prototype, 'request')
        .mockImplementationOnce((method, url, data) => Promise.resolve(data));

      const elementsPayload =
        await graphManagerState.graphManager.graphToPureCode(graph, {
          excludeUnknown: true,
        });

      expect(
        (elementsPayload as unknown as { elements: [] }).elements.length,
      ).toBe(knownElementsOnly.length);

      // Check if UnknownElements exist in graph after converting back from grammar

      jest
        .spyOn(AbstractServerClient.prototype, 'request')
        .mockImplementationOnce(() => Promise.resolve(elementsPayload));

      await graphManagerState.graphManager.pureCodeToEntities('');

      const unknownElements = graph.allOwnElements.filter((element) =>
        isType(element, INTERNAL__UnknownElement),
      );

      expect(unknownElements.length).toBe(2);
    },
  );
});
