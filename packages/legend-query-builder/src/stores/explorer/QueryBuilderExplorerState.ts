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
  StopWatch,
} from '@finos/legend-shared';
import {
  type AbstractProperty,
  type Type,
  type MappingModelCoverageAnalysisResult,
  type EnumMappedProperty,
  type MappedEntity,
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
  TDSExecutionResult,
  type ExecutionResult,
  getAllSubclasses,
  PropertyExplicitReference,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilderConfig.js';
import {
  buildNonNumericPreviewDataQuery,
  buildNumericPreviewDataQuery,
  type QueryBuilderPreviewData,
} from '../QueryBuilderPreviewDataHelper.js';
import { QueryBuilderPropertySearchState } from './QueryBuilderPropertySearchState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import { propertyExpression_setFunc } from '../shared/ValueSpecificationModifierHelper.js';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';
import { createRef } from 'react';

export enum QUERY_BUILDER_EXPLORER_TREE_DND_TYPE {
  ROOT = 'ROOT',
  CLASS_PROPERTY = 'CLASS_PROPERTY',
  ENUM_PROPERTY = 'ENUM_PROPERTY',
  PRIMITIVE_PROPERTY = 'PRIMITIVE_PROPERTY',
}

export const generateExplorerTreePropertyNodeID = (
  parentId: string,
  propertyName: string,
): string => `${parentId ? `${parentId}.` : ''}${propertyName}`;

export const generateExplorerTreeSubtypeNodeID = (
  parentId: string,
  subClassPath: string,
): string => `${parentId ? parentId : ''}${TYPE_CAST_TOKEN}${subClassPath}`;

export interface QueryBuilderExplorerTreeDragSource {
  node: QueryBuilderExplorerTreePropertyNodeData;
}

export abstract class QueryBuilderExplorerTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  isHighlighting?: boolean | undefined;
  id: string;
  label: string;
  dndText: string;
  childrenIds: string[] = [];
  isPartOfDerivedPropertyBranch: boolean;
  type: Type;
  mappingData: QueryBuilderExplorerTreeNodeMappingData;
  elementRef: React.RefObject<HTMLDivElement>;

  constructor(
    id: string,
    label: string,
    dndText: string,
    isPartOfDerivedPropertyBranch: boolean,
    type: Type,
    mappingData: QueryBuilderExplorerTreeNodeMappingData,
  ) {
    makeObservable(this, {
      isHighlighting: observable,
      isSelected: observable,
      setIsHighlighting: action,
      setIsSelected: action,
    });

    this.id = id;
    this.label = label;
    this.dndText = dndText;
    this.isPartOfDerivedPropertyBranch = isPartOfDerivedPropertyBranch;
    this.type = type;
    this.mappingData = mappingData;
    this.elementRef = createRef();
  }

  setIsSelected(val: boolean | undefined): void {
    this.isSelected = val;
  }

  setIsHighlighting(val: boolean | undefined): void {
    this.isHighlighting = val;
  }
}

export type QueryBuilderExplorerTreeNodeMappingData = {
  mapped: boolean;
  mappedEntity?: MappedEntity | undefined;
  // used to describe the mapped property
  entityMappedProperty?: EntityMappedProperty | undefined;
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
    type?: Type | undefined,
  ) {
    super(
      id,
      label,
      dndText,
      isPartOfDerivedPropertyBranch,
      type ?? property.genericType.value.rawType,
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
  node: QueryBuilderExplorerTreePropertyNodeData,
  explorerState: QueryBuilderExplorerState,
  lambdaParameterName?: string,
): AbstractPropertyExpression => {
  const treeData = explorerState.nonNullableTreeData;
  const propertySearchIndexedTreeNodes =
    explorerState.propertySearchState.indexedExplorerTreeNodes;
  const projectionColumnLambdaVariable = new VariableExpression(
    lambdaParameterName ?? DEFAULT_LAMBDA_VARIABLE_NAME,
    Multiplicity.ONE,
  );
  const propertyExpression = new AbstractPropertyExpression('');
  propertyExpression_setFunc(
    propertyExpression,
    PropertyExplicitReference.create(guaranteeNonNullable(node.property)),
  );
  let currentExpression: AbstractPropertyExpression | SimpleFunctionExpression =
    propertyExpression;
  let parentNode =
    treeData.nodes.get(node.parentId) ??
    propertySearchIndexedTreeNodes.find((n) => n.id === node.parentId);
  let currentNode: QueryBuilderExplorerTreeNodeData | undefined = node;
  while (
    currentNode &&
    (parentNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
      parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData)
  ) {
    // NOTE: here, we deliberately simplify subtypes chain
    // $x.employees->subType(@Person)->subType(@Staff).department will be simplified to $x.employees->subType(@Staff).department
    if (
      parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData &&
      currentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
    ) {
      parentNode = treeData.nodes.get(parentNode.parentId);
      continue;
    }
    let parentPropertyExpression;
    let explorerTreePropertyNodeDataWithSubtype = false;
    if (parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData) {
      parentPropertyExpression = new SimpleFunctionExpression(
        extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE),
      );
    } else if (
      parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
      parentNode.mappingData.entityMappedProperty?.subType
    ) {
      parentPropertyExpression = new SimpleFunctionExpression(
        extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE),
      );
      currentExpression.parametersValues.push(parentPropertyExpression);
      currentExpression = parentPropertyExpression;
      parentPropertyExpression = new AbstractPropertyExpression('');
      propertyExpression_setFunc(
        parentPropertyExpression,
        PropertyExplicitReference.create(
          guaranteeNonNullable(parentNode.property),
        ),
      );
      explorerTreePropertyNodeDataWithSubtype = true;
      currentNode = parentNode;
      parentNode = treeData.nodes.get(parentNode.parentId);
    } else {
      parentPropertyExpression = new AbstractPropertyExpression('');
      propertyExpression_setFunc(
        parentPropertyExpression,
        PropertyExplicitReference.create(
          guaranteeNonNullable(parentNode.property),
        ),
      );
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
        Multiplicity.ONE,
        GenericTypeExplicitReference.create(new GenericType(currentNode.type)),
      );
      currentExpression.parametersValues.push(subclass);
    }
    currentExpression = parentPropertyExpression;
    if (!explorerTreePropertyNodeDataWithSubtype) {
      currentNode = parentNode;
      parentNode =
        parentNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
        parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
          ? treeData.nodes.get(parentNode.parentId)
          : undefined;
    }
    if (
      !parentNode &&
      (currentNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
        currentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData)
    ) {
      for (const propertyNode of propertySearchIndexedTreeNodes) {
        if (propertyNode.id === currentNode.parentId) {
          parentNode = propertyNode;
          break;
        }
      }
    }
  }
  currentExpression.parametersValues.push(projectionColumnLambdaVariable);
  if (currentNode && currentExpression instanceof SimpleFunctionExpression) {
    const subclass = new InstanceValue(
      Multiplicity.ONE,
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
          entityMappedProperty:
            mappedProp instanceof EntityMappedProperty ? mappedProp : undefined,
        };
      }
    }
    return { mapped: mappedProp !== undefined };
  }
  return { mapped: false };
};

export const generateSubtypeNodeMappingData = (
  subclass: Class,
  parentMappingData: QueryBuilderExplorerTreeNodeMappingData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreeNodeMappingData => {
  // NOTE: since we build subclass trees, there's a chance in a particular case,
  // a _deep_ subclass is mapped, for example: A extends B extends C extends D ... extends Z
  // and Z is mapped, when we build the mapping data for node A, B, C, we need to make sure
  // we are aware of the fact that Z is mapped and pass the mapping data information properly
  // until we process the node Z.
  const allCompatibleTypePaths = getAllSubclasses(subclass)
    .concat(subclass)
    .map((_class) => _class.path);
  const subtype = parentMappingData.entityMappedProperty?.subType;
  // If the subtype node's parent node does not have a mapped entity,
  // it means the superclass is not mapped, i.e. this subtype is not mapped
  if (parentMappingData.mappedEntity) {
    const mappedSubtype = parentMappingData.mappedEntity.properties.find(
      (mappedProperty): mappedProperty is EntityMappedProperty =>
        Boolean(
          // NOTE: if `subType` is specified in `EntityMappedProperty` it means
          // that subtype is mapped
          mappedProperty instanceof EntityMappedProperty &&
            mappedProperty.subType &&
            allCompatibleTypePaths.includes(mappedProperty.subType),
        ),
    );
    if (mappedSubtype) {
      return {
        mapped: true,
        mappedEntity: modelCoverageAnalysisResult.__ENTITIES_INDEX.get(
          mappedSubtype.entityPath,
        ),
      };
    } else if (
      allCompatibleTypePaths.includes(parentMappingData.mappedEntity.path) ||
      // hanlde cases where multi class mappings for same subtype
      (subtype && allCompatibleTypePaths.includes(subtype))
    ) {
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
): QueryBuilderExplorerTreeNodeMappingData => {
  const mappedEntity = modelCoverageAnalysisResult.__ENTITIES_INDEX.get(
    _class.path,
  );
  return {
    mapped: Boolean(mappedEntity),
    mappedEntity,
  };
};

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
  const _subclasses =
    property.genericType.value.rawType instanceof Class
      ? getAllSubclasses(property.genericType.value.rawType)
      : [];
  const subClass = mappingNodeData.entityMappedProperty?.subType
    ? _subclasses.find(
        (c) => c.path === mappingNodeData.entityMappedProperty?.subType,
      )
    : undefined;
  const propertyNode = new QueryBuilderExplorerTreePropertyNodeData(
    subClass
      ? generateExplorerTreeSubtypeNodeID(
          generateExplorerTreePropertyNodeID(
            parentNode instanceof QueryBuilderExplorerTreeRootNodeData
              ? ''
              : parentNode.id,
            property.name,
          ),
          subClass.path,
        )
      : generateExplorerTreePropertyNodeID(
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
    // Inorder to cast the properties to the right subType based on what mapping analysis
    // returns we assign the type of the property node to the mapped subClass
    subClass,
  );

  // Update parent's childrenIds for this proerty
  // if subClass is defined, it means current QueryBuilderExplorerTreePropertyNodeData's id will be employees.partyBase@my::Party
  // However, since parentNode.childrenIds is generated before we visiting this child and it doesn't consider subtype information,
  // its value would be employees.partyBase. Mismatch will cause mapped-properties not showing up in the explorer tree.
  if (subClass) {
    const currentParentChildIDForThisProperty =
      generateExplorerTreePropertyNodeID(
        parentNode instanceof QueryBuilderExplorerTreeRootNodeData
          ? ''
          : parentNode.id,
        property.name,
      );
    if (parentNode.childrenIds.includes(currentParentChildIDForThisProperty)) {
      parentNode.childrenIds = [
        ...parentNode.childrenIds.filter(
          (id) => id !== currentParentChildIDForThisProperty,
        ),
        propertyNode.id,
      ];
    }
  }

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
    generateExplorerTreeSubtypeNodeID(
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
        : Multiplicity.ONE,
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
  previewDataAbortController?: AbortController | undefined;

  constructor() {
    makeObservable(this, {
      previewData: observable.ref,
      isGeneratingPreviewData: observable,
      propertyName: observable,
      previewDataAbortController: observable,
      setPropertyName: action,
      setIsGeneratingPreviewData: action,
      setPreviewData: action,
      setPreviewDataAbortController: action,
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

  setPreviewDataAbortController(val: AbortController | undefined): void {
    this.previewDataAbortController = val;
  }
}

export class QueryBuilderExplorerState {
  readonly queryBuilderState: QueryBuilderState;
  readonly previewDataState = new QueryBuilderExplorerPreviewDataState();
  readonly propertySearchState: QueryBuilderPropertySearchState;
  treeData?: TreeData<QueryBuilderExplorerTreeNodeData> | undefined;
  humanizePropertyName = true;
  showUnmappedProperties = false;
  highlightUsedProperties = true;
  mappingModelCoverageAnalysisState = ActionState.create();
  mappingModelCoverageAnalysisResult?: MappingModelCoverageAnalysisResult;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      treeData: observable.ref,
      humanizePropertyName: observable,
      showUnmappedProperties: observable,
      highlightUsedProperties: observable,
      mappingModelCoverageAnalysisResult: observable,
      setTreeData: action,
      refreshTree: action,
      refreshTreeData: action,
      setHumanizePropertyName: action,
      setShowUnmappedProperties: action,
      setHighlightUsedProperties: action,
      highlightTreeNode: action,
      analyzeMappingModelCoverage: flow,
      previewData: flow,
    });

    this.queryBuilderState = queryBuilderState;
    this.propertySearchState = new QueryBuilderPropertySearchState(
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
    const _class = this.queryBuilderState.class;
    const _mapping = this.queryBuilderState.executionContextState.mapping;
    this.setTreeData(
      _class && _mapping && this.mappingModelCoverageAnalysisResult
        ? getQueryBuilderTreeData(
            _class,
            this.mappingModelCoverageAnalysisResult,
          )
        : undefined,
    );
  }

  highlightTreeNode(key: string): void {
    const nodeToHighlight = this.treeData?.nodes.get(key);
    if (nodeToHighlight instanceof QueryBuilderExplorerTreePropertyNodeData) {
      let nodeToOpen: QueryBuilderExplorerTreeNodeData | null =
        this.treeData?.nodes.get(nodeToHighlight.parentId) ?? null;
      while (nodeToOpen !== null) {
        if (!nodeToOpen.isOpen) {
          nodeToOpen.isOpen = true;
        }
        nodeToOpen =
          nodeToOpen instanceof QueryBuilderExplorerTreePropertyNodeData
            ? (this.treeData?.nodes.get(nodeToOpen.parentId) ?? null)
            : null;
      }
      this.refreshTree();
      nodeToHighlight.setIsHighlighting(true);
      // scrollIntoView must be called in a setTimeout because it must happen after
      // the tree nodes are recursively opened and the tree is refreshed.
      setTimeout(() => {
        nodeToHighlight.elementRef.current?.scrollIntoView();
      }, 0);
    }
  }

  *analyzeMappingModelCoverage(): GeneratorFn<void> {
    // We will only refetch if the analysis result's mapping has changed.
    // This makes the assumption that the mapping has not been edited, which is a valid assumption since query is not for editing mappings
    if (
      this.queryBuilderState.executionContextState.mapping &&
      this.queryBuilderState.executionContextState.mapping.path !==
        this.mappingModelCoverageAnalysisResult?.mapping.path
    ) {
      this.mappingModelCoverageAnalysisState.inProgress();
      QueryBuilderTelemetryHelper.logEvent_QueryMappingModelCoverageAnalysisLaunched(
        this.queryBuilderState.applicationStore.telemetryService,
      );

      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.queryBuilderState.graphManagerState.graph,
      );
      this.mappingModelCoverageAnalysisState.setMessage('Analyzing Mapping...');
      try {
        this.mappingModelCoverageAnalysisResult = (yield flowResult(
          this.queryBuilderState.graphManagerState.graphManager.analyzeMappingModelCoverage(
            this.queryBuilderState.executionContextState.mapping,
            this.queryBuilderState.graphManagerState.graph,
          ),
        )) as MappingModelCoverageAnalysisResult;
        this.refreshTreeData();
        report.timings =
          this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        const reportWithState = Object.assign(
          {},
          report,
          this.queryBuilderState.getStateInfo(),
        );
        QueryBuilderTelemetryHelper.logEvent_QueryMappingModelCoverageAnalysisSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          reportWithState,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notificationService.notifyError(
          error.message,
        );
      } finally {
        this.mappingModelCoverageAnalysisState.complete();
      }
    }
  }

  *previewData(
    node: QueryBuilderExplorerTreePropertyNodeData,
  ): GeneratorFn<void> {
    const runtime = this.queryBuilderState.executionContextState.runtimeValue;
    if (!runtime) {
      this.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't preview data for property '${node.property.name}': runtime is not specified`,
      );
      return;
    }
    if (
      !node.mappingData.mapped ||
      !this.queryBuilderState.class ||
      !this.queryBuilderState.executionContextState.mapping
    ) {
      return;
    }
    if (this.previewDataState.isGeneratingPreviewData) {
      this.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't preview data for property '${node.property.name}': another preview request is being executed`,
      );
      return;
    }
    this.previewDataState.setPropertyName(node.property.name);
    this.previewDataState.setIsGeneratingPreviewData(true);
    const propertyExpression = buildPropertyExpressionFromExplorerTreeNodeData(
      node,
      this,
    );
    const propertyType = node.property.genericType.value.rawType;
    this.previewDataState.setPreviewDataAbortController(new AbortController());
    try {
      switch (propertyType.path) {
        case PRIMITIVE_TYPE.NUMBER:
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT: {
          const previewResult =
            (yield this.queryBuilderState.graphManagerState.graphManager.runQuery(
              buildNumericPreviewDataQuery(
                this.queryBuilderState,
                propertyExpression,
              ),
              this.queryBuilderState.executionContextState.mapping,
              runtime,
              this.queryBuilderState.graphManagerState.graph,
              {
                abortController:
                  this.previewDataState.previewDataAbortController,
              },
            )) as ExecutionResult;
          assertType(
            previewResult,
            TDSExecutionResult,
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
          this.previewDataState.setPreviewData(transposedPreviewResultData);
          break;
        }
        case PRIMITIVE_TYPE.BOOLEAN:
        case PRIMITIVE_TYPE.STRING:
        case PRIMITIVE_TYPE.DATE:
        case PRIMITIVE_TYPE.STRICTDATE:
        case PRIMITIVE_TYPE.DATETIME: {
          const previewResult =
            (yield this.queryBuilderState.graphManagerState.graphManager.runQuery(
              buildNonNumericPreviewDataQuery(
                this.queryBuilderState,
                propertyExpression,
              ),
              this.queryBuilderState.executionContextState.mapping,
              runtime,
              this.queryBuilderState.graphManagerState.graph,
              {
                abortController:
                  this.previewDataState.previewDataAbortController,
              },
            )) as ExecutionResult;
          assertType(
            previewResult,
            TDSExecutionResult,
            `Unexpected preview data format`,
          );
          this.previewDataState.setPreviewDataAbortController(undefined);
          this.previewDataState.setPreviewData(
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
      if (error.name === 'AbortError') {
        return;
      }
      this.queryBuilderState.applicationStore.notificationService.notifyWarning(
        `Can't preview data for property '${node.property.name}'. Error: ${error.message}`,
      );
      this.previewDataState.setPreviewData(undefined);
    } finally {
      this.previewDataState.setIsGeneratingPreviewData(false);
    }
  }
}
