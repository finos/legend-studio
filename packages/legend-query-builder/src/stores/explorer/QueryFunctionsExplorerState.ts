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
  type PackageableElement,
  type FunctionAnalysisInfo,
  type PureModel,
  Package,
  Unit,
  ROOT_PACKAGE_NAME,
  buildFunctionAnalysisInfoFromConcreteFunctionDefinition,
  getOrCreateGraphPackage,
} from '@finos/legend-graph';
import {
  ActionState,
  addUniqueEntry,
  guaranteeNonNullable,
  isNonNullable,
  noop,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import {
  type TreeNodeData,
  type TreeData,
  compareLabelFn,
} from '@finos/legend-art';

export const QUERY_BUILDER_FUNCTION_DND_TYPE = 'QUERY_BUILDER_FUNCTION';

export interface QueryBuilderFunctionsExplorerDragSource {
  node: QueryBuilderFunctionsExplorerTreeNodeData;
}

export class QueryBuilderFunctionsExplorerTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  childrenIds: string[] = [];
  isOpen?: boolean | undefined;
  package?: PackageableElement;
  functionAnalysisInfo?: FunctionAnalysisInfo | undefined;

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }
}

const getValidDisplayablePackageSet = (
  queryBuilderState: QueryBuilderState,
  rootPackageName: ROOT_PACKAGE_NAME,
): Set<Package> => {
  switch (rootPackageName) {
    case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
      return queryBuilderState.functionsExplorerState
        .dependencyDisplayablePackagesSet;
    default:
      return queryBuilderState.functionsExplorerState.displayablePackagesSet;
  }
};

const generateFunctionsExplorerTreeNodeDataFromPackage = (
  queryBuilderState: QueryBuilderState,
  element: Package,
  rootPackageName: ROOT_PACKAGE_NAME,
): QueryBuilderFunctionsExplorerTreeNodeData => ({
  id: element.path,
  label: element.name,
  childrenIds: element.children
    .filter((child) => !(child instanceof Unit))
    .filter(
      (child) =>
        child instanceof Package &&
        getValidDisplayablePackageSet(queryBuilderState, rootPackageName).has(
          child,
        ),
    )
    .map((child) => child.path)
    .concat(
      queryBuilderState.functionsExplorerState.packagePathToFunctionInfoMap
        ?.get(element.path)
        ?.map((info) => info.functionPath) ?? [],
    ),
  package: element,
});

export const generateFunctionsExplorerTreeNodeDataFromFunctionAnalysisInfo = (
  functionAnalysisInfo: FunctionAnalysisInfo,
): QueryBuilderFunctionsExplorerTreeNodeData => ({
  id: functionAnalysisInfo.functionPath,
  label: functionAnalysisInfo.name,
  childrenIds: [],
  functionAnalysisInfo: functionAnalysisInfo,
});

const generateFunctionsExplorerTreeNodeChilrdren = (
  queryBuilderState: QueryBuilderState,
  node: QueryBuilderFunctionsExplorerTreeNodeData,
  data: TreeData<QueryBuilderFunctionsExplorerTreeNodeData>,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): void => {
  const functionInfoMap =
    rootPackageName === ROOT_PACKAGE_NAME.MAIN
      ? queryBuilderState.functionsExplorerState.functionInfoMap
      : queryBuilderState.functionsExplorerState.dependencyFunctionInfoMap;
  const validDisplayablePackageSet = getValidDisplayablePackageSet(
    queryBuilderState,
    rootPackageName,
  );
  const qualifiedExtraFunctionPaths =
    queryBuilderState.functionsExplorerState.packagePathToFunctionInfoMap
      ?.get(node.id)
      ?.map((info) => info.functionPath);

  const childrenPackages = (node.package as Package).children
    .filter(
      (child) =>
        // avoid displaying empty packages
        child instanceof Package && validDisplayablePackageSet.has(child),
    )
    .map((child) => child as Package);

  node.childrenIds = childrenPackages
    .map((child) => child.path)
    .concat(qualifiedExtraFunctionPaths ?? []);

  const childNodesFromPackage = childrenPackages.map((child) =>
    generateFunctionsExplorerTreeNodeDataFromPackage(
      queryBuilderState,
      child,
      rootPackageName,
    ),
  );

  const childNodesFromFunction = qualifiedExtraFunctionPaths
    ?.map((path) => functionInfoMap?.get(path))
    .filter(isNonNullable)
    .map((info) =>
      generateFunctionsExplorerTreeNodeDataFromFunctionAnalysisInfo(info),
    );

  childNodesFromPackage
    .concat(childNodesFromFunction ?? [])
    .forEach((childNode) => {
      const currentNode = data.nodes.get(childNode.id);
      if (currentNode) {
        currentNode.childrenIds = childNode.childrenIds;
        currentNode.label = childNode.label;
      } else {
        data.nodes.set(childNode.id, childNode);
      }
    });
};

export const getFunctionsExplorerTreeData = (
  roots: Package[],
  queryBuilderState: QueryBuilderState,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): TreeData<QueryBuilderFunctionsExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderFunctionsExplorerTreeNodeData>();
  const validDisplayablePackageSet = getValidDisplayablePackageSet(
    queryBuilderState,
    rootPackageName,
  );
  switch (rootPackageName) {
    case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
      if (
        !queryBuilderState.functionsExplorerState.dependencyFunctionInfoMap ||
        Array.from(
          queryBuilderState.functionsExplorerState.dependencyFunctionInfoMap,
        ).length === 0
      ) {
        return { rootIds, nodes };
      }
      break;
    default:
      if (
        !queryBuilderState.functionsExplorerState.functionInfoMap ||
        Array.from(queryBuilderState.functionsExplorerState.functionInfoMap)
          .length === 0
      ) {
        return { rootIds, nodes };
      }
  }

  roots.forEach((root) => {
    root.children
      .slice()
      .filter(
        (child) =>
          child instanceof Package && validDisplayablePackageSet.has(child),
      )
      .map((child) => child as Package)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((childPackage) => {
        const childTreeNodeData =
          generateFunctionsExplorerTreeNodeDataFromPackage(
            queryBuilderState,
            childPackage,
            rootPackageName,
          );
        addUniqueEntry(rootIds, childTreeNodeData.id);
        nodes.set(childTreeNodeData.id, childTreeNodeData);
      });
  });
  return { rootIds, nodes };
};

export const getFunctionsExplorerTreeNodeChildren = (
  queryBuilderState: QueryBuilderState,
  node: QueryBuilderFunctionsExplorerTreeNodeData,
  data: TreeData<QueryBuilderFunctionsExplorerTreeNodeData>,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): QueryBuilderFunctionsExplorerTreeNodeData[] => {
  generateFunctionsExplorerTreeNodeChilrdren(
    queryBuilderState,
    node,
    data,
    rootPackageName,
  );
  return node.childrenIds
    .map((id) => data.nodes.get(id))
    .filter(isNonNullable)
    .sort(compareLabelFn)
    .sort((a, b) => (b.package ? 1 : 0) - (a.package ? 1 : 0));
};

const getAllPackagesFromElement = (element: PackageableElement): Package[] => {
  if (element.package) {
    return (element instanceof Package ? [element] : []).concat(
      [element.package].concat(getAllPackagesFromElement(element.package)),
    );
  }
  return [];
};

export class QueryFunctionExplorerState {
  readonly uuid = uuid();
  queryFunctionsState: QueryFunctionsExplorerState;
  functionAnalysisInfo: FunctionAnalysisInfo;

  constructor(
    queryFunctionsState: QueryFunctionsExplorerState,
    functionAnalysisInfo: FunctionAnalysisInfo,
  ) {
    makeObservable(this, {
      functionAnalysisInfo: observable,
    });
    this.queryFunctionsState = queryFunctionsState;
    this.functionAnalysisInfo = functionAnalysisInfo;
  }
}

export class QueryFunctionsExplorerState {
  readonly initState = ActionState.create();

  queryBuilderState: QueryBuilderState;
  treeData?: TreeData<QueryBuilderFunctionsExplorerTreeNodeData> | undefined;
  dependencyTreeData?:
    | TreeData<QueryBuilderFunctionsExplorerTreeNodeData>
    | undefined;
  _functionGraph: PureModel;
  functionExplorerStates: QueryFunctionExplorerState[] = [];
  dependencyFunctionExplorerStates: QueryFunctionExplorerState[] = [];
  displayablePackagesSet: Set<Package> = new Set<Package>();
  dependencyDisplayablePackagesSet: Set<Package> = new Set<Package>();
  functionInfoMap?: Map<string, FunctionAnalysisInfo>;
  dependencyFunctionInfoMap?: Map<string, FunctionAnalysisInfo>;
  packagePathToFunctionInfoMap?: Map<string, FunctionAnalysisInfo[]>;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      functionExplorerStates: observable.ref,
      setFunctionExplorerStates: action,

      dependencyFunctionExplorerStates: observable.ref,
      setDependencyFunctionExplorerStates: action,

      treeData: observable.ref,
      dependencyTreeData: observable.ref,
      _functionGraph: observable,
      functionInfoMap: observable,
      dependencyFunctionInfoMap: observable,
      packagePathToFunctionInfoMap: observable,
      setFunctionInfoMap: action,
      setDependencyFunctionInfoMap: action,
      setTreeData: action,
      setPackagePathToFunctionInfoMap: action,
      setDependencyTreeData: action,
      refreshTree: action,
      onTreeNodeSelect: action,
      initializeTreeData: action,
    });
    this.queryBuilderState = queryBuilderState;
    this._functionGraph =
      this.queryBuilderState.graphManagerState.createNewGraph();
  }

  getTreeData(
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): TreeData<QueryBuilderFunctionsExplorerTreeNodeData> | undefined {
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
        return this.dependencyTreeData;
      default:
        return this.treeData;
    }
  }

  setFunctionExplorerStates(val: QueryFunctionExplorerState[]): void {
    this.functionExplorerStates = val;
  }

  setDependencyFunctionExplorerStates(val: QueryFunctionExplorerState[]): void {
    this.dependencyFunctionExplorerStates = val;
  }

  setFunctionInfoMap(info: Map<string, FunctionAnalysisInfo>) {
    this.functionInfoMap = info;
  }

  setDependencyFunctionInfoMap(info: Map<string, FunctionAnalysisInfo>) {
    this.dependencyFunctionInfoMap = info;
  }

  setPackagePathToFunctionInfoMap(map: Map<string, FunctionAnalysisInfo[]>) {
    this.packagePathToFunctionInfoMap = map;
  }

  async initializeDisplayablePackagesSet(): Promise<void> {
    if (this.functionInfoMap) {
      Array.from(this.functionInfoMap.values())
        .map((info) =>
          getOrCreateGraphPackage(
            this._functionGraph,
            info.packagePath,
            undefined,
          ),
        )
        .map((f) => getAllPackagesFromElement(f))
        .flat()
        .forEach((pkg) => this.displayablePackagesSet.add(pkg));
    }
  }

  async initializeDependencyDisplayablePackagesSet(): Promise<void> {
    if (this.dependencyFunctionInfoMap) {
      Array.from(this.dependencyFunctionInfoMap.values())
        .map((info) =>
          getOrCreateGraphPackage(
            this._functionGraph,
            info.packagePath,
            undefined,
          ),
        )
        .map((f) => getAllPackagesFromElement(f))
        .flat()
        .forEach((pkg) => this.dependencyDisplayablePackagesSet.add(pkg));
    }
  }

  setTreeData(
    val: TreeData<QueryBuilderFunctionsExplorerTreeNodeData> | undefined,
  ): void {
    this.treeData = val;
  }

  setDependencyTreeData(
    val: TreeData<QueryBuilderFunctionsExplorerTreeNodeData> | undefined,
  ): void {
    this.dependencyTreeData = val;
  }

  refreshTree(): void {
    if (this.treeData) {
      this.treeData = { ...this.treeData };
    }
    if (this.dependencyTreeData) {
      this.dependencyTreeData = { ...this.dependencyTreeData };
    }
  }

  get nonNullableTreeData(): TreeData<QueryBuilderFunctionsExplorerTreeNodeData> {
    return guaranteeNonNullable(
      this.treeData,
      'Query builder functions explorer tree data has not been initialized',
    );
  }

  onTreeNodeSelect = (
    queryBuilderState: QueryBuilderState,
    node: QueryBuilderFunctionsExplorerTreeNodeData,
    data: TreeData<QueryBuilderFunctionsExplorerTreeNodeData>,
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): void => {
    if (node.package) {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
        generateFunctionsExplorerTreeNodeChilrdren(
          queryBuilderState,
          node,
          data,
          rootPackageName,
        );
      }
      switch (rootPackageName) {
        case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
          this.setDependencyTreeData({ ...data });
          break;
        default:
          this.setTreeData({ ...data });
      }
    }
  };

  initializeFunctionInfoMap(): void {
    const functionInfoMap = new Map<string, FunctionAnalysisInfo>();
    const dependencyFunctionInfoMap = new Map<string, FunctionAnalysisInfo>();
    const functionInfos =
      buildFunctionAnalysisInfoFromConcreteFunctionDefinition(
        this.queryBuilderState.graphManagerState.graph.ownFunctions,
        this._functionGraph,
      );
    functionInfos.forEach((info) =>
      functionInfoMap.set(info.functionPath, info),
    );
    if (
      this.queryBuilderState.graphManagerState.graph.dependencyManager
        .hasDependencies
    ) {
      const dependencyFunctions =
        this.queryBuilderState.graphManagerState.graph.dependencyManager
          .functions;
      const dependencyFunctionInfos =
        buildFunctionAnalysisInfoFromConcreteFunctionDefinition(
          dependencyFunctions,
          this._functionGraph,
        );
      dependencyFunctionInfos.forEach((info) =>
        dependencyFunctionInfoMap.set(info.functionPath, info),
      );
    }
    const queryBuilderFunctionAnalysisInfo =
      this.queryBuilderState.buildFunctionAnalysisInfo();
    if (queryBuilderFunctionAnalysisInfo) {
      Array.from(
        queryBuilderFunctionAnalysisInfo.functionInfoMap.entries(),
      ).forEach(([path, info]) => functionInfoMap.set(path, info));
      Array.from(
        queryBuilderFunctionAnalysisInfo.dependencyFunctionInfoMap.entries(),
      ).forEach(([path, info]) => {
        dependencyFunctionInfoMap.set(path, info);
      });
    }
    const packagePathToFunctionInfoMap = new Map<
      string,
      FunctionAnalysisInfo[]
    >();
    Array.from(functionInfoMap.values())
      .concat(Array.from(dependencyFunctionInfoMap.values()))
      .forEach((info) => {
        const curr = packagePathToFunctionInfoMap.get(info.packagePath);
        if (curr) {
          packagePathToFunctionInfoMap.set(info.packagePath, [...curr, info]);
        } else {
          packagePathToFunctionInfoMap.set(info.packagePath, [info]);
        }
      });
    this.setPackagePathToFunctionInfoMap(packagePathToFunctionInfoMap);
    this.setFunctionInfoMap(functionInfoMap);
    this.setDependencyFunctionInfoMap(dependencyFunctionInfoMap);
  }

  initializeTreeData(): void {
    if (!this.initState.isInInitialState) {
      return;
    }

    this.initState.inProgress();
    this.initializeFunctionInfoMap();
    this.initializeDisplayablePackagesSet()
      .catch(noop())
      .finally(() => {
        this.setTreeData(
          getFunctionsExplorerTreeData(
            [this._functionGraph.root],
            this.queryBuilderState,
            ROOT_PACKAGE_NAME.MAIN,
          ),
        );
        this.setFunctionExplorerStates(
          this.functionInfoMap
            ? Array.from(this.functionInfoMap.values()).map(
                (info) => new QueryFunctionExplorerState(this, info),
              )
            : [],
        );
      });
    if (this.dependencyFunctionInfoMap) {
      this.initializeDependencyDisplayablePackagesSet()
        .catch(noop())
        .finally(() => {
          this.setDependencyTreeData(
            getFunctionsExplorerTreeData(
              [this._functionGraph.root],
              this.queryBuilderState,
              ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
            ),
          );
          this.setDependencyFunctionExplorerStates(
            this.dependencyFunctionInfoMap
              ? Array.from(this.dependencyFunctionInfoMap.values()).map(
                  (info) => new QueryFunctionExplorerState(this, info),
                )
              : [],
          );
        });
    }
    this.initState.pass();
  }
}
