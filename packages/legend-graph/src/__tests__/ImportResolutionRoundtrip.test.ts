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

import { unitTest } from '@finos/legend-shared';
import {
  TEST_DATA__AutoImportsWithSystemProfiles,
  TEST_DATA__simpleDebuggingCase,
  TEST_DATA__AutoImportsWithAny,
} from './roundtrip/RoundtripTestData';
import TEST_DATA__m2mGraphEntities from './buildGraph/TEST_DATA__M2MGraphEntities.json';
import {
  TEST_DATA__ClassRoundtrip,
  TEST_DATA__EnumerationRoundtrip,
  TEST_DATA__AssociationRoundtrip,
  TEST_DATA__FunctionRoundtrip,
  TEST_DATA__MeasureRoundtrip,
  TEST_DATA__ClassWithComplexConstraint,
} from './roundtrip/DomainRoundtripTestData';
import { TEST_DATA__DiagramRoundtrip } from './roundtrip/DiagramRoundtripTestData';
import {
  testConnectionRoundtrip,
  testModelChainConnectionRoundtrip,
} from './roundtrip/ConnectionRoundtripTestdata';
import {
  TEST_DATA__FileGenerationRoundtrip,
  TEST_DATA__FileGenerationWithPackageSameAsSystemElement,
} from './roundtrip/FileGenerationRoundtripTestData';
import {
  TEST_DATA__FlatDataRoundtrip,
  TEST_DATA__FlatDataMappingRoundtrip,
  TEST_DATA__FlatDataConnectionRoundtrip,
  TEST_DATA__FlatDataInputDataRoundtrip,
  TEST_DATA__FlatDataRoundtrip2,
  TEST_DATA__EmbeddedFlatDataMappingRoundtrip,
} from './roundtrip/FlatDataRoundtripTestData';
import { TEST_DATA__GenerationSpecificationRoundtrip } from './roundtrip/GenerationSpecificationTestData';
import {
  TEST_DATA__DatabaseRoundtrip,
  TEST_DATA__RelationalDatabaseConnectionRoundtrip,
  TEST_DATA__DatabaseWithSelfJoin,
  TEST_DATA__simpleEmbeddedRelationalRoundtrip,
  TEST_DATA__multiLevelEmbeddedRelationalRoundtrip,
  TEST_DATA__RelationalAssociationMapping,
  TEST_DATA__XStoreAssociationMapping,
} from './roundtrip/RelationalRoundtripTestData';
import { TEST_DATA__ServiceRoundtrip } from './roundtrip/ServiceRoundtripTestData';
import {
  TEST_DATA__AggregationAwareMappingRoundtrip,
  TEST_DATA__MappingRoundtrip,
  TEST_DATA__LocalPropertyMapping,
} from './roundtrip/MappingRoundtripTestData';
import { TEST_DATA__RuntimeRoundtrip } from './roundtrip/RuntimeRoundtripTestData';
import { TEST__checkBuildingElementsRoundtrip } from '../GraphManagerTestUtils';

describe(unitTest('M2M graph roundtrip'), () => {
  test.each([
    ['Simple M2M (debugging case)', TEST_DATA__simpleDebuggingCase],
    ['Complex M2M', TEST_DATA__m2mGraphEntities],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Auto-imports resolution roundtrip'), () => {
  test.each([
    ['System profiles', TEST_DATA__AutoImportsWithSystemProfiles],
    [`'Any' type`, TEST_DATA__AutoImportsWithAny],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Domain import resolution roundtrip'), () => {
  test.each([
    ['Class', TEST_DATA__ClassRoundtrip],
    ['Class with complex constraint', TEST_DATA__ClassWithComplexConstraint],
    ['Enumeration', TEST_DATA__EnumerationRoundtrip],
    ['Association', TEST_DATA__AssociationRoundtrip],
    ['Function', TEST_DATA__FunctionRoundtrip],
    ['Measure', TEST_DATA__MeasureRoundtrip],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Connection import resolution roundtrip'), () => {
  test.each([
    ['Simple connection', testConnectionRoundtrip],
    ['Model chain connection', testModelChainConnectionRoundtrip],
    // TODO test post processor
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Runtime import resolution roundtrip'), () => {
  test.each([['Simple runtime', TEST_DATA__RuntimeRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    },
  );
});

describe(unitTest('Mapping import resolution roundtrip'), () => {
  test.each([
    ['M2M mapping', TEST_DATA__MappingRoundtrip],
    // TODO? association mapping
    ['Aggregation-aware mapping', TEST_DATA__AggregationAwareMappingRoundtrip],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Flat-data import resolution roundtrip'), () => {
  test.each([
    // TODO: import resolution for included stores?
    ['Simple flat-data store', TEST_DATA__FlatDataRoundtrip],
    ['Complex flat-data store', TEST_DATA__FlatDataRoundtrip2],
    ['Flat-data mapping', TEST_DATA__FlatDataMappingRoundtrip],
    ['Flat-data embedded mapping', TEST_DATA__EmbeddedFlatDataMappingRoundtrip],
    ['Flat-data connection', TEST_DATA__FlatDataConnectionRoundtrip],
    [
      'Flat-data mapping test input data',
      TEST_DATA__FlatDataInputDataRoundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Relational import resolution roundtrip'), () => {
  test.each([
    // TODO: import resolution for included stores?
    ['Complex database with includes', TEST_DATA__DatabaseRoundtrip],
    ['Database with self join', TEST_DATA__DatabaseWithSelfJoin],
    // testRelationalInputData
    // targetSetImplementationThroughAssociation
    [
      'Relational embedded mapping',
      TEST_DATA__simpleEmbeddedRelationalRoundtrip,
    ],
    [
      'Relational nested embedded mappings',
      TEST_DATA__multiLevelEmbeddedRelationalRoundtrip,
    ],
    ['Relational association mapping', TEST_DATA__RelationalAssociationMapping],
    ['XStore association mapping', TEST_DATA__XStoreAssociationMapping],
    ['Local property mapping', TEST_DATA__LocalPropertyMapping],
    [
      'Relational database connection',
      TEST_DATA__RelationalDatabaseConnectionRoundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(
  unitTest('Generation specification import resolution roundtrip'),
  () => {
    test.each([
      [
        'Simple generation specification',
        TEST_DATA__GenerationSpecificationRoundtrip,
      ],
    ])('%s', async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    });
  },
);

describe(
  unitTest('File generation specification import resolution roundtrip'),
  () => {
    test.each([
      ['Simple specification', TEST_DATA__FileGenerationRoundtrip],
      [
        'Specification with package same as system element',
        TEST_DATA__FileGenerationWithPackageSameAsSystemElement,
      ],
    ])('%s', async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    });
  },
);

describe(unitTest('Diagram import resolution roundtrip'), () => {
  test.each([['Simple diagram specification', TEST_DATA__DiagramRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    },
  );
});

describe(unitTest('Service import resolution roundtrip'), () => {
  test.each([['Simple service', TEST_DATA__ServiceRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    },
  );
});
