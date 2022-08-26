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

import type { TreeNodeData, TreeData } from '@finos/legend-art';
import {
  guaranteeNonNullable,
  addUniqueEntry,
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  assertType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type AbstractProperty,
  type PureModel,
  type Type,
  type MappingModelCoverageAnalysisResult,
  type EnumMappedProperty,
  type MappedEntity,
  TYPICAL_MULTIPLICITY_TYPE,
  AbstractPropertyExpression,
  Class,
  VariableExpression,
  GenericType,
  GenericTypeExplicitReference,
  SimpleFunctionExpression,
  InstanceValue,
  extractElementNameFromPath,
  matchFunctionName,
  TYPE_CAST_TOKEN,
  VARIABLE_REFERENCE_TOKEN,
  ARROW_FUNCTION_TOKEN,
  Multiplicity,
  getAllClassProperties,
  getAllOwnClassProperties,
  getAllClassDerivedProperties,
  Enum,
  EntityMappedProperty,
  Enumeration,
  DerivedProperty,
  Property,
  Association,
  PRIMITIVE_TYPE,
  TdsExecutionResult,
  type ExecutionResult,
} from '@finos/legend-graph';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import {
  action,
  flow,
  flowResult,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../QueryBuilder_Const.js';
import {
  buildNonNumericPreviewDataQuery,
  buildNumericPreviewDataQuery,
  type QueryBuilderPreviewData,
} from '../QueryBuilderPreviewDataHelper.js';
import { QueryBuilderPropertySearchPanelState } from './QueryBuilderPropertySearchPanelState.js';

export enum QUERY_BUILDER_EXPLORER_TREE_DND_TYPE {
  ROOT = 'ROOT',
  CLASS_PROPERTY = 'CLASS_PROPERTY',
  ENUM_PROPERTY = 'ENUM_PROPERTY',
  PRIMITIVE_PROPERTY = 'PRIMITIVE_PROPERTY',
}

export const getPropertyNodeId = (
  parentId: string,
  propertyName: string,
): string => (parentId ? `${parentId}.${propertyName}` : propertyName);

export const getPropertyNodeIdForSubType = (
  parentId: string,
  subClassPath: string,
): string =>
  parentId
    ? `${parentId}${TYPE_CAST_TOKEN}${subClassPath}`
    : `${TYPE_CAST_TOKEN}${subClassPath}`;

export interface QueryBuilderExplorerTreeDragSource {
  node: QueryBuilderExplorerTreePropertyNodeData;
}

export abstract class QueryBuilderExplorerTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  dndText: string;
  childrenIds: string[] = [];
  isPartOfDerivedPropertyBranch: boolean;
  type: Type;
  mappingData: QueryBuilderExplorerTreeNodeMappingData;

  constructor(
    id: string,
    label: string,
    dndText: string,
    isPartOfDerivedPropertyBranch: boolean,
    type: Type,
    mappingData: QueryBuilderExplorerTreeNodeMappingData,
  ) {
    makeObservable(this, {
      isSelected: observable,
      setIsSelected: action,
    });

    this.id = id;
    this.label = label;
    this.dndText = dndText;
    this.isPartOfDerivedPropertyBranch = isPartOfDerivedPropertyBranch;
    this.type = type;
    this.mappingData = mappingData;
  }

  setIsSelected(val: boolean | undefined): void {
    this.isSelected = val;
  }
}

export type QueryBuilderExplorerTreeNodeMappingData = {
  mapped: boolean;
  mappedEntity?: MappedEntity | undefined;
};

export class QueryBuilderExplorerTreeRootNodeData extends QueryBuilderExplorerTreeNodeData {}

export class QueryBuilderExplorerTreePropertyNodeData extends QueryBuilderExplorerTreeNodeData {
  property: AbstractProperty;
  parentId: string;

  constructor(
    id: string,
    label: string,
    dndText: string,
    property: AbstractProperty,
    parentId: string,
    isPartOfDerivedPropertyBranch: boolean,
    mappingData: QueryBuilderExplorerTreeNodeMappingData,
  ) {
    super(
      id,
      label,
      dndText,
      isPartOfDerivedPropertyBranch,
      property.genericType.value.rawType,
      mappingData,
    );
    this.property = property;
    this.parentId = parentId;
  }
}

export class QueryBuilderExplorerTreeSubTypeNodeData extends QueryBuilderExplorerTreeNodeData {
  subclass: Class;
  parentId: string;
  multiplicity: Multiplicity;

  constructor(
    id: string,
    label: string,
    dndText: string,
    subclass: Class,
    parentId: string,
    isPartOfDerivedPropertyBranch: boolean,
    mappingData: QueryBuilderExplorerTreeNodeMappingData,
    multiplicity: Multiplicity,
  ) {
    super(
      id,
      label,
      dndText,
      isPartOfDerivedPropertyBranch,
      subclass,
      mappingData,
    );
    this.subclass = subclass;
    this.parentId = parentId;
    this.multiplicity = multiplicity;
  }
}

export const buildPropertyExpressionFromExplorerTreeNodeData = (
  treeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node: QueryBuilderExplorerTreePropertyNodeData,
  graph: PureModel,
  allMappedPropertyNodes: QueryBuilderExplorerTreeNodeData[],
): AbstractPropertyExpression => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const projectionColumnLambdaVariable = new VariableExpression(
    DEFAULT_LAMBDA_VARIABLE_NAME,
    multiplicityOne,
  );
  const propertyExpression = new AbstractPropertyExpression(
    '',
    multiplicityOne,
  );
  propertyExpression.func = guaranteeNonNullable(node.property);
  let currentExpression: AbstractPropertyExpression | SimpleFunctionExpression =
    propertyExpression;
  let parentNode =
    treeData.nodes.get(node.parentId) ??
    allMappedPropertyNodes.find((n) => n.id === node.parentId);
  let currentNode: QueryBuilderExplorerTreeNodeData = node;
  while (
    parentNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
    parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
  ) {
    let parentPropertyExpression;
    if (parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData) {
      parentPropertyExpression = new SimpleFunctionExpression(
        extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE),
        multiplicityOne,
      );
    } else {
      parentPropertyExpression = new AbstractPropertyExpression(
        '',
        multiplicityOne,
      );
      parentPropertyExpression.func = guaranteeNonNullable(parentNode.property);
    }
    currentExpression.parametersValues.push(parentPropertyExpression);
    if (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      const subclass = new InstanceValue(
        multiplicityOne,
        GenericTypeExplicitReference.create(new GenericType(currentNode.type)),
      );
      currentExpression.parametersValues.push(subclass);
    }
    currentExpression = parentPropertyExpression;
    currentNode = parentNode;
    parentNode = treeData.nodes.get(parentNode.parentId);
    if (
      !parentNode &&
      (currentNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
        currentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData)
    ) {
      for (const propertyNode of allMappedPropertyNodes) {
        if (propertyNode.id === currentNode.parentId) {
          parentNode = propertyNode;
          break;
        }
      }
    }
  }
  currentExpression.parametersValues.push(projectionColumnLambdaVariable);
  if (currentExpression instanceof SimpleFunctionExpression) {
    const subclass = new InstanceValue(
      multiplicityOne,
      GenericTypeExplicitReference.create(new GenericType(currentNode.type)),
    );
    currentExpression.parametersValues.push(subclass);
  }
  return propertyExpression;
};

export const generatePropertyNodeMappingData = (
  property: AbstractProperty,
  parentMappingData: QueryBuilderExplorerTreeNodeMappingData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreeNodeMappingData => {
  // If the property node's parent node does not have a mapped entity,
  // it means the owner class is not mapped, i.e. this property is not mapped.
  if (parentMappingData.mappedEntity) {
    const mappedProp = parentMappingData.mappedEntity.__PROPERTIES_INDEX.get(
      property.name,
    );
    if (
      property.genericType.value.rawType instanceof Class ||
      property.genericType.value.rawType instanceof Enum
    ) {
      if (mappedProp) {
        return {
          mapped: true,
          mappedEntity: modelCoverageAnalysisResult.__ENTITIES_INDEX.get(
            mappedProp instanceof EntityMappedProperty
              ? mappedProp.entityPath
              : (mappedProp as EnumMappedProperty).enumPath,
          ),
        };
      }
    }
    return { mapped: mappedProp !== undefined };
  }
  return { mapped: false };
};

const generateSubtypeNodeMappingData = (
  subclass: Class,
  parentMappingData: QueryBuilderExplorerTreeNodeMappingData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreeNodeMappingData => {
  // If the subtype node's parent node does not have a mapped entity,
  // it means the superclass is not mapped, i.e. this subtype is not mapped
  if (parentMappingData.mappedEntity) {
    const mappedSubtype = parentMappingData.mappedEntity.properties.find(
      (p): p is EntityMappedProperty =>
        // NOTE: if `subType` is specified in `EntityMappedProperty` it means
        // that subtype is mapped
        p instanceof EntityMappedProperty && p.subType === subclass.path,
    );
    if (mappedSubtype) {
      return {
        mapped: true,
        mappedEntity: modelCoverageAnalysisResult.__ENTITIES_INDEX.get(
          mappedSubtype.entityPath,
        ),
      };
    } else if (parentMappingData.mappedEntity.path === subclass.path) {
      // This is to handle the case where the property mapping is pointing
      // directly at the class mapping of a subtype of the type of that property
      //
      // For example: we have class `A` extends `B`, and we're looking at class `C` with property
      // `b` of type B. However, the mapping we use has property mapping for `b` pointing at
      // a class mapping for `A`.
      //
      // In this case, when building explorer tree node for property `b` of `C`, according to
      // the mapping model coverage result, the mapped entity corresponding to this property
      // will be mapped entity for `A`. However, as we build the explorer tree,
      // so we will not immediately build the subtype node for `A`. As such, we have to propagate
      // the mapped entity data downstream like the following. As a result, when building
      // the mapping data for subtype node, we have to take this case into consideration
      //
      // See https://github.com/finos/legend-studio/issues/1437
      return {
        mapped: true,
        mappedEntity: parentMappingData.mappedEntity,
      };
    }
  }
  return { mapped: false };
};

export const getRootMappingData = (
  _class: Class,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreeNodeMappingData => ({
  mapped: true,
  mappedEntity: modelCoverageAnalysisResult.__ENTITIES_INDEX.get(_class.path),
});

const generateExplorerTreeClassNodeChildrenIDs = (
  node: QueryBuilderExplorerTreeNodeData,
): string[] => {
  const currentClass = node.type as Class;
  const idsFromProperties = (
    node instanceof QueryBuilderExplorerTreeSubTypeNodeData
      ? getAllOwnClassProperties(currentClass)
      : getAllClassProperties(currentClass).concat(
          getAllClassDerivedProperties(currentClass),
        )
  ).map((p) => `${node.id}.${p.name}`);
  const idsFromsubclasses = currentClass._subclasses.map(
    (subclass) => `${node.id}${TYPE_CAST_TOKEN}${subclass.path}`,
  );
  return idsFromProperties.concat(idsFromsubclasses);
};

export const getQueryBuilderPropertyNodeData = (
  property: AbstractProperty,
  parentNode: QueryBuilderExplorerTreeNodeData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreePropertyNodeData | undefined => {
  const mappingNodeData = generatePropertyNodeMappingData(
    property,
    parentNode.mappingData,
    modelCoverageAnalysisResult,
  );
  const isPartOfDerivedPropertyBranch =
    property instanceof DerivedProperty ||
    parentNode.isPartOfDerivedPropertyBranch ||
    (parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
      parentNode.property instanceof DerivedProperty);
  // NOTE: in case of association, to avoid infinite exploration path
  // we will prune it, on the other hand, in circular composition case
  // A has property of type B and B has property of type A
  // we will allow users to explore as deeply as they wish
  // See https://github.com/finos/legend-studio/issues/1172
  if (
    property instanceof Property &&
    parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
    parentNode.property instanceof Property &&
    property._OWNER instanceof Association &&
    parentNode.property._OWNER instanceof Association &&
    parentNode.property._OWNER === property._OWNER
  ) {
    return undefined;
  }
  const propertyNode = new QueryBuilderExplorerTreePropertyNodeData(
    getPropertyNodeId(
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? ''
        : parentNode.id,
      property.name,
    ),
    property.name,
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? `${VARIABLE_REFERENCE_TOKEN}x`
        : parentNode.dndText
    }.${property.name}`,
    property,
    parentNode.id,
    isPartOfDerivedPropertyBranch,
    mappingNodeData,
  );
  if (propertyNode.type instanceof Class) {
    propertyNode.childrenIds =
      generateExplorerTreeClassNodeChildrenIDs(propertyNode);
  }
  return propertyNode;
};

export const getQueryBuilderSubTypeNodeData = (
  subclass: Class,
  parentNode: QueryBuilderExplorerTreeNodeData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreeSubTypeNodeData => {
  const subTypeNode = new QueryBuilderExplorerTreeSubTypeNodeData(
    getPropertyNodeIdForSubType(
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? ''
        : parentNode.id,
      subclass.path,
    ),
    subclass.name,
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? `${VARIABLE_REFERENCE_TOKEN}${DEFAULT_LAMBDA_VARIABLE_NAME}${ARROW_FUNCTION_TOKEN}${extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
          )}(${TYPE_CAST_TOKEN}${subclass.path})`
        : `${
            parentNode.dndText
          }${ARROW_FUNCTION_TOKEN}${extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
          )}(${TYPE_CAST_TOKEN}${subclass.path})`
    }`,
    subclass,
    parentNode.id,
    false,
    generateSubtypeNodeMappingData(
      subclass,
      parentNode.mappingData,
      modelCoverageAnalysisResult,
    ),
    parentNode instanceof QueryBuilderExplorerTreePropertyNodeData
      ? parentNode.property.multiplicity
      : parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
      ? parentNode.multiplicity
      : new Multiplicity(1, 1),
  );
  subTypeNode.childrenIds =
    generateExplorerTreeClassNodeChildrenIDs(subTypeNode);
  return subTypeNode;
};

const getQueryBuilderTreeData = (
  rootClass: Class,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): TreeData<QueryBuilderExplorerTreeNodeData> => {
  const rootIds = [];
  const nodes = new Map<string, QueryBuilderExplorerTreeNodeData>();
  const mappingData = getRootMappingData(
    rootClass,
    modelCoverageAnalysisResult,
  );
  const treeRootNode = new QueryBuilderExplorerTreeRootNodeData(
    '@dummy_rootNode',
    rootClass.name,
    rootClass.path,
    false,
    rootClass,
    mappingData,
  );
  treeRootNode.isOpen = true;
  nodes.set(treeRootNode.id, treeRootNode);
  rootIds.push(treeRootNode.id);
  getAllClassProperties(rootClass)
    .concat(getAllClassDerivedProperties(rootClass))
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort(
      (a, b) =>
        (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) -
        (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0),
    )
    .forEach((property) => {
      const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
        property,
        treeRootNode,
        modelCoverageAnalysisResult,
      );
      if (propertyTreeNodeData) {
        addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
        nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
      }
    });
  rootClass._subclasses.forEach((subclass) => {
    const subTypeTreeNodeData = getQueryBuilderSubTypeNodeData(
      subclass,
      treeRootNode,
      modelCoverageAnalysisResult,
    );
    addUniqueEntry(treeRootNode.childrenIds, subTypeTreeNodeData.id);
    nodes.set(subTypeTreeNodeData.id, subTypeTreeNodeData);
  });
  return { rootIds, nodes };
};

export class QueryBuilderExplorerPreviewDataState {
  isGeneratingPreviewData = false;
  propertyName = '(unknown)';
  previewData?: QueryBuilderPreviewData | undefined;

  constructor() {
    makeAutoObservable(this, {
      previewData: observable.ref,
      setPropertyName: action,
      setIsGeneratingPreviewData: action,
      setPreviewData: action,
    });
  }

  setPropertyName(val: string): void {
    this.propertyName = val;
  }

  setIsGeneratingPreviewData(val: boolean): void {
    this.isGeneratingPreviewData = val;
  }

  setPreviewData(val: QueryBuilderPreviewData | undefined): void {
    this.previewData = val;
  }
}

export class QueryBuilderExplorerState {
  queryBuilderState: QueryBuilderState;
  previewDataState = new QueryBuilderExplorerPreviewDataState();
  treeData?: TreeData<QueryBuilderExplorerTreeNodeData> | undefined;
  humanizePropertyName = true;
  showUnmappedProperties = false;
  highlightUsedProperties = true;
  propertySearchPanelState: QueryBuilderPropertySearchPanelState;
  mappingModelCoverageAnalysisResult?: MappingModelCoverageAnalysisResult;
  mappingModelCoverageAnalysisState = ActionState.create();

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      previewDataState: false,
      treeData: observable.ref,
      highlightUsedProperties: observable,
      setTreeData: action,
      refreshTree: action,
      refreshTreeData: action,
      setHumanizePropertyName: action,
      setShowUnmappedProperties: action,
      previewData: flow,
      setHighlightUsedProperties: action,
      analyzeMappingModelCoverage: flow,
    });

    this.queryBuilderState = queryBuilderState;
    this.propertySearchPanelState = new QueryBuilderPropertySearchPanelState(
      this.queryBuilderState,
    );
  }

  get nonNullableTreeData(): TreeData<QueryBuilderExplorerTreeNodeData> {
    return guaranteeNonNullable(
      this.treeData,
      'Query builder explorer tree data has not been initialized',
    );
  }

  setTreeData(
    val: TreeData<QueryBuilderExplorerTreeNodeData> | undefined,
  ): void {
    this.treeData = val;
  }

  refreshTree(): void {
    if (this.treeData) {
      this.treeData = { ...this.treeData };
    }
  }

  setHumanizePropertyName(val: boolean): void {
    this.humanizePropertyName = val;
  }

  setShowUnmappedProperties(val: boolean): void {
    this.showUnmappedProperties = val;
  }

  setHighlightUsedProperties(val: boolean): void {
    this.highlightUsedProperties = val;
  }

  refreshTreeData(): void {
    const _class = this.queryBuilderState.querySetupState._class;
    const _mapping = this.queryBuilderState.querySetupState.mapping;
    this.setTreeData(
      _class && _mapping && this.mappingModelCoverageAnalysisResult
        ? getQueryBuilderTreeData(
            _class,
            this.mappingModelCoverageAnalysisResult,
          )
        : undefined,
    );
  }

  *analyzeMappingModelCoverage(): GeneratorFn<void> {
    if (this.queryBuilderState.querySetupState.mapping) {
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.inProgress();
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.setMessage(
        'Analyzing Mapping...',
      );
      try {
        this.mappingModelCoverageAnalysisResult = (yield flowResult(
          this.queryBuilderState.graphManagerState.graphManager.analyzeMappingModelCoverage(
            this.queryBuilderState.querySetupState.mapping,
            this.queryBuilderState.graphManagerState.graph,
          ),
        )) as MappingModelCoverageAnalysisResult;
        this.queryBuilderState.explorerState.refreshTreeData();
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notifyError(error.message);
      }
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.pass();
    }
  }

  *previewData(
    node: QueryBuilderExplorerTreePropertyNodeData,
  ): GeneratorFn<void> {
    const runtime = this.queryBuilderState.querySetupState.runtimeValue;
    if (!runtime) {
      this.queryBuilderState.applicationStore.notifyWarning(
        `Can't preview data for property '${node.property.name}': runtime is not specified`,
      );
      return;
    }
    if (
      !node.mappingData.mapped ||
      !this.queryBuilderState.querySetupState._class ||
      !this.queryBuilderState.querySetupState.mapping
    ) {
      return;
    }
    if (
      this.queryBuilderState.explorerState.previewDataState
        .isGeneratingPreviewData
    ) {
      this.queryBuilderState.applicationStore.notifyWarning(
        `Can't preview data for property '${node.property.name}': another preview request is being executed`,
      );
      return;
    }
    this.queryBuilderState.explorerState.previewDataState.setPropertyName(
      node.property.name,
    );
    this.queryBuilderState.explorerState.previewDataState.setIsGeneratingPreviewData(
      true,
    );
    const propertyExpression = buildPropertyExpressionFromExplorerTreeNodeData(
      this.queryBuilderState.explorerState.nonNullableTreeData,
      node,
      this.queryBuilderState.graphManagerState.graph,
      this.queryBuilderState.explorerState.propertySearchPanelState
        .allMappedPropertyNodes,
    );
    const propertyType = node.property.genericType.value.rawType;
    try {
      switch (propertyType.path) {
        case PRIMITIVE_TYPE.NUMBER:
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT: {
          const previewResult =
            (yield this.queryBuilderState.graphManagerState.graphManager.executeMapping(
              buildNumericPreviewDataQuery(
                this.queryBuilderState,
                propertyExpression,
              ),
              this.queryBuilderState.querySetupState.mapping,
              runtime,
              this.queryBuilderState.graphManagerState.graph,
            )) as ExecutionResult;
          assertType(
            previewResult,
            TdsExecutionResult,
            `Unexpected preview data format`,
          );
          const previewResultData =
            previewResult.result as QueryBuilderPreviewData;
          // transpose the result
          const transposedPreviewResultData = {
            columns: ['Aggregation', 'Value'],
            rows: previewResultData.columns.map((column, idx) => ({
              values: [
                column,
                guaranteeNonNullable(previewResultData.rows[0]).values[
                  idx
                ] as string,
              ],
            })),
          };
          this.queryBuilderState.explorerState.previewDataState.setPreviewData(
            transposedPreviewResultData,
          );
          break;
        }
        case PRIMITIVE_TYPE.BOOLEAN:
        case PRIMITIVE_TYPE.STRING:
        case PRIMITIVE_TYPE.DATE:
        case PRIMITIVE_TYPE.STRICTDATE:
        case PRIMITIVE_TYPE.DATETIME: {
          const previewResult =
            (yield this.queryBuilderState.graphManagerState.graphManager.executeMapping(
              buildNonNumericPreviewDataQuery(
                this.queryBuilderState,
                propertyExpression,
              ),
              this.queryBuilderState.querySetupState.mapping,
              runtime,
              this.queryBuilderState.graphManagerState.graph,
            )) as ExecutionResult;
          assertType(
            previewResult,
            TdsExecutionResult,
            `Unexpected preview data format`,
          );
          this.queryBuilderState.explorerState.previewDataState.setPreviewData(
            previewResult.result as QueryBuilderPreviewData,
          );
          break;
        }
        default:
          throw new UnsupportedOperationError(
            `No preview support for property of type '${propertyType.path}'`,
          );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.notifyWarning(
        `Can't preview data for property '${node.property.name}'. Error: ${error.message}`,
      );
      this.queryBuilderState.explorerState.previewDataState.setPreviewData(
        undefined,
      );
    } finally {
      this.queryBuilderState.explorerState.previewDataState.setIsGeneratingPreviewData(
        false,
      );
    }
  }
}
