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
import TEST_DATA__ComplexM2MModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexM2M.json';
import TEST_DATA__SimpleRelationalInheritanceModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalInheritanceModel.json';
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json';
import TEST_DATA__AssociationMappingModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_AssociationMappingModel.json';
import TEST_DATA__M2MAutoMapped from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_M2MAutoMapped.json';
import TEST_DATA__RelationalInline from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_RelationalInline.json';
import TEST_DATA_SimpleSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleSubtype.json';
import TEST_DATA_ComplexSubtypeModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexSubType.json';
import {
  type TEMPORARY__JestMatcher,
  type PlainObject,
  integrationTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  Class,
  create_RawLambda,
  getAllClassDerivedProperties,
  getAllClassProperties,
  stub_RawLambda,
  type AbstractProperty,
  type GraphManagerState,
  type Mapping,
  type MappingModelCoverageAnalysisResult,
} from '@finos/legend-graph';
import {
  type QueryBuilderPropertyMappingData,
  getRootMappingData,
  generatePropertyNodeMappingData,
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
} from '../explorer/QueryBuilderExplorerState.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import {
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../../components/QueryEditorComponentTestUtils.js';
import {
  TEST_DATA__MappingData__ComplexM2MModel,
  TEST_DATA__MappingData__AssociationMapping,
  TEST_DATA__MappingData_M2MAutoMapped,
  TEST_DATA__MappingData__COVIDDataSimpleModel,
  TEST_DATA__MappingData__Relational_Inheritance,
  TEST_DATA__MappingData_RelationalInline,
} from './TEST_DATA__MappingData.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_AssociationMapping,
  TEST_DATA__ModelCoverageAnalysisResult_M2MAutoMapped,
  TEST_DATA__ModelCoverageAnalysisResult_ComplexM2M,
  TEST_DATA__ModelCoverageAnalysisResult_COVIDDataSimple,
  TEST_DATA__ModelCoverageAnalysisResult_RelationalInline,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalInheritance,
  TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
  TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
  TEST_DATA__ModelCoverageAnalysisResult_ComplexSubtype,
} from './TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__QueryBuilder_Model_HighlightProperties from './TEST_DATA__QueryBuilder_Model_HiglightProperties.json';
import {
  TEST_DATA_simpleGraphFetchWithSubType,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__simpleProjection,
} from './TEST_DATA__QueryBuilder_HighlightProperties.js';
import { waitFor, getByText, getAllByText } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { QUERY_BUILDER_TEST_ID } from '../../components/QueryBuilder_TestID.js';
import { TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel } from './TEST_DATA__QueryBuilder_Generic.js';
import { isNodeAlreadyUsed } from '../../components/explorer/QueryBuilderExplorerPanel.js';

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
    rawMappingModelCoverageAnalysisResult: PlainObject<unknown>;
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
        TEST_DATA__MappingData__ComplexM2MModel as TestNodePropertyMappingData[],
      entities: TEST_DATA__ComplexM2MModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_ComplexM2M,
    },
  ],
  [
    'Simple Covid Data with complex property and relational mapping',
    {
      mapping: 'mapping::CovidDataMapping',
      rootClass: 'domain::COVIDData',
      expectedMappingData:
        TEST_DATA__MappingData__COVIDDataSimpleModel as TestNodePropertyMappingData[],
      entities: TEST_DATA__COVIDDataSimpleModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_COVIDDataSimple,
    },
  ],
  [
    'Simple Firm Mapping with M2M Mapping using auto property mappings',
    {
      mapping: 'test::autoMapping::AutoMapping',
      rootClass: 'test::autoMapping::Firm',
      expectedMappingData:
        TEST_DATA__MappingData_M2MAutoMapped as TestNodePropertyMappingData[],
      entities: TEST_DATA__M2MAutoMapped,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_M2MAutoMapped,
    },
  ],
  [
    'Simple Relational Mapping with inline property mapping',
    {
      mapping: 'Oct::mappings::simpleRelationalMapping',
      rootClass: 'Oct::models::Person',
      expectedMappingData:
        TEST_DATA__MappingData_RelationalInline as TestNodePropertyMappingData[],
      entities: TEST_DATA__RelationalInline,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_RelationalInline,
    },
  ],
  [
    'Simple relational mapping with inhertiance class mapping',
    {
      mapping: 'model::NewMapping',
      rootClass: 'model::Firm',
      expectedMappingData:
        TEST_DATA__MappingData__Relational_Inheritance as TestNodePropertyMappingData[],
      entities: TEST_DATA__SimpleRelationalInheritanceModel,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_SimpleRelationalInheritance,
    },
  ],
  [
    'Simple association mapping with inlcudes',
    {
      mapping: 'model::parentMapping',
      rootClass: 'model::Person',
      expectedMappingData:
        TEST_DATA__MappingData__AssociationMapping as TestNodePropertyMappingData[],
      entities: TEST_DATA__AssociationMappingModel,
      maxDepth: 2,
      rawMappingModelCoverageAnalysisResult:
        TEST_DATA__ModelCoverageAnalysisResult_AssociationMapping,
    },
  ],
];

const buildMappingData = (
  property: AbstractProperty,
  graphManagerState: GraphManagerState,
  mappingData: QueryBuilderPropertyMappingData,
  max_depth: number,
  mapping: Mapping,
  mappingModelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
  current_depth?: number | undefined,
): NodePropertyMappingData => {
  const depth = current_depth === undefined ? 0 : current_depth;
  const type = property.genericType.value.rawType;
  const propertyMappingData: NodePropertyMappingData = {
    property,
    mappingData: generatePropertyNodeMappingData(
      property,
      mappingData,
      mappingModelCoverageAnalysisResult,
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
          mappingModelCoverageAnalysisResult,
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
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
  max_depth: number,
): NodePropertyMappingData[] => {
  const mappingData = getRootMappingData(_class, modelCoverageAnalysisResult);
  const properties = getAllClassProperties(_class).concat(
    getAllClassDerivedProperties(_class),
  );
  return properties.map((p) =>
    buildMappingData(
      p,
      graphManagerState,
      mappingData,
      max_depth,
      mapping,
      modelCoverageAnalysisResult,
    ),
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
  test.each(cases)(
    '%s',
    async (testName: TestCase[0], testCase: TestCase[1]) => {
      const {
        mapping,
        rootClass,
        expectedMappingData,
        entities,
        maxDepth,
        rawMappingModelCoverageAnalysisResult,
      } = testCase;
      const pluginManager = LegendQueryPluginManager.create();
      pluginManager
        .usePresets([new QueryBuilder_GraphManagerPreset()])
        .install();
      const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
        pluginManager,
      });
      const graphManagerState =
        MOCK__editorStore.queryBuilderState.graphManagerState;
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
        graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
          rawMappingModelCoverageAnalysisResult,
        ),
        maxDepth === undefined ? 1000 : maxDepth,
      );
      (
        expect(expectedMappingData) as TEMPORARY__JestMatcher
      ).toIncludeSameMembers(
        transformToTestPropertyMappingData(actualMappingData),
      );
    },
  );
});

test(
  integrationTest('Highlight already used properties in projection'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA__QueryBuilder_Model_HighlightProperties,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _firmClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');

    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjection.parameters,
          TEST_DATA__simpleProjection.body,
        ),
      );
    });
    const usedPropertyNodeIds =
      queryBuilderState.fetchStructureState.projectionState.usedPropertyNodeIds;
    expect(usedPropertyNodeIds.length).toBe(2);
    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) =>
        isNodeAlreadyUsed(node, queryBuilderState.fetchStructureState),
      ).length,
    ).toBe(2);
  },
);

test(
  integrationTest('Highlight already used subtype in projection'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA_SimpleSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_SimpleSubtype,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _legalEntityClass =
      MOCK__editorStore.graphManagerState.graph.getClass('model::LegalEntity');
    await act(async () => {
      queryBuilderState.changeClass(_legalEntityClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'LegalEntity'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'NewMapping'));

    // check subclass display in the explorer tree
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );
    expect(rootNode.mappingData.mapped).toBe(true);
    const subTypeNodes = [...treeData.nodes.values()].filter(
      (node) => node instanceof QueryBuilderExplorerTreeSubTypeNodeData,
    );
    expect(subTypeNodes.length).toBe(1);
    expect(guaranteeNonNullable(subTypeNodes[0]).mappingData.mapped).toBe(true);
    const queryBuilderExplorerTreeSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(queryBuilderExplorerTreeSetup, '@Firm'));

    // simpleProjection with subType
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.parameters,
          TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel.body,
        ),
      );
    });
    const projectionColsWithSubType = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION),
    );
    const NAME_ALIAS = '(@Firm)/Employees/First Name';
    await waitFor(() => getByText(projectionColsWithSubType, NAME_ALIAS));
    expect(
      queryBuilderState.fetchStructureState.projectionState.usedPropertyNodeIds
        .length,
    ).toBe(3);
    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) =>
        isNodeAlreadyUsed(node, queryBuilderState.fetchStructureState),
      ).length,
    ).toBe(2);
  },
);

test(
  integrationTest('Highlight already used properties in graph fetch'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA__QueryBuilder_Model_HighlightProperties,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_HighlightProperties,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _firmClass =
      MOCK__editorStore.graphManagerState.graph.getClass('my::Firm');

    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getByText(queryBuilderSetup, 'map'));
    await waitFor(() => getByText(queryBuilderSetup, 'runtime'));
    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA__simpleGraphFetch.parameters,
          TEST_DATA__simpleGraphFetch.body,
        ),
      );
    });
    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) =>
        isNodeAlreadyUsed(node, queryBuilderState.fetchStructureState),
      ).length,
    ).toBe(2);
  },
);

test(
  integrationTest('Highlight already used subtype in graph fetch'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const MOCK__editorStore = TEST__provideMockedQueryEditorStore({
      pluginManager,
    });
    const renderResult = await TEST__setUpQueryEditor(
      MOCK__editorStore,
      TEST_DATA_ComplexSubtypeModel,
      stub_RawLambda(),
      'model::NewMapping',
      'model::Runtime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexSubtype,
    );
    const queryBuilderState = MOCK__editorStore.queryBuilderState;
    const _Class =
      MOCK__editorStore.graphManagerState.graph.getClass('model::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_Class);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Firm'));
    await waitFor(() => getAllByText(queryBuilderSetup, 'NewMapping'));

    // check subclass display in the explorer tree
    const treeData = guaranteeNonNullable(
      queryBuilderState.explorerState.treeData,
    );
    const rootNode = guaranteeType(
      treeData.nodes.get(treeData.rootIds[0] as string),
      QueryBuilderExplorerTreeRootNodeData,
    );
    expect(rootNode.mappingData.mapped).toBe(true);

    await act(async () => {
      queryBuilderState.initialize(
        create_RawLambda(
          TEST_DATA_simpleGraphFetchWithSubType.parameters,
          TEST_DATA_simpleGraphFetchWithSubType.body,
        ),
      );
    });
    expect(
      Array.from(
        queryBuilderState.explorerState.nonNullableTreeData.nodes.values(),
      ).filter((node) =>
        isNodeAlreadyUsed(node, queryBuilderState.fetchStructureState),
      ).length,
    ).toBe(2);
  },
);
