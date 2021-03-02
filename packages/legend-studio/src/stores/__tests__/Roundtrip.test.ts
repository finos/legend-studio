/**
 * Copyright 2020 Goldman Sachs
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

import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { unitTest } from '@finos/legend-studio-shared';
import {
  testAutoImportsWithSystemProfiles,
  simpleDebuggingCase,
  testAutoImportsWithAny,
} from '../__tests__/roundtrip/RoundtripTestData';
import m2mGraphEntities from './buildGraph/M2MGraphEntitiesTestData.json';
import {
  testClassRoundtrip,
  testEnumerationRoundtrip,
  testAssociationRoundtrip,
  testFunctionRoundtrip,
  testMeasureRoundtrip,
  testClassWithComplexConstraint,
} from '../__tests__/roundtrip/DomainRoundtripTestData';
import { testDiagramRoundtrip } from '../__tests__/roundtrip/DiagramRoundtripTestData';
import {
  testConnectionRoundtrip,
  testModelChainConnectionRoundtrip,
} from '../__tests__/roundtrip/ConnectionRoundtripTestdata';
import {
  testFileGenerationRoundtrip,
  testFileGenerationWithPackageSameAsSystemElement,
} from '../__tests__/roundtrip/FileGenerationRoundtripTestData';
import {
  testFlatDataRoundtrip,
  testFlatDataMappingRoundtrip,
  testFlatDataConnectionRoundtrip,
  testFlatDataInputDataRoundtrip,
  testFlatDataRoundtrip2,
  testEmbeddedFlatDataMappingRoundtrip,
} from '../__tests__/roundtrip/FlatDataRoundtripTestData';
import { testGenerationSpecificationRoundtrip } from '../__tests__/roundtrip/GenerationSpecificationTestData';
import {
  testDatabaseRoundtrip,
  testRelationalDatabaseConnectionRoundtrip,
  testDatabaseWithSelfJoin,
  simpleEmbeddedRelationalRoundtrip,
  multiLevelEmbeddedRelationalRoundtrip,
  testRelationalAssociationMapping,
} from '../__tests__/roundtrip/RelationalRoundtripTestData';
import { testServiceRoundtrip } from '../__tests__/roundtrip/ServiceRoundtripTestData';
import { testGraphFetchTreeRoundtrip } from '../__tests__/roundtrip/ValueSpecificationRoundtripTestData';
import { testMappingRoundtrip } from '../__tests__/roundtrip/MappingRoundtripTestData';
import { testRuntimeRoundtrip } from '../__tests__/roundtrip/RuntimeRoundtripTestData';
import { checkBuildingElementsRoundtrip } from '../StoreTestUtils';

test(unitTest('M2M graph roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(simpleDebuggingCase as Entity[]);
  await checkBuildingElementsRoundtrip(m2mGraphEntities as Entity[]);
});

test(unitTest('Auto-imports resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(
    testAutoImportsWithSystemProfiles as Entity[],
  );
  await checkBuildingElementsRoundtrip(testAutoImportsWithAny as Entity[]);
});

test(unitTest('Domain import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testClassRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(
    testClassWithComplexConstraint as Entity[],
  );
  await checkBuildingElementsRoundtrip(testEnumerationRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(testAssociationRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(testFunctionRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(testMeasureRoundtrip as Entity[]);
});

// TODO
test.skip(
  unitTest('Value specification import resolution roundtrip'),
  async () => {
    await checkBuildingElementsRoundtrip(
      testGraphFetchTreeRoundtrip as Entity[],
    );
  },
);

test(unitTest('Connection import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testConnectionRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(
    testModelChainConnectionRoundtrip as Entity[],
  );
  // TODO test post processor
});

test(unitTest('Mapping import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testMappingRoundtrip as Entity[]);
  // TODO? association mapping
});

test(unitTest('Runtime import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testRuntimeRoundtrip as Entity[]);
});

test(unitTest('Flat-data import resolution roundtrip'), async () => {
  // TODO: import resolution for included stores?
  await checkBuildingElementsRoundtrip(testFlatDataRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(testFlatDataRoundtrip2 as Entity[]);
  await checkBuildingElementsRoundtrip(
    testFlatDataMappingRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    testEmbeddedFlatDataMappingRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    testFlatDataConnectionRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    testFlatDataInputDataRoundtrip as Entity[],
  );
});

test(unitTest('Relational Mapping import resolution roundtrip'), async () => {
  // await testRoundtrip(testRelationalMappingRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(
    simpleEmbeddedRelationalRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    multiLevelEmbeddedRelationalRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    testRelationalDatabaseConnectionRoundtrip as Entity[],
  );
  await checkBuildingElementsRoundtrip(
    testRelationalAssociationMapping as Entity[],
  );
  // await testRoundtrip(testRelationalInputData as Entity[]);
  // await testRoundtrip(targetSetImplementationThroughAssociation as Entity[]);
});

test(unitTest('Relational Database import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testDatabaseRoundtrip as Entity[]);
  // TODO test milestoning
  await checkBuildingElementsRoundtrip(testDatabaseWithSelfJoin as Entity[]);
});

test(unitTest('File generation import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testFileGenerationRoundtrip as Entity[]);
  await checkBuildingElementsRoundtrip(
    testFileGenerationWithPackageSameAsSystemElement as Entity[],
  );
});

test(
  unitTest('Generation specification import resolution roundtrip'),
  async () => {
    await checkBuildingElementsRoundtrip(
      testGenerationSpecificationRoundtrip as Entity[],
    );
  },
);

test(unitTest('Diagram import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testDiagramRoundtrip as Entity[]);
});

test(unitTest('Service import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(testServiceRoundtrip as Entity[]);
});
