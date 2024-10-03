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

import type { QueryBuilderState } from '../../QueryBuilderState.js';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type CompilationError,
  type Class,
  type LambdaFunction,
  type VariableExpression,
  PackageableElementExplicitReference,
  RootGraphFetchTree,
  getAllSuperclasses,
  type Binding,
  PropertyGraphFetchTree,
} from '@finos/legend-graph';
import {
  type QueryBuilderGraphFetchTreeData,
  addQueryBuilderPropertyNode,
  buildGraphFetchTreeData,
} from './QueryBuilderGraphFetchTreeUtil.js';
import {
  generateExplorerTreePropertyNodeID,
  generateExplorerTreeSubtypeNodeID,
  type QueryBuilderExplorerTreePropertyNodeData,
} from '../../explorer/QueryBuilderExplorerState.js';
import {
  FETCH_STRUCTURE_IMPLEMENTATION,
  QueryBuilderFetchStructureImplementationState,
} from '../QueryBuilderFetchStructureImplementationState.js';
import type { QueryBuilderFetchStructureState } from '../QueryBuilderFetchStructureState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import type { LambdaFunctionBuilderOption } from '../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendGraphFetch } from './QueryBuilderGraphFetchTreeValueSpecificationBuilder.js';
import {
  deepClone,
  guaranteeNonNullable,
  hashArray,
  type Hashable,
  UnsupportedOperationError,
  ContentType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import { isValueExpressionReferencedInValue } from '../../QueryBuilderValueSpecificationHelper.js';
import type { ExportDataInfo } from '../../QueryBuilderResultState.js';

export enum SERIALIZATION_TYPE {
  PURE = 'PURE',
  EXTERNAL_FORMAT = 'EXTERNAL_FORMAT',
}

export enum GRAPH_FETCH_EXPORT_DATA_FORMAT {
  RESULT = 'RESULT',
}

const DEFAULT_PURE_CONFIG_TYPE_NAME = '@type';

export class PureSerializationConfig {
  typeKeyName: string;
  dateTimeFormat: string | undefined;
  includeType: boolean | undefined;
  includeEnumType: boolean | undefined;
  removePropertiesWithNullValues: boolean | undefined;
  removePropertiesWithEmptySets: boolean | undefined;
  fullyQualifiedTypePath: boolean | undefined;
  includeObjectReference: boolean | undefined;

  constructor() {
    this.typeKeyName = DEFAULT_PURE_CONFIG_TYPE_NAME;
    makeObservable(this, {
      typeKeyName: observable,
      includeType: observable,
      includeEnumType: observable,
      dateTimeFormat: observable,
      removePropertiesWithNullValues: observable,
      removePropertiesWithEmptySets: observable,
      fullyQualifiedTypePath: observable,
      includeObjectReference: observable,
      setTypeName: action,
      setIncludeObjectReference: action,
      setDateTimeFormat: action,
      setIncludeType: action,
      setFullyQualifiedTypePath: action,
      setRemovePropertiesWithEmptySets: action,
      setInclueEnumType: action,
      setRemovePropertiesWithNullValues: action,
    });
  }

  static createDefault(): PureSerializationConfig {
    const config = new PureSerializationConfig();
    config.typeKeyName = DEFAULT_PURE_CONFIG_TYPE_NAME;
    config.includeType = true;
    config.includeEnumType = true;
    config.removePropertiesWithNullValues = true;
    config.removePropertiesWithEmptySets = false;
    config.fullyQualifiedTypePath = true;
    return config;
  }

  setDateTimeFormat(val: string | undefined): void {
    this.dateTimeFormat = val;
  }

  setTypeName(val: string): void {
    this.typeKeyName = val;
  }

  setIncludeType(val: boolean): void {
    this.includeType = val;
  }

  setInclueEnumType(val: boolean): void {
    this.includeEnumType = val;
  }

  setRemovePropertiesWithNullValues(val: boolean): void {
    this.removePropertiesWithNullValues = val;
  }

  setRemovePropertiesWithEmptySets(val: boolean): void {
    this.removePropertiesWithEmptySets = val;
  }

  setFullyQualifiedTypePath(val: boolean): void {
    this.fullyQualifiedTypePath = val;
  }

  setIncludeObjectReference(val: boolean): void {
    this.includeObjectReference = val;
  }
}

export abstract class GraphFetchSerializationState {
  readonly queryBuilderGraphFetchTreeState: QueryBuilderGraphFetchTreeState;

  constructor(graphFetchTreeState: QueryBuilderGraphFetchTreeState) {
    this.queryBuilderGraphFetchTreeState = graphFetchTreeState;
  }

  abstract getLabel(): string;

  abstract get serializationContentType(): ContentType;
}

export class GraphFetchPureSerializationState extends GraphFetchSerializationState {
  config: PureSerializationConfig | undefined;
  configModal = false;

  constructor(graphFetchTreeState: QueryBuilderGraphFetchTreeState) {
    super(graphFetchTreeState);
    makeObservable(this, {
      config: observable,
      configModal: observable,
      setConfigModal: action,
    });
  }

  setConfig(value: PureSerializationConfig | undefined): void {
    this.config = value;
  }

  setConfigModal(val: boolean): void {
    this.configModal = val;
  }

  override getLabel(): string {
    return SERIALIZATION_TYPE.PURE;
  }

  override get serializationContentType(): ContentType {
    return ContentType.APPLICATION_JSON;
  }
}

export class GraphFetchExternalFormatSerializationState extends GraphFetchSerializationState {
  targetBinding: Binding;
  treeData: QueryBuilderGraphFetchTreeData | undefined;

  constructor(
    graphFetchTreeState: QueryBuilderGraphFetchTreeState,
    targetBinding: Binding,
    treeData: QueryBuilderGraphFetchTreeData | undefined,
  ) {
    super(graphFetchTreeState);
    makeObservable(this, {
      targetBinding: observable,
      treeData: observable.ref,
      serializationContentType: computed,
      setGraphFetchTree: action,
    });
    this.targetBinding = targetBinding;
    this.treeData = treeData;
  }

  setBinding(value: Binding): void {
    this.targetBinding = value;
  }

  setGraphFetchTree(val: QueryBuilderGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  addProperty(
    node: QueryBuilderExplorerTreePropertyNodeData,
    options?: {
      refreshTreeData?: boolean;
    },
  ): void {
    if (!this.treeData) {
      this.queryBuilderGraphFetchTreeState.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't add property: graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    addQueryBuilderPropertyNode(
      this.treeData,
      this.queryBuilderGraphFetchTreeState.queryBuilderState.explorerState
        .nonNullableTreeData,
      node,
      this.queryBuilderGraphFetchTreeState.queryBuilderState,
    );
    if (options?.refreshTreeData) {
      this.setGraphFetchTree({ ...this.treeData });
    }
  }

  override getLabel(): string {
    return SERIALIZATION_TYPE.EXTERNAL_FORMAT;
  }

  override get serializationContentType(): ContentType {
    const contentType = this.targetBinding.contentType;
    if (Object.values(ContentType).includes(contentType as ContentType)) {
      return contentType as ContentType;
    } else {
      // TEMP: need to investigate if flatdata should be returned as content type
      // for now we will assume all flatdata is csv
      if (contentType === 'application/x.flatdata') {
        return ContentType.TEXT_CSV;
      }
      return ContentType.TEXT_PLAIN;
    }
  }
}

export class QueryBuilderGraphFetchTreeState
  extends QueryBuilderFetchStructureImplementationState
  implements Hashable
{
  treeData?: QueryBuilderGraphFetchTreeData | undefined;
  /**
   * If set to `true` we will use `graphFetchChecked` function instead of `graphFetch`.
   * `graphFetchChecked` will do extra checks on constraints and only work on M2M use case for now.
   * Hence we default this to `false` for graph fetch to work universally.
   */
  isChecked = false;

  /**
   * Used to describe how the graph fetch tree is serialized to the final result set
   */
  serializationState: GraphFetchSerializationState;

  constructor(
    queryBuilderState: QueryBuilderState,
    fetchStructureState: QueryBuilderFetchStructureState,
  ) {
    super(queryBuilderState, fetchStructureState);

    makeObservable(this, {
      treeData: observable.ref,
      isChecked: observable,
      serializationState: observable,
      TEMPORARY__showPostFetchStructurePanel: computed,
      setGraphFetchTree: action,
      setSerializationState: action,
      setChecked: action,
      initialize: action,
      checkBeforeChangingImplementation: action,
    });

    // try to initialize the graph-fetch tree data using the setup class
    this.updateTreeData(this.queryBuilderState.class);
    // we will default to standard pure serialization with no config
    this.serializationState = new GraphFetchPureSerializationState(this);
  }

  get type(): string {
    return FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH;
  }

  override get fetchLabel(): string {
    return 'Class Properties';
  }

  override get canBeExportedToCube(): boolean {
    return false;
  }

  get usedExplorerTreePropertyNodeIDs(): string[] {
    if (!this.treeData) {
      return [];
    }
    const explorerTreeNodeIDIndex = new Map<string, string>();
    const ids: string[] = [];

    // traverse in breadth-first fashion
    const nodesToProcess: string[] = this.treeData.rootIds.slice();
    while (nodesToProcess.length) {
      const currentNodeID = guaranteeNonNullable(nodesToProcess[0]);
      const node = this.treeData.nodes.get(currentNodeID);
      if (!node) {
        continue;
      }
      let nodeID: string;
      const parentNodeID = node.parentId
        ? // since we traverse the nodes in order, parent node ID should already been computed
          guaranteeNonNullable(explorerTreeNodeIDIndex.get(node.parentId))
        : '';
      let generateID = '';
      if (node.tree instanceof RootGraphFetchTree) {
        generateID = `root.${node.tree.class.valueForSerialization ?? ''}`;
      } else if (node.tree instanceof PropertyGraphFetchTree) {
        generateID = node.tree.property.value.name;
      }
      const propertyNodeID = generateExplorerTreePropertyNodeID(
        parentNodeID,
        generateID,
      );
      ids.push(propertyNodeID);
      if (node.tree instanceof PropertyGraphFetchTree && node.tree.subType) {
        nodeID = generateExplorerTreeSubtypeNodeID(
          propertyNodeID,
          node.tree.subType.value.path,
        );
        getAllSuperclasses(node.tree.subType.value)
          .concat(node.tree.subType.value)
          .forEach((_class) =>
            ids.push(
              generateExplorerTreeSubtypeNodeID(propertyNodeID, _class.path),
            ),
          );
      } else {
        nodeID = propertyNodeID;
      }
      explorerTreeNodeIDIndex.set(node.id, nodeID);

      // update list of nodes to process
      nodesToProcess.shift();
      node.childrenIds.forEach((childId) => nodesToProcess.push(childId));
    }

    // de-duplicate
    return Array.from(new Set(ids).values());
  }

  get fetchStructureValidationIssues(): string[] {
    return [];
  }

  get allValidationIssues(): string[] {
    return [];
  }

  override initialize(): void {
    this.queryBuilderState.filterState.setShowPanel(true);
  }

  setSerializationState(val: GraphFetchSerializationState): void {
    this.serializationState = val;
  }

  setGraphFetchTree(val: QueryBuilderGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  setChecked(val: boolean): void {
    this.isChecked = val;
  }

  private updateTreeData(_class: Class | undefined): void {
    this.setGraphFetchTree(
      _class
        ? buildGraphFetchTreeData(
            new RootGraphFetchTree(
              PackageableElementExplicitReference.create(_class),
            ),
          )
        : undefined,
    );
  }

  override get exportDataFormatOptions(): string[] {
    return [GRAPH_FETCH_EXPORT_DATA_FORMAT.RESULT];
  }

  override getExportDataInfo(format: string): ExportDataInfo {
    if (format === GRAPH_FETCH_EXPORT_DATA_FORMAT.RESULT) {
      return {
        contentType: this.serializationState.serializationContentType,
      };
    } else {
      throw new UnsupportedOperationError(
        `Unsupported Graph Fetch export type ${format}`,
      );
    }
  }

  override initializeWithQuery(): void {
    return;
  }

  onClassChange(_class: Class | undefined): void {
    this.updateTreeData(_class);
  }

  appendFetchStructure(
    lambdaFunction: LambdaFunction,
    options?: LambdaFunctionBuilderOption,
  ): void {
    appendGraphFetch(this, lambdaFunction, options);
  }

  addProperty(
    node: QueryBuilderExplorerTreePropertyNodeData,
    options?: {
      refreshTreeData?: boolean;
    },
  ): void {
    if (!this.treeData) {
      this.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't add property: graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    addQueryBuilderPropertyNode(
      this.treeData,
      this.queryBuilderState.explorerState.nonNullableTreeData,
      node,
      this.queryBuilderState,
    );
    if (options?.refreshTreeData) {
      this.setGraphFetchTree({ ...this.treeData });
    }
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
  }

  clearCompilationError(): void {
    return;
  }

  fetchProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.addProperty(node, { refreshTreeData: true });
    if (
      this.serializationState instanceof
      GraphFetchExternalFormatSerializationState
    ) {
      this.serializationState.addProperty(deepClone(node), {
        refreshTreeData: true,
      });
    }
  }

  fetchProperties(nodes: QueryBuilderExplorerTreePropertyNodeData[]): void {
    if (!this.treeData) {
      this.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't add property: graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    nodes.forEach((nodeToAdd) => this.addProperty(nodeToAdd));
    this.setGraphFetchTree({
      ...this.treeData,
    });
  }

  checkBeforeChangingImplementation(onChange: () => void): void {
    if (this.treeData?.rootIds.length) {
      this.queryBuilderState.applicationStore.alertService.setActionAlertInfo({
        message:
          'Current graph-fetch will be lost when switching to projection mode. Do you still want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler:
              this.queryBuilderState.applicationStore.guardUnhandledError(
                async () => onChange(),
              ),
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      onChange();
    }
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return Boolean(
      Array.from(this.treeData?.nodes.values() ?? []).find((node) => {
        if (node.tree instanceof PropertyGraphFetchTree) {
          return node.tree.parameters.find((p) =>
            isValueExpressionReferencedInValue(variable, p),
          );
        }
        return undefined;
      }),
    );
  }

  get hasInvalidFilterValues(): boolean {
    return false;
  }

  get hasInvalidDerivedPropertyParameters(): boolean {
    return false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.GRAPH_FETCH_STATE,
      this.isChecked.toString(),
      this.treeData?.tree ?? '',
    ]);
  }
}
