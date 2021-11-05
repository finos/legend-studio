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
  uniq,
} from '@finos/legend-shared';
import type {
  AbstractProperty,
  GraphManagerState,
  Mapping,
  PropertyMapping,
  PureModel,
  SetImplementation,
  Type,
} from '@finos/legend-graph';
import {
  getRootSetImplementation,
  TYPICAL_MULTIPLICITY_TYPE,
  OperationSetImplementation,
  AbstractPropertyExpression,
  Class,
  DerivedProperty,
  Enumeration,
  Property,
  VariableExpression,
  PureInstanceSetImplementation,
} from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState';
import { action, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Const';
import type { QueryBuilderPreviewData } from './QueryBuilderPreviewDataHelper';

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
  mappingData: MappingNodeData;

  constructor(
    id: string,
    label: string,
    dndText: string,
    isPartOfDerivedPropertyBranch: boolean,
    type: Type,
    mappingData: MappingNodeData,
  ) {
    this.id = id;
    this.label = label;
    this.dndText = dndText;
    this.isPartOfDerivedPropertyBranch = isPartOfDerivedPropertyBranch;
    this.type = type;
    this.mappingData = mappingData;
  }
}

type MappingNodeData = {
  mapped: boolean;
  /**
   * This flag is used to skip mappedness checking for the whole branch (i.e. every children of
   * a node with this property set to `true` will also be skipped in mappedness checking).
   * This is to facillitate complicated mappedness checkings that Studio would not attempt to handle:
   * e.g. derived properties, operation class mappings, etc.
   */
  skipMappingCheck: boolean;
  setImpl?: SetImplementation | undefined;
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
    mappingData: MappingNodeData,
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

export const buildPropertyExpressionFromExplorerTreeNodeData = (
  treeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node: QueryBuilderExplorerTreePropertyNodeData,
  graph: PureModel,
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
  let currentExpression = propertyExpression;
  let parentNode = treeData.nodes.get(node.parentId);
  while (parentNode instanceof QueryBuilderExplorerTreePropertyNodeData) {
    const parentPropertyExpression = new AbstractPropertyExpression(
      '',
      multiplicityOne,
    );
    parentPropertyExpression.func = guaranteeNonNullable(parentNode.property);
    currentExpression.parametersValues.push(parentPropertyExpression);
    currentExpression = parentPropertyExpression;
    parentNode = treeData.nodes.get(parentNode.parentId);
  }
  currentExpression.parametersValues.push(projectionColumnLambdaVariable);
  return propertyExpression;
};

const resolveTargetSetImplementationForPropertyMapping = (
  propertyMapping: PropertyMapping,
): SetImplementation | undefined => {
  if (propertyMapping.isEmbedded) {
    return propertyMapping as unknown as SetImplementation;
  } else if (propertyMapping.targetSetImplementation) {
    return propertyMapping.targetSetImplementation;
  }
  return undefined;
};

const resolvePropertyMappingsForSetImpl = (
  graphManagerState: GraphManagerState,
  setImpl: SetImplementation,
): PropertyMapping[] => {
  const propertyMappings =
    graphManagerState.getMappingElementPropertyMappings(setImpl);
  // Resolve association properties
  // To resolve we look for all association property mappings which match our setImpl
  // and their sourceImpl.
  if (
    graphManagerState.isInstanceSetImplementation(setImpl) &&
    setImpl.class.value.propertiesFromAssociations.length
  ) {
    setImpl.parent.associationMappings
      .map((am) => am.propertyMappings)
      .flat()
      .forEach((pm) => {
        if (pm.sourceSetImplementation === setImpl) {
          propertyMappings.push(pm);
        }
      });
  }
  return uniq(propertyMappings);
};

const isAutoMappedProperty = (
  property: AbstractProperty,
  setImpl: SetImplementation,
): boolean => {
  if (setImpl instanceof PureInstanceSetImplementation) {
    const sourceClass = setImpl.srcClass;
    return Boolean(
      sourceClass.value
        ?.getAllProperties()
        .find((p) => p.name === property.name),
    );
  }
  return false;
};

const getPropertyMappingNodeData = (
  graphManagerState: GraphManagerState,
  property: AbstractProperty,
  parentNode: QueryBuilderExplorerTreeNodeData,
): MappingNodeData => {
  const parentSetImpl = parentNode.mappingData.setImpl;
  // For now, derived properties will be considered mapped if its parent class is mapped.
  // NOTE: we don't want to do complex analytics such as to drill down into the body
  // of the derived properties to see if each properties being used are mapped to determine
  // if the dervied property itself is considered mapped.
  if (property instanceof DerivedProperty) {
    return {
      mapped: parentNode.mappingData.mapped,
      skipMappingCheck: true,
    };
  } else if (property instanceof Property) {
    if (parentNode.mappingData.skipMappingCheck) {
      return { mapped: true, skipMappingCheck: true };
    } else if (parentSetImpl) {
      const propertyMappings = resolvePropertyMappingsForSetImpl(
        graphManagerState,
        parentSetImpl,
      );
      const mappedProperties = propertyMappings
        .filter((p) => !p.isStub)
        .map((p) => p.property.value.name);
      // check if property is mapped through defined property mappings
      if (mappedProperties.includes(property.name)) {
        // if class we need to resolve the Set Implementation
        if (property.genericType.value.rawType instanceof Class) {
          const propertyMapping = propertyMappings.find(
            (p) => p.property.value === property,
          );
          if (propertyMapping) {
            const setImpl =
              resolveTargetSetImplementationForPropertyMapping(propertyMapping);
            return {
              mapped: true,
              // NOTE: we could potentially resolve all the leaves and then overlap them somehow to
              // help identifying the mapped properties. However, we would not do that here
              // as opertion mapping can support more complicated branching logic (right now we just assume
              // it's always simple union), that Studio should not try to analyze.
              skipMappingCheck: setImpl instanceof OperationSetImplementation,
              setImpl,
            };
          }
        }
        return { mapped: true, skipMappingCheck: false };
      }
      // check if property is auto mapped
      if (isAutoMappedProperty(property, parentSetImpl)) {
        return { mapped: true, skipMappingCheck: false };
      }
    }
  }
  return { mapped: false, skipMappingCheck: false };
};

export const getQueryBuilderPropertyNodeData = (
  graphManagerState: GraphManagerState,
  property: AbstractProperty,
  parentNode: QueryBuilderExplorerTreeNodeData,
): QueryBuilderExplorerTreePropertyNodeData => {
  const mappingNodeData = getPropertyMappingNodeData(
    graphManagerState,
    property,
    parentNode,
  );
  const propertyNode = new QueryBuilderExplorerTreePropertyNodeData(
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? ''
        : `${parentNode.id}.`
    }${property.name}`,
    property.name,
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? '$x'
        : parentNode.dndText
    }.${property.name}`,
    property,
    parentNode.id,
    property instanceof DerivedProperty ||
      parentNode.isPartOfDerivedPropertyBranch ||
      (parentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
        parentNode.property instanceof DerivedProperty),
    mappingNodeData,
  );
  if (propertyNode.type instanceof Class) {
    propertyNode.childrenIds = propertyNode.type
      .getAllProperties()
      .concat(propertyNode.type.getAllDerivedProperties())
      .map((p) => `${propertyNode.id}.${p.name}`);
  }
  return propertyNode;
};

const getQueryBuilderTreeData = (
  graphManagerState: GraphManagerState,
  rootClass: Class,
  mapping: Mapping,
): TreeData<QueryBuilderExplorerTreeNodeData> => {
  const rootIds = [];
  const nodes = new Map<string, QueryBuilderExplorerTreeNodeData>();
  const rootSetImpl = getRootSetImplementation(mapping, rootClass);
  const treeRootNode = new QueryBuilderExplorerTreeRootNodeData(
    '@dummy_rootNode',
    rootClass.name,
    rootClass.path,

    false,
    rootClass,
    {
      mapped: true,
      // NOTE: we will not try to analyze property mappedness for operation class mapping
      skipMappingCheck: rootSetImpl instanceof OperationSetImplementation,
      setImpl: rootSetImpl,
    },
  );
  treeRootNode.isOpen = true;
  nodes.set(treeRootNode.id, treeRootNode);
  rootIds.push(treeRootNode.id);
  rootClass
    .getAllProperties()
    .concat(rootClass.getAllDerivedProperties())
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort(
      (a, b) =>
        (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) -
        (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0),
    )
    .forEach((property) => {
      const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
        graphManagerState,
        property,
        treeRootNode,
      );
      addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
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
    });

    this.queryBuilderState = queryBuilderState;
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
      _class && _mapping
        ? getQueryBuilderTreeData(
            this.queryBuilderState.graphManagerState,
            _class,
            _mapping,
          )
        : undefined,
    );
  }
}
