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
import { ApplicationStore } from 'Stores/ApplicationStore';
import { EditorStore } from 'Stores/EditorStore';
import { Entity } from 'SDLC/entity/Entity';
import { unit } from 'Utilities/TestUtil';
import { createBrowserHistory } from 'history';
import { testAutoImportsWithSystemProfiles, simpleDebuggingCase, testAutoImportsWithAny } from 'Stores/__tests__/roundtrip/RoundtripTestData';
import completeGraphEntities from './buildGraph/CompleteGraphEntitiesTestData.json';
import { testClassRoundtrip, testEnumerationRoundtrip, testAssociationRoundtrip, testFunctionRoundtrip, testMeasureRoundtrip } from 'Stores/__tests__/roundtrip/DomainRoundtripTestData';
import { testDiagramRoundtrip } from 'Stores/__tests__/roundtrip/DiagramRoundtripTestData';
import { testConnectionRoundtrip } from 'Stores/__tests__/roundtrip/ConnectionRoundtripTestdata';
import { testFileGenerationRoundtrip } from 'Stores/__tests__/roundtrip/FileGenerationRoundtripTestData';
import { testGraphFetchTreeRoundtrip } from 'Stores/__tests__/roundtrip/ValueSpecificationRoundtripTestData';
import { testMappingRoundtrip } from 'Stores/__tests__/roundtrip/MappingRoundtripTestData';
import { testRuntimeRoundtrip } from 'Stores/__tests__/roundtrip/RuntimeRoundtripTestData';
import { EntityChangeType } from 'SDLC/entity/EntityChange';
import { testTextRoundtrip } from 'Stores/__tests__/roundtrip/TextRoundtripTestData';
import { graphModelDataToEntities } from 'MM/AbstractPureGraphManager';

const testRoundtrip = async (entities: Entity[]): Promise<void> => {
  const editorStore = new EditorStore(new ApplicationStore(createBrowserHistory()));
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.build(editorStore.graphState.graph, entities, { TEMP_retainSection: true });
  const transformedEntities = graphModelDataToEntities(editorStore.graphState.graphManager, editorStore.graphState.getBasicGraphModelData());
  // NOTE: leave this here for debugging purpose
  for (const entity of transformedEntities) {
    expect(entity).toEqual(entities.find(e => entity.path === e.path));
  }
  expect(transformedEntities).toIncludeSameMembers(entities);
  // Check hash
  await editorStore.graphState.graph.precomputeHashes();
  const protocolHashesIndex = (await editorStore.graphState.graphManager.getHashInfoAndModelDataFromEntities(entities))[0];
  await editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(protocolHashesIndex);
  await editorStore.changeDetectionState.computeLocalChanges(true);
  // WIP: avoid listing section index as part of change detection for now
  expect(editorStore.changeDetectionState.workspaceLatestRevisionState.changes.filter(change => change.entityChangeType !== EntityChangeType.DELETE || change.oldPath !== '__internal__::SectionIndex').length).toBe(0);
};

test(unit('Complete graph roundtrip'), async () => {
  await testRoundtrip(completeGraphEntities as Entity[]);
  await testRoundtrip(simpleDebuggingCase as Entity[]);
});

test(unit('Auto-imports resolution roundtrip'), async () => {
  await testRoundtrip(testAutoImportsWithSystemProfiles as Entity[]);
  await testRoundtrip(testAutoImportsWithAny as Entity[]);
});

test(unit('Domain import resolution roundtrip'), async () => {
  await testRoundtrip(testClassRoundtrip as Entity[]);
  await testRoundtrip(testEnumerationRoundtrip as Entity[]);
  await testRoundtrip(testAssociationRoundtrip as Entity[]);
  await testRoundtrip(testFunctionRoundtrip as Entity[]);
  await testRoundtrip(testMeasureRoundtrip as Entity[]);
});

// TODO
test.skip(unit('Value specification import resolution roundtrip'), async () => {
  await testRoundtrip(testGraphFetchTreeRoundtrip as Entity[]);
});

test(unit('Connection import resolution roundtrip'), async () => {
  await testRoundtrip(testConnectionRoundtrip as Entity[]);
});

test(unit('Mapping import resolution roundtrip'), async () => {
  await testRoundtrip(testMappingRoundtrip as Entity[]);
  // TODO? association mapping
});

test(unit('Runtime import resolution roundtrip'), async () => {
  await testRoundtrip(testRuntimeRoundtrip as Entity[]);
});

test(unit('File generation import resolution roundtrip'), async () => {
  await testRoundtrip(testFileGenerationRoundtrip as Entity[]);
});

test(unit('Diagram import resolution roundtrip'), async () => {
  await testRoundtrip(testDiagramRoundtrip as Entity[]);
});

test(unit('Text import resolution roundtrip'), async () => {
  await testRoundtrip(testTextRoundtrip as Entity[]);
});
