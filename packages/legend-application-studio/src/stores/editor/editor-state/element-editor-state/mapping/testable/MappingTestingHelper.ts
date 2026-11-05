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

import {
  LambdaFunction,
  type Class,
  type Type,
  type GraphManagerState,
  type Mapping,
  RawLambda,
  type SetImplementation,
  type MappingTestSuite,
  type GraphFetchTree,
  type MappingModelCoverageAnalysisResult,
  RootGraphFetchTree,
  PackageableElementExplicitReference,
  FunctionType,
  CORE_PURE_PATH,
  Multiplicity,
  buildRawLambdaFromLambdaFunction,
  StoreTestData,
  RelationalInstanceSetImplementation,
  EmbeddedRelationalInstanceSetImplementation,
  TableAlias,
  RelationalCSVData,
  Table,
  RelationalCSVDataTable,
  PureInstanceSetImplementation,
  MappingTest,
  ModelStore,
  EntityMappedProperty,
  getAllClassProperties,
  getAllClassDerivedProperties,
  PropertyGraphFetchTree,
  PropertyExplicitReference,
  type ObserverContext,
  Database,
} from '@finos/legend-graph';
import {
  buildGetAllFunction,
  buildSerialzieFunctionWithGraphFetch,
} from '@finos/legend-query-builder';
import type { EditorStore } from '../../../../EditorStore.js';
import { getMappingElementSource } from '../MappingEditorState.js';
import { createMockDataForTable } from '../../../../utils/MockDataUtils.js';
import {
  DEFAULT_TEST_ASSERTION_ID,
  createBareModelStoreData,
  createDefaultEqualToJSONTestAssertion,
} from '../../../../utils/TestableUtils.js';
import {
  assertErrorThrown,
  assertTrue,
  filterByType,
  guaranteeNonNullable,
  hashArray,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../../extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';

export const createGraphFetchRawLambda = (
  mainClass: Class,
  graphManagerState: GraphManagerState,
  root: RootGraphFetchTree,
): RawLambda => {
  const lambdaFunction = new LambdaFunction(
    new FunctionType(
      PackageableElementExplicitReference.create(
        graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
      ),
      Multiplicity.ONE,
    ),
  );
  const getAllFunction = buildGetAllFunction(mainClass, Multiplicity.ONE);
  const serialize = buildSerialzieFunctionWithGraphFetch(
    root,
    false,
    getAllFunction,
    undefined,
  );
  lambdaFunction.expressionSequence = [serialize];
  return buildRawLambdaFromLambdaFunction(lambdaFunction, graphManagerState);
};

export const createStoreBareModelStoreData = (
  _class: Type,
  editorStore: EditorStore,
): StoreTestData => {
  const modelStoreData = createBareModelStoreData(_class, editorStore);
  const testData = new StoreTestData();
  testData.data = modelStoreData;
  testData.store = PackageableElementExplicitReference.create(
    ModelStore.INSTANCE,
  );
  return testData;
};

export const isRelationalStoreTestData = (val: StoreTestData): boolean =>
  val.store.value instanceof Database;

export const isRelationalMappingTest = (val: MappingTest): boolean => {
  if (!val.storeTestData.length) {
    return false;
  }
  return val.storeTestData.some((e) => isRelationalStoreTestData(e));
};

export const isRelationalMappingTestSuite = (
  val: MappingTestSuite,
): boolean => {
  if (!val.tests.length) {
    return false;
  }
  return val.tests
    .filter(filterByType(MappingTest))
    .some((e) => isRelationalMappingTest(e));
};

//TODO: relation function support needs to be added
export const generateStoreTestDataFromSetImpl = (
  setImpl: SetImplementation,
  editorStore: EditorStore,
  tryAndMockTable?: boolean,
): StoreTestData | undefined => {
  if (
    setImpl instanceof RelationalInstanceSetImplementation ||
    setImpl instanceof EmbeddedRelationalInstanceSetImplementation ||
    setImpl instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    const _table = getMappingElementSource(
      setImpl,
      editorStore.pluginManager.getApplicationPlugins(),
    );
    if (_table instanceof TableAlias) {
      const relation = _table.relation.value;
      const owner = relation.schema._OWNER;
      const val = new RelationalCSVData();
      if (tryAndMockTable && relation instanceof Table) {
        const mockTable = new RelationalCSVDataTable();
        const values = createMockDataForTable(relation);
        mockTable.table = relation.name;
        mockTable.schema = relation.schema.name;
        mockTable.values = values;
        val.tables.push(mockTable);
      }
      const testData = new StoreTestData();
      testData.data = val;
      testData.store = PackageableElementExplicitReference.create(owner);
      return testData;
    }
  } else if (setImpl instanceof PureInstanceSetImplementation) {
    const srcClass = setImpl.srcClass;
    if (srcClass) {
      return createStoreBareModelStoreData(srcClass.value, editorStore);
    }
  }
  const extraStoreDataCreators = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
        ).getExtraStoreTestDataCreators?.() ?? [],
    );
  for (const creator of extraStoreDataCreators) {
    const embeddedData = creator(setImpl);
    if (embeddedData) {
      return embeddedData;
    }
  }
  return undefined;
};

export const createBareMappingTest = (
  id: string,
  storeTestData: StoreTestData | undefined,
  observerContext: ObserverContext,
  suite: MappingTestSuite,
): MappingTest => {
  const mappingTest = new MappingTest();
  mappingTest.id = id;
  mappingTest.storeTestData = storeTestData ? [storeTestData] : [];
  mappingTest.assertions = [
    createDefaultEqualToJSONTestAssertion(DEFAULT_TEST_ASSERTION_ID),
  ];

  mappingTest.__parent = suite;
  testSuite_addTest(suite, mappingTest, observerContext);

  const assertion = createDefaultEqualToJSONTestAssertion(`expectedAssertion`);
  mappingTest.assertions = [assertion];
  assertion.parentTest = mappingTest;
  return mappingTest;
};

const addPropertySubTreeIfPossible = (
  rootTree: GraphFetchTree,
  _class: Class,
  propertyName: string,
): PropertyGraphFetchTree | undefined => {
  const property = getAllClassProperties(_class)
    .concat(
      // we fetch mapped derived properties without parameters
      getAllClassDerivedProperties(_class).filter(
        (p) => !p.parameters || !(p.parameters as object[]).length,
      ),
    )
    .find((prop) => prop.name === propertyName);
  if (property) {
    const subTree = new PropertyGraphFetchTree(
      PropertyExplicitReference.create(property),
      undefined,
    );
    rootTree.subTrees.push(subTree);
    return subTree;
  }
  return undefined;
};

export const createGraphFetchQueryFromMappingAnalysis = (
  _class: Class,
  graphManagerState: GraphManagerState,
  mappingModelCoverageAnalysisResult:
    | MappingModelCoverageAnalysisResult
    | undefined,
): RawLambda => {
  try {
    const anaylsis = guaranteeNonNullable(mappingModelCoverageAnalysisResult);
    const mappedEntity = guaranteeNonNullable(
      anaylsis.mappedEntities.find((e) => e.path === _class.path),
    );
    const rootTree = new RootGraphFetchTree(
      PackageableElementExplicitReference.create(_class),
    );
    // TODO: allow complex properties
    mappedEntity.properties.forEach((mapped) => {
      const subTree = addPropertySubTreeIfPossible(
        rootTree,
        _class,
        mapped.name,
      );
      if (mapped instanceof EntityMappedProperty && subTree) {
        const entityPath = mapped.entityPath;
        const entityClass =
          graphManagerState.graph.getNullableClass(entityPath);
        const firstLevelEntity = anaylsis.mappedEntities.find(
          (e) => e.path === entityPath,
        );
        if (entityClass && firstLevelEntity) {
          firstLevelEntity.properties.forEach((e) => {
            if (!(e instanceof EntityMappedProperty)) {
              addPropertySubTreeIfPossible(subTree, entityClass, e.name);
            }
          });
        }
      }
    });
    assertTrue(!rootTree.isEmpty);
    return createGraphFetchRawLambda(_class, graphManagerState, rootTree);
  } catch (error) {
    assertErrorThrown(error);
    const lambdaFunction = new LambdaFunction(
      new FunctionType(
        PackageableElementExplicitReference.create(
          graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
        ),
        Multiplicity.ONE,
      ),
    );
    lambdaFunction.expressionSequence = [
      buildGetAllFunction(_class, Multiplicity.ONE),
    ];
    return buildRawLambdaFromLambdaFunction(lambdaFunction, graphManagerState);
  }
};

export const mappingHasTests = (mapping: Mapping): boolean =>
  mapping.tests.some((suite) => suite.tests.length > 0);

// NOTE: in the saved mapping, `testSuites` are the test suites; `tests` is the legacy
// (deprecated) mapping test format, which has no suite id or query to compare
type SavedMappingEntityContent = {
  testSuites?: {
    id?: string;
    func?: { parameters?: object; body?: object };
  }[];
};

export const getSavedMappingSuiteQueryHashes = (
  savedEntities: Entity[],
  mappingPath: string,
): Map<string, string> => {
  const savedSuites =
    (
      savedEntities.find((entity) => entity.path === mappingPath)?.content as
        | SavedMappingEntityContent
        | undefined
    )?.testSuites ?? [];
  const hashes = new Map<string, string>();
  savedSuites.forEach((suite) => {
    if (suite.id !== undefined && suite.func) {
      hashes.set(
        suite.id,
        new RawLambda(suite.func.parameters, suite.func.body).hashCode,
      );
    }
  });
  return hashes;
};

export const snapshotMappingSuiteQueryHashes = (
  mapping: Mapping,
): Map<MappingTestSuite, string> =>
  new Map(mapping.tests.map((suite) => [suite, suite.func.hashCode]));

export const hasMappingSuiteQueryChanged = (
  mapping: Mapping,
  savedHashes: Map<string, string>,
  lastRegeneratedHashes: Map<MappingTestSuite, string>,
): boolean =>
  mapping.tests.some((suite) => {
    const savedHash = savedHashes.get(suite.id);
    const currentHash = suite.func.hashCode;
    return (
      savedHash !== undefined &&
      currentHash !== savedHash &&
      currentHash !== lastRegeneratedHashes.get(suite)
    );
  });

const getMappingTests = (mapping: Mapping): MappingTest[] =>
  mapping.tests.flatMap((suite) =>
    suite.tests.filter(filterByType(MappingTest)),
  );

const hashStoreTestData = (test: MappingTest): string =>
  hashArray(test.storeTestData);

export const snapshotMappingTestDataHashes = (
  mapping: Mapping,
): Map<MappingTest, string> =>
  new Map(
    getMappingTests(mapping).map((test) => [test, hashStoreTestData(test)]),
  );

export const hasMappingTestDataChanged = (
  mapping: Mapping,
  snapshot: Map<MappingTest, string>,
): boolean =>
  getMappingTests(mapping).some((test) => {
    const snapshotHash = snapshot.get(test);
    return (
      snapshotHash !== undefined && snapshotHash !== hashStoreTestData(test)
    );
  });
