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

import { test, expect, describe } from '@jest/globals';
import TEST_DATA__ComplexM2MModel from './TEST_DATA__QueryBuilder_Model_ComplexM2M.json' with { type: 'json' };
import TEST_DATA__SimpleRelationalInheritanceModel from './TEST_DATA__QueryBuilder_Model_SimpleRelationalInheritanceModel.json' with { type: 'json' };
import TEST_DATA__NestedSubTypeModel from './TEST_DATA__QueryBuilder_Model_NestedSubType.json' with { type: 'json' };
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json' with { type: 'json' };
import TEST_DATA__AssociationMappingModel from './TEST_DATA__QueryBuilder_Model_AssociationMappingModel.json' with { type: 'json' };
import TEST_DATA__M2MAutoMapped from './TEST_DATA__QueryBuilder_Model_M2MAutoMapped.json' with { type: 'json' };
import TEST_DATA__RelationalInline from './TEST_DATA__QueryBuilder_Model_RelationalInline.json';
import TEST_DATA__QueryBuilder_Model_MultiClassNestedSubType from './TEST_DATA__QueryBuilder_Model_MultiClassNestedSubType.json' with { type: 'json' };
import { type PlainObject } from '@finos/legend-shared';
import {
  integrationTest,
  type TEMPORARY__JestMatcher,
} from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  Class,
  getAllClassDerivedProperties,
  getAllClassProperties,
  type GraphManagerState,
  type Mapping,
  type MappingModelCoverageAnalysisResult,
  type AbstractProperty,
} from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import {
  getRootMappingData,
  generatePropertyNodeMappingData,
  generateSubtypeNodeMappingData,
  type QueryBuilderExplorerTreeNodeMappingData,
} from '../explorer/QueryBuilderExplorerState.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  TEST_DATA__MappingData__ComplexM2MModel,
  TEST_DATA__MappingData__AssociationMapping,
  TEST_DATA__MappingData_M2MAutoMapped,
  TEST_DATA__MappingData__COVIDDataSimpleModel,
  TEST_DATA__MappingData__Relational_Inheritance,
  TEST_DATA__MappingData_RelationalInline,
  TEST_DATA__Mappingdata__NestedSubtype,
  TEST_DATA__Mappingdata__MultiMappedNestedSubtype,
  TEST_DATA__Mappingdata__SimpleSubtype,
} from './TEST_DATA__MappingData.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_AssociationMapping,
  TEST_DATA__ModelCoverageAnalysisResult_M2MAutoMapped,
  TEST_DATA__ModelCoverageAnalysisResult_ComplexM2M,
  TEST_DATA__ModelCoverageAnalysisResult_COVIDDataSimple,
  TEST_DATA__ModelCoverageAnalysisResult_RelationalInline,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalInheritance,
  TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_MultiMappedNestedSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
} from './TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST__LegendApplicationPluginManager } from '../__test-utils__/QueryBuilderStateTestUtils.js';
import TEST_DATA_SimpleSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json' with { type: 'json' };

interface NodeMappingData {
  name: string;
  mappingData: QueryBuilderExplorerTreeNodeMappingData;
  childNodes: NodeMappingData[];
}

type TestCase = [
  string,
  {
    mappingPath: string;
    classPath: string;
    expectedMappingData: object;
    entities: Entity[];
    rawMappingModelCoverageAnalysisResult: PlainObject;
    maxDepth?: number;
  },
];

const cases: TestCase[] = [
  [
    'Simple NFirm with employee Person property and model to model mapping',
    {
      mappingPath: 'model::MyMapping',
      classPath: 'model::target::NFirm',
      expectedMappingData: TEST_DATA__MappingData__ComplexM2MModel,
      entities: TEST_DATA__ComplexM2MModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_ComplexM2M,
    },
  ],
  [
    'Simple Covid Data with complex property and relational mapping',
    {
      mappingPath: 'mapping::CovidDataMapping',
      classPath: 'domain::COVIDData',
      expectedMappingData: TEST_DATA__MappingData__COVIDDataSimpleModel,
      entities: TEST_DATA__COVIDDataSimpleModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_COVIDDataSimple,
    },
  ],
  [
    'Simple Firm Mapping with M2M Mapping using auto property mappings',
    {
      mappingPath: 'test::autoMapping::AutoMapping',
      classPath: 'test::autoMapping::Firm',
      expectedMappingData: TEST_DATA__MappingData_M2MAutoMapped,
      entities: TEST_DATA__M2MAutoMapped,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_M2MAutoMapped,
    },
  ],
  [
    'Simple Relational Mapping with inline property mapping',
    {
      mappingPath: 'Oct::mappings::simpleRelationalMapping',
      classPath: 'Oct::models::Person',
      expectedMappingData: TEST_DATA__MappingData_RelationalInline,
      entities: TEST_DATA__RelationalInline,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_RelationalInline,
    },
  ],
  [
    'Simple relational mapping with inhertiance class mapping',
    {
      mappingPath: 'model::NewMapping',
      classPath: 'model::Firm',
      expectedMappingData: TEST_DATA__MappingData__Relational_Inheritance,
      entities: TEST_DATA__SimpleRelationalInheritanceModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalInheritance,
    },
  ],
  [
    'Simple association mapping with inlcudes',
    {
      mappingPath: 'model::parentMapping',
      classPath: 'model::Person',
      expectedMappingData: TEST_DATA__MappingData__AssociationMapping,
      entities: TEST_DATA__AssociationMappingModel,
      maxDepth: 2,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_AssociationMapping,
    },
  ],
  [
    'Nested subtype',
    {
      mappingPath: 'model::NewMapping',
      classPath: 'model::Person',
      expectedMappingData: TEST_DATA__Mappingdata__NestedSubtype,
      entities: TEST_DATA__NestedSubTypeModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_NestedSubtype,
    },
  ],
  [
    'Multi Mapped Nested Subtype',
    {
      mappingPath: 'model::MyMapping',
      classPath: 'model::Firm',
      expectedMappingData: TEST_DATA__Mappingdata__MultiMappedNestedSubtype,
      entities: TEST_DATA__QueryBuilder_Model_MultiClassNestedSubType,
      maxDepth: 1,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_MultiMappedNestedSubtype,
    },
  ],
  [
    'Simple relational mapping when property mapping points to class mapping of subType',
    {
      mappingPath: 'model::NewMapping',
      classPath: 'model::Firm',
      expectedMappingData: TEST_DATA__Mappingdata__SimpleSubtype,
      entities: TEST_DATA_SimpleSubtypeModel,
      maxDepth: 3,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    },
  ],
];

function buildChildNodeMappingData(
  node: AbstractProperty | Class,
  graphManagerState: GraphManagerState,
  parentMappingData: QueryBuilderExplorerTreeNodeMappingData,
  mapping: Mapping,
  mappingModelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
  max_depth: number,
  depth: number,
): NodeMappingData {
  const nodeMappingData: NodeMappingData = {
    name: node instanceof Class ? node.path : node.name,
    mappingData:
      node instanceof Class
        ? generateSubtypeNodeMappingData(
            node,
            parentMappingData,
            mappingModelCoverageAnalysisResult,
          )
        : generatePropertyNodeMappingData(
            node,
            parentMappingData,
            mappingModelCoverageAnalysisResult,
          ),
    childNodes: [],
  };
  if (depth <= max_depth) {
    const _class =
      node instanceof Class ? node : node.genericType.value.rawType;
    if (_class instanceof Class) {
      nodeMappingData.childNodes = (
        getAllClassProperties(_class).concat(
          getAllClassDerivedProperties(_class),
        ) as (AbstractProperty | Class)[]
      )
        .concat(_class._subclasses)
        .map((childNode) =>
          buildChildNodeMappingData(
            childNode,
            graphManagerState,
            nodeMappingData.mappingData,
            mapping,
            mappingModelCoverageAnalysisResult,
            max_depth,
            depth + 1,
          ),
        );
    }
  }
  return nodeMappingData;
}

const buildExplorerTreeMappingData = (
  mapping: Mapping,
  _class: Class,
  graphManagerState: GraphManagerState,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
  max_depth: number,
): NodeMappingData[] => {
  const mappingData = getRootMappingData(_class, modelCoverageAnalysisResult);
  return (
    getAllClassProperties(_class).concat(
      getAllClassDerivedProperties(_class),
    ) as (AbstractProperty | Class)[]
  )
    .concat(_class._subclasses)
    .map((childNode) =>
      buildChildNodeMappingData(
        childNode,
        graphManagerState,
        mappingData,
        mapping,
        modelCoverageAnalysisResult,
        max_depth,
        0,
      ),
    );
};

const serializeMappingData = (
  propertyMappingDataNodes: NodeMappingData[],
): object =>
  propertyMappingDataNodes.map((node) => ({
    name: node.name,
    mappingData: {
      mapped: node.mappingData.mapped,
    },
    childNodes: serializeMappingData(node.childNodes),
  }));

describe(integrationTest('Build property mapping data'), () => {
  test.each(cases)(
    '%s',
    async (testName: TestCase[0], testCase: TestCase[1]) => {
      const {
        mappingPath,
        classPath,
        expectedMappingData,
        entities,
        maxDepth,
        rawMappingModelCoverageAnalysisResult,
      } = testCase;
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      pluginManager
        .usePresets([new QueryBuilder_GraphManagerPreset()])
        .install();
      const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
      await graphManagerState.graphManager.initialize({
        env: 'test',
        tabSize: 2,
        clientConfig: {},
      });
      await graphManagerState.initializeSystem();
      await graphManagerState.graphManager.buildGraph(
        graphManagerState.graph,
        entities,
        graphManagerState.graphBuildState,
      );
      const _mapping = graphManagerState.graph.getMapping(mappingPath);
      const _class = graphManagerState.graph.getClass(classPath);
      const actualMappingData = buildExplorerTreeMappingData(
        _mapping,
        _class,
        graphManagerState,
        graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
          rawMappingModelCoverageAnalysisResult,
          _mapping,
        ),
        maxDepth === undefined ? 1000 : maxDepth,
      );
      (
        expect(expectedMappingData) as TEMPORARY__JestMatcher
      ).toIncludeSameMembers(serializeMappingData(actualMappingData));
    },
  );
});
