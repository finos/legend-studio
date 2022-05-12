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

/// <reference types="jest-extended" />
import TEST_DATA__ComplexM2MModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA__SimpleRelationalInheritanceModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalInheritanceModel.json';
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json';
import TEST_DATA_AssociationMappingModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_AssociationMappingModel.json';
import { integrationTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import {
  Class,
  getAllClassDerivedProperties,
  getAllClassProperties,
  type AbstractProperty,
  type GraphManagerState,
  type Mapping,
} from '@finos/legend-graph';
import {
  type QueryBuilderPropertyMappingData,
  getPropertyNodeMappingData,
  getRootMappingData,
} from '../../stores/QueryBuilderExplorerState';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager';
import { Query_GraphPreset } from '../../models/Query_GraphPreset';
import { TEST__provideMockedLegendQueryStore } from '../../components/QueryComponentTestUtils';
import {
  TEST_DATA__Auto_M2M,
  TEST_DATA__Relational_Inline,
} from './TEST_DATA__MappingData';
import {
  EXPECTED__MappingData_ComplexM2MModel,
  EXPECTED__MappingData__AssociationMapping,
  EXPECTED__MappingData__Auto_M2M,
  EXPECTED__MappingData__COVIDDataSimpleModel,
  EXPECTED__MappingData__Relational_Inheritance,
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
    maxDepth?: number;
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
  [
    'Simple relational mapping with inhertiance class mapping',
    {
      mapping: 'model::NewMapping',
      rootClass: 'model::Firm',
      expectedMappingData:
        EXPECTED__MappingData__Relational_Inheritance as TestNodePropertyMappingData[],
      entities: TEST_DATA__SimpleRelationalInheritanceModel,
    },
  ],
  [
    'Simple association mapping with inlcudes',
    {
      mapping: 'model::parentMapping',
      rootClass: 'model::Person',
      expectedMappingData:
        EXPECTED__MappingData__AssociationMapping as TestNodePropertyMappingData[],
      entities: TEST_DATA_AssociationMappingModel,
      maxDepth: 2,
    },
  ],
];

const buildMappingData = (
  property: AbstractProperty,
  graphManagerState: GraphManagerState,
  mappingData: QueryBuilderPropertyMappingData,
  max_depth: number,
  mapping: Mapping,
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
      mapping,
    ),
    childNodes: [],
  };
  if (type instanceof Class) {
    if (depth <= max_depth) {
      const properties = getAllClassProperties(type).concat(
        getAllClassDerivedProperties(type),
      );
      propertyMappingData.childNodes = properties.map((p) =>
        buildMappingData(
          p,
          graphManagerState,
          propertyMappingData.mappingData,
          max_depth,
          mapping,
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
  max_depth: number,
): NodePropertyMappingData[] => {
  const mappingData = getRootMappingData(mapping, _class);
  const properties = getAllClassProperties(_class).concat(
    getAllClassDerivedProperties(_class),
  );
  return properties.map((p) =>
    buildMappingData(p, graphManagerState, mappingData, max_depth, mapping),
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
    const { mapping, rootClass, expectedMappingData, entities, maxDepth } =
      testCase;
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const mockedQueryStore = TEST__provideMockedLegendQueryStore({
      pluginManager,
    });
    const graphManagerState =
      mockedQueryStore.queryBuilderState.graphManagerState;
    await graphManagerState.initializeSystem();
    await graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      graphManagerState.graphBuildState,
    );
    const _mapping = graphManagerState.graph.getMapping(mapping);
    const _class = graphManagerState.graph.getClass(rootClass);
    const actualMappingData = generatePropertyMappingDataTree(
      _mapping,
      _class,
      graphManagerState,
      maxDepth === undefined ? 1000 : maxDepth,
    );
    expect(expectedMappingData).toIncludeSameMembers(
      transformToTestPropertyMappingData(actualMappingData),
    );
  });
});
