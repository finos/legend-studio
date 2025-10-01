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

import { test, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST_DATA__AutoImportsWithSystemProfiles,
  TEST_DATA__simpleDebuggingCase,
  TEST_DATA__AutoImportsWithAny,
} from './roundtripTestData/TEST_DATA__GenericRoundtrip.js';
import TEST_DATA__m2mGraphEntities from './buildGraph/TEST_DATA__M2MGraphEntities.json' with { type: 'json' };
import {
  TEST_DATA__ClassRoundtrip,
  TEST_DATA__EnumerationRoundtrip,
  TEST_DATA__AssociationRoundtrip,
  TEST_DATA__FunctionRoundtrip,
  TEST_DATA__MeasureRoundtrip,
  TEST_DATA__ClassWithComplexConstraint,
  TEST_DATA__OverloadedFunctionsRoundtrip,
} from './roundtripTestData/TEST_DATA__DomainRoundtrip.js';
import {
  testConnectionRoundtrip,
  testModelChainConnectionRoundtrip,
} from './roundtripTestData/TEST_DATA__ConnectionRoundtrip.js';
import {
  TEST_DATA__FileGenerationRoundtrip,
  TEST_DATA__FileGenerationWithPackageSameAsSystemElement,
} from './roundtripTestData/TEST_DATA__FileGenerationRoundtrip.js';
import {
  TEST_DATA__FlatDataRoundtrip,
  TEST_DATA__FlatDataMappingRoundtrip,
  TEST_DATA__FlatDataConnectionRoundtrip,
  TEST_DATA__FlatDataInputDataRoundtrip,
  TEST_DATA__FlatDataRoundtrip2,
  TEST_DATA__EmbeddedFlatDataMappingRoundtrip,
  TEST_DATA__FlatDataAssociationMapping,
} from './roundtripTestData/TEST_DATA__FlatDataRoundtrip.js';
import { TEST_DATA__GenerationSpecificationRoundtrip } from './roundtripTestData/TEST_DATA__GenerationSpecification.js';
import {
  TEST_DATA__DatabaseRoundtrip,
  TEST_DATA__RelationalDatabaseConnectionRoundtrip,
  TEST_DATA__DatabaseWithSelfJoin,
  TEST_DATA__simpleEmbeddedRelationalRoundtrip,
  TEST_DATA__multiLevelEmbeddedRelationalRoundtrip,
  TEST_DATA__RelationalAssociationMapping,
  TEST_DATA__XStoreAssociationMapping,
} from './roundtripTestData/TEST_DATA__RelationalRoundtrip.js';
import {
  TEST_DATA__SERVICE_WITH_ONLY_QUERY_Roundtrip,
  TEST_DATA__ServiceRoundtrip,
} from './roundtripTestData/TEST_DATA__ServiceRoundtrip.js';
import {
  TEST_DATA__AggregationAwareMappingRoundtrip,
  TEST_DATA__Relational_LocalPropertyMappingRoundtrip,
  TEST_DATA__MappingRoundtrip,
  TEST_DATA__LocalPropertyMapping,
  TEST_DATA__MappingTestSuiteRoundtrip,
  TEST_DATA__MappingOtherwisePropertyRoundtrip,
} from './roundtripTestData/TEST_DATA__MappingRoundtrip.js';
import { TEST_DATA__RuntimeRoundtrip } from './roundtripTestData/TEST_DATA__RuntimeRoundtrip.js';
import { TEST__checkBuildingElementsRoundtrip } from '../__test-utils__/GraphManagerTestUtils.js';
import { TEST_DATA__DataRoundtrip } from './roundtripTestData/TEST_DATA__DataRoundtrip.js';
import {
  TEST_DATA__DATAPRODUCT__MODEL_ACCESS_GROUPS,
  TEST_DATA__DATAPRODUCT_DELIVERY,
  TEST_DATA__DATAPRODUCT_GROUPS,
  TEST_DATA__DATAPRODUCT__INCLUDE,
} from './roundtripTestData/TEST_DATA__DataProductRoundtrip.js';
import { TEST_DATA__Function_genericType } from './roundtripTestData/TEST_DATA__Function-generictype.js';

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
    [
      'Overloaded functions import resolution roundtrip',
      TEST_DATA__OverloadedFunctionsRoundtrip,
    ],
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
    [
      'Relational mapping with local property',
      TEST_DATA__Relational_LocalPropertyMappingRoundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

// TODO: Readd once mapping test suite model is finalized
describe(unitTest('Mapping test suite roundtrip'), () => {
  test.skip.each([
    ['mapping test suite', TEST_DATA__MappingTestSuiteRoundtrip],
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
    ['Flat-data association mapping', TEST_DATA__FlatDataAssociationMapping],
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
    [
      'Relational otherwise embedded mapping',
      TEST_DATA__MappingOtherwisePropertyRoundtrip,
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

describe(unitTest('Service import resolution roundtrip'), () => {
  test.each([
    ['Simple service', TEST_DATA__ServiceRoundtrip],
    [
      'Relational service with only query and no mapping and runtime',
      TEST_DATA__SERVICE_WITH_ONLY_QUERY_Roundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('DSL Data import resolution roundtrip'), () => {
  test.each([['Simple data', TEST_DATA__DataRoundtrip]])(
    '%s',
    async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    },
  );
});

describe(unitTest('DSL Data product'), () => {
  test.each([
    ['DSL Data Product', TEST_DATA__DATAPRODUCT_DELIVERY],
    ['DSL Data Product Groups', TEST_DATA__DATAPRODUCT_GROUPS],
    [
      'DSL Data Model Access Groups',
      TEST_DATA__DATAPRODUCT__MODEL_ACCESS_GROUPS,
    ],
    ['DSL Include Data Product', TEST_DATA__DATAPRODUCT__INCLUDE],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities);
  });
});

describe(unitTest('Function Generic Type'), () => {
  test.each([['Function generic type', TEST_DATA__Function_genericType]])(
    '%s',
    async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities);
    },
  );
});
