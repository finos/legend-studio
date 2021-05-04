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

import { unitTest } from '@finos/legend-studio-shared';
import {
  testAutoImportsWithSystemProfiles,
  simpleDebuggingCase,
  testAutoImportsWithAny,
} from './roundtrip/RoundtripTestData';
import m2mGraphEntities from './buildGraph/M2MGraphEntitiesTestData.json';
import {
  testClassRoundtrip,
  testEnumerationRoundtrip,
  testAssociationRoundtrip,
  testFunctionRoundtrip,
  testMeasureRoundtrip,
  testClassWithComplexConstraint,
} from './roundtrip/DomainRoundtripTestData';
import { testDiagramRoundtrip } from './roundtrip/DiagramRoundtripTestData';
import {
  testConnectionRoundtrip,
  testModelChainConnectionRoundtrip,
} from './roundtrip/ConnectionRoundtripTestdata';
import {
  testFileGenerationRoundtrip,
  testFileGenerationWithPackageSameAsSystemElement,
} from './roundtrip/FileGenerationRoundtripTestData';
import {
  testFlatDataRoundtrip,
  testFlatDataMappingRoundtrip,
  testFlatDataConnectionRoundtrip,
  testFlatDataInputDataRoundtrip,
  testFlatDataRoundtrip2,
  testEmbeddedFlatDataMappingRoundtrip,
} from './roundtrip/FlatDataRoundtripTestData';
import { testGenerationSpecificationRoundtrip } from './roundtrip/GenerationSpecificationTestData';
import {
  testDatabaseRoundtrip,
  testRelationalDatabaseConnectionRoundtrip,
  testDatabaseWithSelfJoin,
  simpleEmbeddedRelationalRoundtrip,
  multiLevelEmbeddedRelationalRoundtrip,
  testRelationalAssociationMapping,
  testXStoreAssociationMapping,
} from './roundtrip/RelationalRoundtripTestData';
import { testServiceRoundtrip } from './roundtrip/ServiceRoundtripTestData';
import {
  testAggregationAwareMappingRoundtrip,
  testMappingRoundtrip,
  testLocalPropertyMapping,
} from './roundtrip/MappingRoundtripTestData';
import { testRuntimeRoundtrip } from './roundtrip/RuntimeRoundtripTestData';
import { checkBuildingElementsRoundtrip } from '../StoreTestUtils';

describe(unitTest('M2M graph roundtrip'), () => {
  test.each([
    ['Simple M2M (debugging case)', simpleDebuggingCase],
    ['Complex M2M', m2mGraphEntities],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Auto-imports resolution roundtrip'), () => {
  test.each([
    ['System profiles', testAutoImportsWithSystemProfiles],
    [`'Any' type`, testAutoImportsWithAny],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Domain import resolution roundtrip'), () => {
  test.each([
    ['Class', testClassRoundtrip],
    ['Class with complex constraint', testClassWithComplexConstraint],
    ['Enumeration', testEnumerationRoundtrip],
    ['Association', testAssociationRoundtrip],
    ['Function', testFunctionRoundtrip],
    ['Measure', testMeasureRoundtrip],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Connection import resolution roundtrip'), () => {
  test.each([
    ['Simple connection', testConnectionRoundtrip],
    ['Model chain connection', testModelChainConnectionRoundtrip],
    // TODO test post processor
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Runtime import resolution roundtrip'), () => {
  test.each([['Simple runtime', testRuntimeRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await checkBuildingElementsRoundtrip(entities);
    },
  );
});

describe(unitTest('Mapping import resolution roundtrip'), () => {
  test.each([
    ['M2M mapping', testMappingRoundtrip],
    // TODO? association mapping
    ['Aggregation-aware mapping', testAggregationAwareMappingRoundtrip],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Flat-data import resolution roundtrip'), () => {
  test.each([
    // TODO: import resolution for included stores?
    ['Simple flat-data store', testFlatDataRoundtrip],
    ['Complex flat-data store', testFlatDataRoundtrip2],
    ['Flat-data mapping', testFlatDataMappingRoundtrip],
    ['Flat-data embedded mapping', testEmbeddedFlatDataMappingRoundtrip],
    ['Flat-data connection', testFlatDataConnectionRoundtrip],
    ['Flat-data mapping test input data', testFlatDataInputDataRoundtrip],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Relational import resolution roundtrip'), () => {
  test.each([
    // TODO: import resolution for included stores?
    ['Simple database', testDatabaseRoundtrip],
    ['Database with self join', testDatabaseWithSelfJoin],
    // testRelationalInputData
    // targetSetImplementationThroughAssociation
    ['Relational embedded mapping', simpleEmbeddedRelationalRoundtrip],
    [
      'Relational nested embedded mappings',
      multiLevelEmbeddedRelationalRoundtrip,
    ],
    ['Relational association mapping', testRelationalAssociationMapping],
    ['XStore association mapping', testXStoreAssociationMapping],
    ['Local property mapping', testLocalPropertyMapping],
    [
      'Relational database connection',
      testRelationalDatabaseConnectionRoundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await checkBuildingElementsRoundtrip(entities);
  });
});

describe(
  unitTest('Generation specification import resolution roundtrip'),
  () => {
    test.each([
      ['Simple generation specification', testGenerationSpecificationRoundtrip],
    ])('%s', async (testName, entities) => {
      await checkBuildingElementsRoundtrip(entities);
    });
  },
);

describe(
  unitTest('File generation specification import resolution roundtrip'),
  () => {
    test.each([
      ['Simple specification', testFileGenerationRoundtrip],
      [
        'Specification with package same as system element',
        testFileGenerationWithPackageSameAsSystemElement,
      ],
    ])('%s', async (testName, entities) => {
      await checkBuildingElementsRoundtrip(entities);
    });
  },
);

describe(unitTest('Diagram import resolution roundtrip'), () => {
  test.each([['Simple diagram specification', testDiagramRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await checkBuildingElementsRoundtrip(entities);
    },
  );
});

describe(unitTest('Service import resolution roundtrip'), () => {
  test.each([['Simple service', testServiceRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await checkBuildingElementsRoundtrip(entities);
    },
  );
});
