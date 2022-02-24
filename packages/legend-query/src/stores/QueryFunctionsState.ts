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
  type Type,
  type PackageableElement,
  ConcreteFunctionDefinition,
  Package,
  Unit,
  ROOT_PACKAGE_NAME,
  PRIMITIVE_TYPE,
  Enumeration,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  isNonNullable,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import { getSimpleMultiplicityDescription } from '../components/shared/QueryBuilderUtils';
import { format } from 'date-fns';
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@finos/legend-application';

export enum QUERY_BUILDER_FUNCTION_TREE_DND_TYPE {
  FUNCTION = 'FUNCTION',
  PACKAGE = 'PACKAGE',
}

export interface QueryBuilderFunctionDragSource {
  node: QueryBuilderPackageElementTreeNodeData;
}

export class QueryBuilderPackageElementTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  dndType: string;
  childrenIds: string[] = [];
  isOpen?: boolean | undefined;
  packageableElement: PackageableElement;
  constructor(
    id: string,
    label: string,
    dndType: string,
    packageableElement: PackageableElement,
  ) {
    this.id = id;
    this.label = label;
    this.dndType = dndType;
    this.packageableElement = packageableElement;
  }
}

const getValidDisplayablePackageSet = (
  queryBuilderState: QueryBuilderState,
  rootPackageName: ROOT_PACKAGE_NAME,
): Set<Package> => {
  switch (rootPackageName) {
    case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
      return queryBuilderState.queryFunctionsState
        .dependencyDisplayablePackagesSet;
    default:
      return queryBuilderState.queryFunctionsState.displayablePackagesSet;
  }
};

export const generateQueryBuilderPackableElementTreeNodeData = (
  queryBuilderState: QueryBuilderState,
  element: PackageableElement,
  rootPackageName: ROOT_PACKAGE_NAME,
): QueryBuilderPackageElementTreeNodeData => ({
  id: element.path,
  dndType:
    element instanceof Package
      ? QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.PACKAGE
      : QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.FUNCTION,
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

export const populateQueryBuilderPackageElementTreeNodeChildren = (
  queryBuilderState: QueryBuilderState,
  node: QueryBuilderPackageElementTreeNodeData,
  data: TreeData<QueryBuilderPackageElementTreeNodeData>,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): void => {
  const validDisplayablePackageSet = getValidDisplayablePackageSet(
    queryBuilderState,
    rootPackageName,
  );
  if (node.childrenIds && node.packageableElement instanceof Package) {
    node.childrenIds = node.packageableElement.children
      .filter((child) => !(child instanceof Unit))
      .filter(
        (child) =>
          // avoid displaying empty packages
          (child instanceof Package && validDisplayablePackageSet.has(child)) ||
          child instanceof ConcreteFunctionDefinition,
      )
      .map((child) => child.path);
    node.packageableElement.children
      .filter((child) => !(child instanceof Unit))
      .filter(
        (child) =>
          // avoid displaying empty packages
          (child instanceof Package && validDisplayablePackageSet.has(child)) ||
          child instanceof ConcreteFunctionDefinition,
      )
      .map((child) =>
        generateQueryBuilderPackableElementTreeNodeData(
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
  }
};

export const getQueryBuilderPackageTreeData = (
  root: Package,
  queryBuilderState: QueryBuilderState,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): TreeData<QueryBuilderPackageElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderPackageElementTreeNodeData>();
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
      const childTreeNodeData = generateQueryBuilderPackableElementTreeNodeData(
        queryBuilderState,
        childPackage,
        rootPackageName,
      );
      addUniqueEntry(rootIds, childTreeNodeData.id);
      nodes.set(childTreeNodeData.id, childTreeNodeData);
    });
  return { rootIds, nodes };
};

export const getTreeChildNodes = (
  queryBuilderState: QueryBuilderState,
  node: QueryBuilderPackageElementTreeNodeData,
  data: TreeData<QueryBuilderPackageElementTreeNodeData>,
  rootPackageName = ROOT_PACKAGE_NAME.MAIN,
): QueryBuilderPackageElementTreeNodeData[] => {
  if (node.childrenIds && node.packageableElement instanceof Package) {
    populateQueryBuilderPackageElementTreeNodeChildren(
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
  }
  return [];
};

const getAllPackagesFromElement = (element: PackageableElement): Package[] => {
  if (element.package) {
    return [element.package].concat(getAllPackagesFromElement(element.package));
  }
  return [];
};

export const generateFunctionSignature = (
  element: ConcreteFunctionDefinition,
  fullPath: boolean,
): string =>
  `${fullPath ? element.path : element.name}(${element.parameters
    .map(
      (p) =>
        `${p.name}: ${p.type.value.name}${getSimpleMultiplicityDescription(
          p.multiplicity,
        )}`,
    )
    .join(', ')})`;

export const generateDefaultValueForPrimitiveParameter = (
  type: Type | undefined,
  index: number,
): string | number | boolean => {
  if (!type) {
    return `param${index}`;
  }
  switch (type.name) {
    case PRIMITIVE_TYPE.BOOLEAN:
      return true;
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.DECIMAL:
      return 0.0;
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return `%${format(new Date(2020, 10, 1), DATE_FORMAT)}`;
    case PRIMITIVE_TYPE.DATETIME:
      return `%${format(new Date(2020, 10, 1), DATE_TIME_FORMAT)}`;
    case PRIMITIVE_TYPE.STRICTTIME:
      return `%00:00:00`;
    case PRIMITIVE_TYPE.STRING:
      return "''";
    default:
      return `param${index}`;
  }
};

export const generateFunctionLambdaString = (
  element: ConcreteFunctionDefinition,
): string => {
  let lambdaString = '';
  if (element.parameters.length > 0) {
    for (let i = 0; i < element.parameters.length; i++) {
      const paramType = element.parameters.at(i)?.type.value;
      const separator = i !== element.parameters.length - 1 ? ', ' : '';
      if (paramType instanceof Enumeration) {
        lambdaString = `${lambdaString + paramType.path}.${
          (paramType as Enumeration).values.at(0)?.name
        }${separator}`;
      } else {
        lambdaString =
          lambdaString +
          generateDefaultValueForPrimitiveParameter(paramType, i) +
          separator;
      }
    }
  }
  return `${element.path}(${lambdaString})`;
};

export class QueryFunctionState {
  uuid = uuid();
  queryFunctionsState: QueryFunctionsState;
  concreteFunctionDefinition: ConcreteFunctionDefinition;

  constructor(
    queryFunctionsState: QueryFunctionsState,
    concreteFunctionDefinition: ConcreteFunctionDefinition,
  ) {
    makeObservable(this, {
      concreteFunctionDefinition: observable,
    });
    this.queryFunctionsState = queryFunctionsState;
    this.concreteFunctionDefinition = concreteFunctionDefinition;
  }
}

export class QueryFunctionsState {
  queryBuilderState: QueryBuilderState;
  treeData?: TreeData<QueryBuilderPackageElementTreeNodeData> | undefined;
  dependencyTreeData?:
    | TreeData<QueryBuilderPackageElementTreeNodeData>
    | undefined;
  concreteFunctionDefinitionStates: QueryFunctionState[] = [];
  dependencyConcreteFunctionDefinitionStates: QueryFunctionState[] = [];
  displayablePackagesSet: Set<Package> = new Set<Package>();
  dependencyDisplayablePackagesSet: Set<Package> = new Set<Package>();

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      concreteFunctionDefinitionStates: observable.ref,
      dependencyConcreteFunctionDefinitionStates: observable.ref,
      displayablePackagesSet: observable.ref,
      treeData: observable.ref,
      dependencyTreeData: observable.ref,
      setTreeData: action,
      setDependencyTreeData: action,
      refreshTree: action,
      refreshTreeData: action,
      onTreeNodeSelect: action,
      initializeDisplayablePackagesSet: action,
      initializeDependencyDisplayablePackagesSet: action,
    });
    this.queryBuilderState = queryBuilderState;
  }

  getTreeData(
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): TreeData<QueryBuilderPackageElementTreeNodeData> | undefined {
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
        return this.dependencyTreeData;
      default:
        return this.treeData;
    }
  }

  initializeDisplayablePackagesSet(): void {
    this.queryBuilderState.graphManagerState.graph.ownFunctions
      .map((f) => getAllPackagesFromElement(f))
      .flat()
      .forEach(this.displayablePackagesSet.add, this.displayablePackagesSet);
  }

  initializeDependencyDisplayablePackagesSet(): void {
    this.queryBuilderState.graphManagerState.graph.dependencyManager.functions
      .map((f) => getAllPackagesFromElement(f))
      .flat()
      .forEach(
        this.dependencyDisplayablePackagesSet.add,
        this.dependencyDisplayablePackagesSet,
      );
  }

  setTreeData(
    val: TreeData<QueryBuilderPackageElementTreeNodeData> | undefined,
  ): void {
    this.treeData = val;
  }

  setDependencyTreeData(
    val: TreeData<QueryBuilderPackageElementTreeNodeData> | undefined,
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

  get nonNullableTreeData(): TreeData<QueryBuilderPackageElementTreeNodeData> {
    return guaranteeNonNullable(
      this.treeData,
      'Query builder function tree data has not been initialized',
    );
  }

  onTreeNodeSelect = (
    queryBuilderState: QueryBuilderState,
    node: QueryBuilderPackageElementTreeNodeData,
    data: TreeData<QueryBuilderPackageElementTreeNodeData>,
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): void => {
    if (node.packageableElement instanceof Package) {
      if (node.childrenIds?.length) {
        node.isOpen = !node.isOpen;
        populateQueryBuilderPackageElementTreeNodeChildren(
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

  refreshTreeData(): void {
    this.initializeDisplayablePackagesSet();
    this.setTreeData(
      getQueryBuilderPackageTreeData(
        this.queryBuilderState.graphManagerState.graph.root,
        this.queryBuilderState,
      ),
    );
    this.concreteFunctionDefinitionStates =
      this.queryBuilderState.graphManagerState.graph.ownFunctions.map(
        (f) => new QueryFunctionState(this, f),
      );
    if (
      this.queryBuilderState.graphManagerState.graph.dependencyManager
        .hasDependencies
    ) {
      this.initializeDependencyDisplayablePackagesSet();
      this.setDependencyTreeData(
        getQueryBuilderPackageTreeData(
          this.queryBuilderState.graphManagerState.graph.dependencyManager.root,

          this.queryBuilderState,
          ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
        ),
      );
      this.dependencyConcreteFunctionDefinitionStates =
        this.queryBuilderState.graphManagerState.graph.dependencyManager.functions.map(
          (f) => new QueryFunctionState(this, f),
        );
    }
  }
}
