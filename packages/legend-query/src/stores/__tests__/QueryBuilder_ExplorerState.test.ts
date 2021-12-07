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

import TEST_DATA__ComplexM2MModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json';
import { integrationTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import type {
  AbstractProperty,
  GraphManagerState,
  Mapping,
} from '@finos/legend-graph';
import { Class } from '@finos/legend-graph';
import type { QueryBuilderPropertyMappingData } from '../../stores/QueryBuilderExplorerState';
import {
  getPropertyNodeMappingData,
  getRootMappingData,
} from '../../stores/QueryBuilderExplorerState';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager';
import { Query_GraphPreset } from '../../models/Query_GraphPreset';
import { TEST__provideMockedLegendQueryStore } from '../../components/QueryComponentTestUtils';
import { flowResult } from 'mobx';
import {
  TEST_DATA__Auto_M2M,
  TEST_DATA__Relational_Inline,
} from './TEST_DATA__MappingData';
import {
  EXPECTED__MappingData_ComplexM2MModel,
  EXPECTED__MappingData__Auto_M2M,
  EXPECTED__MappingData__COVIDDataSimpleModel,
  EXPECTED__MappingData__Relational_Inline,
} from './TEST_DATA__Expected_MappingData';

interface NodePropertyMappingData {
  property: AbstractProperty;
  mappingData: QueryBuilderPropertyMappingData;
  childNodes: NodePropertyMappingData[];
}

interface TestNodePropertyMappingData {
  name: string;
  mappingData: {
    mapped: boolean;
  };
  childNodes: TestNodePropertyMappingData[];
}

type TestCase = [
  string,
  {
    mapping: string;
    rootClass: string;
    expectedMappingData: TestNodePropertyMappingData[];
    entities: Entity[];
  },
];

const cases: TestCase[] = [
  [
    'Simple NFirm with employee Person property and model to model mapping',
    {
      mapping: 'model::MyMapping',
      rootClass: 'model::target::NFirm',
      expectedMappingData:
        EXPECTED__MappingData_ComplexM2MModel as TestNodePropertyMappingData[],
      entities: TEST_DATA__ComplexM2MModel,
    },
  ],
  [
    'Simple Covid Data with complex property and relational mapping',
    {
      mapping: 'mapping::CovidDataMapping',
      rootClass: 'domain::COVIDData',
      expectedMappingData:
        EXPECTED__MappingData__COVIDDataSimpleModel as TestNodePropertyMappingData[],
      entities: TEST_DATA__COVIDDataSimpleModel,
    },
  ],
  [
    'Simple Firm Mapping with M2M Mapping using auto property mappings',
    {
      mapping: 'test::autoMapping::AutoMapping',
      rootClass: 'test::autoMapping::Firm',
      expectedMappingData:
        EXPECTED__MappingData__Auto_M2M as TestNodePropertyMappingData[],
      entities: TEST_DATA__Auto_M2M,
    },
  ],
  [
    'Simple Relational Mapping with inline property mapping',
    {
      mapping: 'Oct::mappings::simpleRelationalMapping',
      rootClass: 'Oct::models::Person',
      expectedMappingData:
        EXPECTED__MappingData__Relational_Inline as TestNodePropertyMappingData[],
      entities: TEST_DATA__Relational_Inline,
    },
  ],
];

const buildMappingData = (
  property: AbstractProperty,
  graphManagerState: GraphManagerState,
  mappingData: QueryBuilderPropertyMappingData,
  max_depth: number,
  current_depth?: number | undefined,
): NodePropertyMappingData => {
  const depth = current_depth === undefined ? 0 : current_depth;
  const type = property.genericType.value.rawType;
  const propertyMappingData: NodePropertyMappingData = {
    property,
    mappingData: getPropertyNodeMappingData(
      graphManagerState,
      property,
      mappingData,
    ),
    childNodes: [],
  };
  if (type instanceof Class) {
    if (depth <= max_depth) {
      const properties = type
        .getAllProperties()
        .concat(type.getAllDerivedProperties());
      propertyMappingData.childNodes = properties.map((p) =>
        buildMappingData(
          p,
          graphManagerState,
          propertyMappingData.mappingData,
          max_depth,
          depth + 1,
        ),
      );
    }
  }
  return propertyMappingData;
};

const generatePropertyMappingDataTree = (
  mapping: Mapping,
  _class: Class,
  graphManagerState: GraphManagerState,
  max_depth = 1000,
): NodePropertyMappingData[] => {
  const mappingData = getRootMappingData(mapping, _class);
  const properties = _class
    .getAllProperties()
    .concat(_class.getAllDerivedProperties());
  return properties.map((p) =>
    buildMappingData(p, graphManagerState, mappingData, max_depth),
  );
};

const transformToTestPropertyMappingData = (
  propertyMappingDataNodes: NodePropertyMappingData[],
): TestNodePropertyMappingData[] =>
  propertyMappingDataNodes.map((node) => ({
    name: node.property.name,
    mappingData: {
      mapped: node.mappingData.mapped,
    },
    childNodes: transformToTestPropertyMappingData(node.childNodes),
  }));

describe(integrationTest('Build property mapping data'), () => {
  test.each(cases)('%s', async (testName, testCase) => {
    const { mapping, rootClass, expectedMappingData, entities } = testCase;
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const graphManagerState =
      mockedQueryStore.queryBuilderState.graphManagerState;
    await flowResult(graphManagerState.initializeSystem());
    await flowResult(
      graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        entities,
      ),
    );
    const _mapping = graphManagerState.graph.getMapping(mapping);
    const _class = graphManagerState.graph.getClass(rootClass);
    const actualMappingData = generatePropertyMappingDataTree(
      _mapping,
      _class,
      graphManagerState,
    );
    expect(expectedMappingData).toIncludeSameMembers(
      transformToTestPropertyMappingData(actualMappingData),
    );
  });
});
