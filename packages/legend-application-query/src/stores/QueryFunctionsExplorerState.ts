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
  ConcreteFunctionDefinition,
  Package,
  Unit,
  ROOT_PACKAGE_NAME,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  isNonNullable,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';
import type { TreeNodeData, TreeData } from '@finos/legend-art';

export const QUERY_BUILDER_FUNCTION_DND_TYPE = 'QUERY_BUILDER_FUNCTION';

export interface QueryBuilderFunctionsExplorerDragSource {
  node: QueryBuilderFunctionsExplorerTreeNodeData;
}

export class QueryBuilderFunctionsExplorerTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  childrenIds: string[] = [];
  isOpen?: boolean | undefined;
  packageableElement: PackageableElement;

  constructor(
    id: string,
    label: string,
    packageableElement: PackageableElement,
  ) {
    this.id = id;
    this.label = label;
    this.packageableElement = packageableElement;
  }
}

const getValidDisplayablePackageSet = (
  queryBuilderState: QueryBuilderState,
  rootPackageName: ROOT_PACKAGE_NAME,
): Set<Package> => {
  switch (rootPackageName) {
    case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
      return queryBuilderState.queryFunctionsExplorerState
        .dependencyDisplayablePackagesSet;
    default:
      return queryBuilderState.queryFunctionsExplorerState
        .displayablePackagesSet;
  }
};

export const generateFunctionsExplorerTreeNodeData = (
  queryBuilderState: QueryBuilderState,
  element: PackageableElement,
  rootPackageName: ROOT_PACKAGE_NAME,
): QueryBuilderFunctionsExplorerTreeNodeData => ({
  id: element.path,
  label: element.name,
  childrenIds:
    element instanceof Package
      ? element.children
          .filter((child) => !(child instanceof Unit))
          .filter(
            (child) =>
              (child instanceof Package &&
                getValidDisplayablePackageSet(
                  queryBuilderState,
                  rootPackageName,
                ).has(child)) ||
              child instanceof ConcreteFunctionDefinition,
          )
          .map((child) => child.path)
      : [],
  packageableElement: element,
});

const generateFunctionsExplorerTreeNodeChilrdren = (
  queryBuilderState: QueryBuilderState,
  node: QueryBuilderFunctionsExplorerTreeNodeData,
  data: TreeData<QueryBuilderFunctionsExplorerTreeNodeData>,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): void => {
  const validDisplayablePackageSet = getValidDisplayablePackageSet(
    queryBuilderState,
    rootPackageName,
  );
  node.childrenIds = (node.packageableElement as Package).children
    .filter((child) => !(child instanceof Unit))
    .filter(
      (child) =>
        // avoid displaying empty packages
        (child instanceof Package && validDisplayablePackageSet.has(child)) ||
        child instanceof ConcreteFunctionDefinition,
    )
    .map((child) => child.path);
  (node.packageableElement as Package).children
    .filter((child) => !(child instanceof Unit))
    .filter(
      (child) =>
        // avoid displaying empty packages
        (child instanceof Package && validDisplayablePackageSet.has(child)) ||
        child instanceof ConcreteFunctionDefinition,
    )
    .map((child) =>
      generateFunctionsExplorerTreeNodeData(
        queryBuilderState,
        child,
        rootPackageName,
      ),
    )
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
  root: Package,
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
        queryBuilderState.graphManagerState.graph.dependencyManager.functions
          .length === 0
      ) {
        return { rootIds, nodes };
      }
      break;
    default:
      if (queryBuilderState.graphManagerState.graph.ownFunctions.length === 0) {
        return { rootIds, nodes };
      }
  }

  root.children
    .slice()
    .filter((child) => !(child instanceof Unit))
    .filter(
      (child) =>
        child instanceof Package && validDisplayablePackageSet.has(child),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort(
      (a, b) => (b instanceof Package ? 1 : 0) - (a instanceof Package ? 1 : 0),
    )
    .forEach((childPackage) => {
      const childTreeNodeData = generateFunctionsExplorerTreeNodeData(
        queryBuilderState,
        childPackage,
        rootPackageName,
      );
      addUniqueEntry(rootIds, childTreeNodeData.id);
      nodes.set(childTreeNodeData.id, childTreeNodeData);
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
    .sort((a, b) => a.label.localeCompare(b.label))
    .sort(
      (a, b) =>
        (b.packageableElement instanceof Package ? 1 : 0) -
        (a.packageableElement instanceof Package ? 1 : 0),
    );
};

const getAllPackagesFromElement = (element: PackageableElement): Package[] => {
  if (element.package) {
    return [element.package].concat(getAllPackagesFromElement(element.package));
  }
  return [];
};

export class QueryFunctionExplorerState {
  readonly uuid = uuid();
  queryFunctionsState: QueryFunctionsExplorerState;
  concreteFunctionDefinition: ConcreteFunctionDefinition;

  constructor(
    queryFunctionsState: QueryFunctionsExplorerState,
    concreteFunctionDefinition: ConcreteFunctionDefinition,
  ) {
    makeObservable(this, {
      concreteFunctionDefinition: observable,
    });
    this.queryFunctionsState = queryFunctionsState;
    this.concreteFunctionDefinition = concreteFunctionDefinition;
  }
}

export class QueryFunctionsExplorerState {
  queryBuilderState: QueryBuilderState;
  treeData?: TreeData<QueryBuilderFunctionsExplorerTreeNodeData> | undefined;
  dependencyTreeData?:
    | TreeData<QueryBuilderFunctionsExplorerTreeNodeData>
    | undefined;
  functionExplorerStates: QueryFunctionExplorerState[] = [];
  dependencyFunctionExplorerStates: QueryFunctionExplorerState[] = [];
  displayablePackagesSet: Set<Package> = new Set<Package>();
  dependencyDisplayablePackagesSet: Set<Package> = new Set<Package>();

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      functionExplorerStates: observable.ref,
      dependencyFunctionExplorerStates: observable.ref,
      treeData: observable.ref,
      dependencyTreeData: observable.ref,
      setTreeData: action,
      setDependencyTreeData: action,
      refreshTree: action,
      onTreeNodeSelect: action,
    });
    this.queryBuilderState = queryBuilderState;
    this.initializeTreeData();
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

  async initializeDisplayablePackagesSet(): Promise<void> {
    this.queryBuilderState.graphManagerState.graph.ownFunctions
      .map((f) => getAllPackagesFromElement(f))
      .flat()
      .forEach((pkg) => this.displayablePackagesSet.add(pkg));
  }

  async initializeDependencyDisplayablePackagesSet(): Promise<void> {
    this.queryBuilderState.graphManagerState.graph.dependencyManager.functions
      .map((f) => getAllPackagesFromElement(f))
      .flat()
      .forEach((pkg) => this.dependencyDisplayablePackagesSet.add(pkg));
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
    if (node.packageableElement instanceof Package) {
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

  initializeTreeData(): void {
    this.initializeDisplayablePackagesSet().finally(() => {
      this.setTreeData(
        getFunctionsExplorerTreeData(
          this.queryBuilderState.graphManagerState.graph.root,
          this.queryBuilderState,
        ),
      );
      this.functionExplorerStates =
        this.queryBuilderState.graphManagerState.graph.ownFunctions.map(
          (f) => new QueryFunctionExplorerState(this, f),
        );
    });
    if (
      this.queryBuilderState.graphManagerState.graph.dependencyManager
        .hasDependencies
    ) {
      this.initializeDependencyDisplayablePackagesSet().finally(() => {
        this.setDependencyTreeData(
          getFunctionsExplorerTreeData(
            this.queryBuilderState.graphManagerState.graph.dependencyManager
              .root,
            this.queryBuilderState,
            ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
          ),
        );
        this.dependencyFunctionExplorerStates =
          this.queryBuilderState.graphManagerState.graph.dependencyManager.functions.map(
            (f) => new QueryFunctionExplorerState(this, f),
          );
      });
    }
  }
}
