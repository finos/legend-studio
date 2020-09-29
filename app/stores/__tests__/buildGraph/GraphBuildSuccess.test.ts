/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import 'jest-extended';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { ApplicationStore } from 'Stores/ApplicationStore';
import { EditorStore } from 'Stores/EditorStore';
import completeGraphEntities from './CompleteGraphEntitiesTestData.json';
import { Entity } from 'SDLC/entity/Entity';
import { PRIMITIVE_TYPE } from 'MetaModelConst';
import { fromElementPathToMappingElementId } from 'MetaModelUtility';
import { classHasCycle, createMockClassInstance } from 'Utilities/MockDataUtil';
import { unit } from 'Utilities/TestUtil';
import { createBrowserHistory } from 'history';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { Enum } from 'MM/model/packageableElements/domain/Enum';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { getClassiferPathFromType } from 'MM/model/packageableElements/PackageableElement';

const applicationStore = new ApplicationStore(createBrowserHistory());
const editorStore = new EditorStore(applicationStore);

beforeAll(async () => {
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, completeGraphEntities as Entity[]);
});

test(unit('Graph has been initialized properly'), () => {
  const graph = editorStore.graphState.graph;
  expect(graph.isBuilt).toBeTruthy();
  expect(Array.from(editorStore.graphState.coreModel.multiplicitiesIndex.values()).length).toBeGreaterThan(0);
  Object.values(PRIMITIVE_TYPE).forEach(primitiveType => expect(graph.getPrimitiveType(primitiveType)).toBeDefined());
});

test(unit('Enumeration is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const pureEnum = graph.getEnumeration('model::producers::operations::contractFactory::latest2x::trading::contract::terms::com::DisruptionFallback');
  expect(pureEnum.values).toHaveLength(8);
  pureEnum.values.forEach(val => expect(val instanceof Enum).toBeTruthy());
  const profile = graph.getProfile('ui::meta::pure::profiles::doc');
  const taggedValue = pureEnum.taggedValues[0];
  expect(taggedValue.value).toEqual('This is a tagged Value Description');
  expect(profile).toEqual(taggedValue.tag.value.owner);
  const testProductClass = graph.getClass('ui::meta::pure::mapping::modelToModel::test::milestoning::TestProduct');
  const stereotype = testProductClass.stereotypes[0].value;
  const targetStereotype = graph.getProfile(stereotype.owner.path).stereotypes.find(s => s.value === stereotype.value);
  expect(targetStereotype).toBeDefined();
});

test(unit('Class is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const testProductClass = graph.getClass('ui::meta::pure::mapping::modelToModel::test::milestoning::TestProduct');
  const stereotype = testProductClass.stereotypes[0].value;
  expect(graph.getProfile(stereotype.owner.path).stereotypes.find(s => s.value === stereotype.value)).toBeDefined();
  const personClass = graph.getClass('ui::meta::pure::constraints::tests::model::Person');
  const personWithoutConstraints = graph.getClass('ui::meta::pure::constraints::tests::model::PersonWithoutConstraints');
  expect(personClass.generalizations[0].value.rawType).toEqual(personWithoutConstraints);
  expect(personClass.constraints.length).toBe(4);
  expect(personWithoutConstraints.derivedProperties.length).toBe(1);
  expect(personWithoutConstraints.derivedProperties[0].genericType.value.rawType).toEqual(graph.getPrimitiveType(PRIMITIVE_TYPE.STRING));
  const degree = personWithoutConstraints.properties.find(property => property.genericType.value.rawType === graph.getEnumeration('ui::meta::pure::constraints::tests::model::Degree'));
  expect(degree).toBeDefined();
});

test(unit('Mapping is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const simpleMapping = graph.getMapping('ui::mapping::testMapping');
  expect(simpleMapping.classMappings).toHaveLength(3);
  const targetClass = graph.getClass('ui::mapping::editor::domain::Target_Something');
  const pureInstanceMapping = simpleMapping.classMappings.find(classMapping => classMapping.id.value === fromElementPathToMappingElementId(targetClass.path)) as PureInstanceSetImplementation;
  expect(pureInstanceMapping).toBeDefined();
  expect(pureInstanceMapping.class.value).toEqual(targetClass);
  expect(pureInstanceMapping.srcClass.value).toEqual(graph.getClass('ui::mapping::editor::domain::Source_Something'));
  expect(pureInstanceMapping.propertyMappings.length).toBe(3);
  const unionSetImpl = simpleMapping.classMappings.find(p => p.id.value === 'unionOfSomething') as OperationSetImplementation;
  expect(unionSetImpl).toBeDefined();
  expect(unionSetImpl.parameters.length).toBe(2);
  unionSetImpl.parameters.forEach(param => expect(param.setImplementation.value).toEqual(simpleMapping.classMappings.find(classMapping => classMapping.id.value === param.setImplementation.value.id.value)));
});

test(unit('Diagram is loaded properly'), () => {
  const graph = editorStore.graphState.graph;
  const assertClassInGraph = (_class: Class): void => expect(_class).toEqual(graph.getClass(_class.path));
  const simpleDiagram = graph.getDiagram('ui::testDiagram');
  expect(simpleDiagram.classViews).toHaveLength(4);
  expect(simpleDiagram.generalizationViews).toHaveLength(2);
  expect(simpleDiagram.propertyViews).toHaveLength(2);
  simpleDiagram.classViews.forEach(classView => assertClassInGraph(classView.class.value));
  simpleDiagram.propertyViews.forEach(propertyView => {
    assertClassInGraph(propertyView.from.classView.value.class.value);
    assertClassInGraph(propertyView.to.classView.value.class.value);
  });
  simpleDiagram.generalizationViews.forEach(generationView => {
    assertClassInGraph(generationView.from.classView.value.class.value);
    assertClassInGraph(generationView.to.classView.value.class.value);
  });
});

test(unit('Class with hierarchy cycle is detected'), () => {
  const cycledComplexClass = editorStore.graphState.graph.getClass('ui::meta::pure::mapping::modelToModel::test::shared::src::Application');
  const nonComplexStyleClass = editorStore.graphState.graph.getClass('ui::meta::pure::mapping::modelToModel::test::shared::src::Membership');
  const simpleClass = editorStore.graphState.graph.getClass('ui::meta::pure::mapping::modelToModel::test::shared::src::Address');
  expect(classHasCycle(cycledComplexClass, true, new Set<string>())).toBeTrue();
  expect(classHasCycle(nonComplexStyleClass, true, new Set<string>())).toBeFalse();
  expect(classHasCycle(simpleClass, true, new Set<string>())).toBeFalse();
});

test(unit('Test mock data with a cycled class'), () => {
  const applicationClass = editorStore.graphState.graph.getClass('ui::meta::pure::mapping::modelToModel::test::shared::src::Application');
  const applicationInstance = createMockClassInstance(applicationClass, true, 3);
  // 1st level
  const applicationKeys = ['applicant', 'employee', 'previousEmployeer'];
  expect(applicationInstance).toContainAllKeys(applicationKeys);
  const applicantInstance = (applicationInstance as { applicant: Record<PropertyKey, unknown> }).applicant;
  // 2nd level
  expect(applicantInstance).toContainKeys(['userName', 'previousApplication', 'password', 'firstName', 'dateOfBirth']);
  const secondApplicationInstance = (applicantInstance as { previousApplication: Record<PropertyKey, unknown> }).previousApplication;
  expect(secondApplicationInstance).toContainAllKeys(applicationKeys);
  // 3rd level
  const secondApplicantInstance = (secondApplicationInstance as { applicant: Record<PropertyKey, unknown> }).applicant;
  expect(secondApplicantInstance).toContainKeys(['userName', 'password', 'firstName', 'dateOfBirth']);
  // should not continue on to next depth
  expect(secondApplicantInstance).not.toContain('previousApplication');
});

test(unit('Test element types'), () => {
  const elements = editorStore.graphState.graph.allElements;
  elements.forEach(element => {
    expect(getClassiferPathFromType(getPackageableElementType(element))).toEqual(getClassiferPathFromType(getPackageableElementType(element)));
  });
});
