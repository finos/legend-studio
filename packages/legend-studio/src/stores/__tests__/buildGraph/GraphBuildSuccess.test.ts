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

import m2mGraphEntities from './M2MGraphEntitiesTestData.json';
import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import { PRIMITIVE_TYPE } from '../../../models/MetaModelConst';
import { fromElementPathToMappingElementId } from '../../../models/MetaModelUtils';
import { unitTest } from '@finos/legend-studio-shared';
import { buildGraphBasic, getTestEditorStore } from '../../StoreTestUtils';
import type { PureInstanceSetImplementation } from '../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import type { OperationSetImplementation } from '../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { Enum } from '../../../models/metamodels/pure/model/packageableElements/domain/Enum';
import type { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await buildGraphBasic(m2mGraphEntities as Entity[], editorStore);
});

test(unitTest('Graph has been initialized properly'), () => {
  const graph = editorStore.graphState.graph;
  expect(graph.buildState.hasSucceeded).toBeTruthy();
  expect(
    Array.from(editorStore.graphState.coreModel.multiplicitiesIndex.values())
      .length,
  ).toBeGreaterThan(0);
  Object.values(PRIMITIVE_TYPE).forEach((primitiveType) =>
    expect(graph.getPrimitiveType(primitiveType)).toBeDefined(),
  );
});

test(unitTest('Enumeration is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const pureEnum = graph.getEnumeration('ui::TestEnumeration');
  expect(pureEnum.values).toHaveLength(3);
  pureEnum.values.forEach((val) => expect(val instanceof Enum).toBeTruthy());
  const profile = graph.getProfile('ui::test1::ProfileTest');
  const taggedValue = pureEnum.taggedValues[0];
  expect(taggedValue.value).toEqual('Enumeration Tag');
  expect(profile).toEqual(taggedValue.tag.value.owner);
  const stereotype = pureEnum.stereotypes[0].value;
  expect(profile).toEqual(stereotype.owner);
});

test(unitTest('Class is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const testClass = graph.getClass('ui::TestClass');
  const stereotype = testClass.stereotypes[0].value;
  expect(
    graph
      .getProfile(stereotype.owner.path)
      .stereotypes.find((s) => s.value === stereotype.value),
  ).toBeDefined();
  const personClass = graph.getClass('ui::test2::Person');
  const personWithoutConstraints = graph.getClass(
    'ui::test2::PersonWithoutConstraints',
  );
  expect(personClass.generalizations[0].value.rawType).toEqual(
    personWithoutConstraints,
  );
  expect(personClass.constraints.length).toBe(4);
  expect(personWithoutConstraints.derivedProperties.length).toBe(1);
  expect(
    personWithoutConstraints.derivedProperties[0].genericType.value.rawType,
  ).toEqual(graph.getPrimitiveType(PRIMITIVE_TYPE.STRING));
  const degree = personWithoutConstraints.properties.find(
    (property) =>
      property.genericType.value.rawType ===
      graph.getEnumeration('ui::test2::Degree'),
  );
  expect(degree).toBeDefined();
});

test(unitTest('Mapping is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
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
  expect(pureInstanceMapping.srcClass.value).toEqual(
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

test(unitTest('Diagram is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const assertClassInGraph = (_class: Class): void =>
    expect(_class).toEqual(graph.getClass(_class.path));
  const simpleDiagram = graph.getDiagram('ui::testDiagram');
  expect(simpleDiagram.classViews).toHaveLength(4);
  expect(simpleDiagram.generalizationViews).toHaveLength(2);
  expect(simpleDiagram.propertyViews).toHaveLength(2);
  simpleDiagram.classViews.forEach((classView) =>
    assertClassInGraph(classView.class.value),
  );
  simpleDiagram.propertyViews.forEach((propertyView) => {
    assertClassInGraph(propertyView.from.classView.value.class.value);
    assertClassInGraph(propertyView.to.classView.value.class.value);
  });
  simpleDiagram.generalizationViews.forEach((generationView) => {
    assertClassInGraph(generationView.from.classView.value.class.value);
    assertClassInGraph(generationView.to.classView.value.class.value);
  });
});
