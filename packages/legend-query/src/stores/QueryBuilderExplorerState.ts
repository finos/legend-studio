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
  DerivedProperty,
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
} from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState.js';
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
} from '../QueryBuilder_Const.js';
import type { QueryBuilderPreviewData } from './QueryBuilderPreviewDataHelper.js';
import { QueryBuilderPropertySearchPanelState } from './QueryBuilderPropertySearchPanelState.js';

export enum QUERY_BUILDER_EXPLORER_TREE_DND_TYPE {
  ROOT = 'ROOT',
  CLASS_PROPERTY = 'CLASS_PROPERTY',
  ENUM_PROPERTY = 'ENUM_PROPERTY',
  PRIMITIVE_PROPERTY = 'PRIMITIVE_PROPERTY',
}

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
  mappingData: QueryBuilderPropertyMappingData;

  constructor(
    id: string,
    label: string,
    dndText: string,
    isPartOfDerivedPropertyBranch: boolean,
    type: Type,
    mappingData: QueryBuilderPropertyMappingData,
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

export type QueryBuilderPropertyMappingData = {
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
    mappingData: QueryBuilderPropertyMappingData,
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
    mappingData: QueryBuilderPropertyMappingData,
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
      for (let i = 0; i < allMappedPropertyNodes.length; i++) {
        if (allMappedPropertyNodes[i]?.id === currentNode.parentId) {
          parentNode = allMappedPropertyNodes[i];
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
  parentMappingData: QueryBuilderPropertyMappingData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderPropertyMappingData => {
  // If this property's owner has no corresponding entity, i.e. it means the parent is not mapped
  // Therefore, this property is not mapped either.
  if (parentMappingData.mappedEntity) {
    const mappedProp = parentMappingData.mappedEntity.__NAME_TO_PROPERTY.get(
      property.name,
    );
    if (
      property.genericType.value.rawType instanceof Class ||
      property.genericType.value.rawType instanceof Enum
    ) {
      if (mappedProp) {
        return {
          mapped: true,
          mappedEntity: modelCoverageAnalysisResult.__PATH_TO_ENTITY.get(
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
  parentMappingData: QueryBuilderPropertyMappingData,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderPropertyMappingData => {
  // If this property's owner has no corresponding entity, i.e. it means the parent is not mapped
  // Therefore, this property is not mapped either.
  if (parentMappingData.mappedEntity) {
    const mappedProperty = parentMappingData.mappedEntity.properties.filter(
      (p) => p instanceof EntityMappedProperty && p.subType === subclass.path,
    );
    if (mappedProperty.length > 0) {
      return {
        mapped: true,
        mappedEntity: modelCoverageAnalysisResult.__PATH_TO_ENTITY.get(
          (mappedProperty[0] as EntityMappedProperty).entityPath,
        ),
      };
    }
  }
  return { mapped: false };
};

export const getRootMappingData = (
  _class: Class,
  modelCoverageAnalysisResult: MappingModelCoverageAnalysisResult,
): QueryBuilderPropertyMappingData => ({
  mapped: true,
  mappedEntity: modelCoverageAnalysisResult.__PATH_TO_ENTITY.get(_class.path),
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
  modelCoverageAnalyticsResult: MappingModelCoverageAnalysisResult,
): QueryBuilderExplorerTreePropertyNodeData => {
  const mappingNodeData = generatePropertyNodeMappingData(
    property,
    parentNode.mappingData,
    modelCoverageAnalyticsResult,
  );
  const isPartOfDerivedPropertyBranch =
    property instanceof DerivedProperty ||
    parentNode.isPartOfDerivedPropertyBranch ||
    (parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
      parentNode.property instanceof DerivedProperty);
  const propertyNode = new QueryBuilderExplorerTreePropertyNodeData(
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? ''
        : `${parentNode.id}.`
    }${property.name}`,
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
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? `${TYPE_CAST_TOKEN}${subclass.path}`
        : `${parentNode.id}${TYPE_CAST_TOKEN}${subclass.path}`
    }`,
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
      addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
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
  propertySearchPanelState: QueryBuilderPropertySearchPanelState;
  mappingModelCoverageAnalysisResult?: MappingModelCoverageAnalysisResult;
  mappingModelCoverageAnalysisState = ActionState.create();

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      previewDataState: false,
      treeData: observable.ref,
      setTreeData: action,
      refreshTree: action,
      refreshTreeData: action,
      setHumanizePropertyName: action,
      setShowUnmappedProperties: action,
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
}
