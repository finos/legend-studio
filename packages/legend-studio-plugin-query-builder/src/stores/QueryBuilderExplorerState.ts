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

import type { TreeNodeData, TreeData } from '@finos/legend-studio-components';
import {
  guaranteeNonNullable,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import { action, makeAutoObservable, observable } from 'mobx';
import type {
  AbstractProperty,
  EditorStore,
  Mapping,
  Multiplicity,
  PropertyMapping,
  SetImplementation,
  Type,
} from '@finos/legend-studio';
import {
  OperationSetImplementation,
  AbstractPropertyExpression,
  Class,
  DerivedProperty,
  Enumeration,
  Property,
  VariableExpression,
} from '@finos/legend-studio';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Constants';

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
  isSelected?: boolean;
  isOpen?: boolean;
  id: string;
  label: string;
  childrenIds: string[] = [];
  mapped: boolean;
  /**
   * This flag is used to skip mappedness checking for the whole branch (i.e. every children of
   * a node with this property set to `true` will also be skipped in mappedness checking).
   * This is to facillitate complicated mappedness checkings that Studio would not attempt to handle:
   * e.g. derived properties, operation class mappings, etc.
   */
  skipMappingCheck: boolean;
  setImpl?: SetImplementation;

  constructor(
    id: string,
    label: string,
    mapped: boolean,
    skipMappingCheck: boolean,
    setImpl: SetImplementation | undefined,
  ) {
    this.id = id;
    this.label = label;
    this.mapped = mapped;
    this.skipMappingCheck = skipMappingCheck;
    this.setImpl = setImpl;
  }
}

export class QueryBuilderExplorerTreeRootNodeData extends QueryBuilderExplorerTreeNodeData {}

export class QueryBuilderExplorerTreePropertyNodeData extends QueryBuilderExplorerTreeNodeData {
  property: AbstractProperty;
  type: Type;
  parentId: string;

  constructor(
    id: string,
    label: string,
    property: AbstractProperty,
    parentId: string,
    mapped: boolean,
    skipMappingCheck: boolean,
    setImpl: SetImplementation | undefined,
  ) {
    super(id, label, mapped, skipMappingCheck, setImpl);
    this.property = property;
    this.type = property.genericType.value.rawType;
    this.parentId = parentId;
    this.mapped = mapped;
  }
}

export const getPropertyExpression = (
  treeData: TreeData<QueryBuilderExplorerTreeNodeData>,
  node: QueryBuilderExplorerTreePropertyNodeData,
  multiplicityOne: Multiplicity,
): AbstractPropertyExpression => {
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

const resolveSetImplementationForPropertyMapping = (
  propertyMapping: PropertyMapping,
): SetImplementation | undefined => {
  if (propertyMapping.isEmbedded) {
    return propertyMapping as unknown as SetImplementation;
  } else if (propertyMapping.targetSetImplementation) {
    return propertyMapping.targetSetImplementation;
  }
  return undefined;
};

const getPropertyMappedData = (
  editorStore: EditorStore,
  property: AbstractProperty,
  parentNode: QueryBuilderExplorerTreeNodeData,
): {
  mapped: boolean;
  skipMappingCheck: boolean;
  setImpl?: SetImplementation;
} => {
  // For now, derived properties will be considered mapped if its parent class is mapped.
  // NOTE: we don't want to do complex analytics such as to drill down into the body
  // of the derived properties to see if each properties being used are mapped to determine
  // if the dervied property itself is considered mapped.
  if (property instanceof DerivedProperty) {
    return {
      mapped: parentNode.mapped,
      skipMappingCheck: true,
    };
  } else if (property instanceof Property) {
    if (parentNode.skipMappingCheck) {
      return { mapped: true, skipMappingCheck: true };
    } else if (parentNode.setImpl) {
      const propertyMappings =
        editorStore.graphState.getMappingElementPropertyMappings(
          parentNode.setImpl,
        );
      const mappedProperties = propertyMappings
        .filter((p) => !p.isStub)
        .map((p) => p.property.value.name);
      // check if property is mapped
      if (mappedProperties.includes(property.name)) {
        // if class we need to resolve the Set Implementation
        if (property.genericType.value.rawType instanceof Class) {
          const propertyMapping = propertyMappings.find(
            (p) => p.property.value === property,
          );
          if (propertyMapping) {
            const setImpl =
              resolveSetImplementationForPropertyMapping(propertyMapping);
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
    }
  }
  return { mapped: false, skipMappingCheck: false };
};

export const getQueryBuilderPropertyNodeData = (
  editorStore: EditorStore,
  property: AbstractProperty,
  parentNode: QueryBuilderExplorerTreeNodeData,
): QueryBuilderExplorerTreePropertyNodeData => {
  const mappingData = getPropertyMappedData(editorStore, property, parentNode);
  const propertyNode = new QueryBuilderExplorerTreePropertyNodeData(
    `${
      parentNode instanceof QueryBuilderExplorerTreeRootNodeData
        ? ''
        : `${parentNode.id}.`
    }${property.name}`,
    property.name,
    property,
    parentNode.id,
    mappingData.mapped,
    mappingData.skipMappingCheck,
    mappingData.setImpl,
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
  editorStore: EditorStore,
  rootClass: Class,
  mapping: Mapping,
): TreeData<QueryBuilderExplorerTreeNodeData> => {
  const rootIds = [];
  const nodes = new Map<string, QueryBuilderExplorerTreeNodeData>();
  const rootSetImpl = mapping.getRootSetImplementation(rootClass);
  const treeRootNode = new QueryBuilderExplorerTreeRootNodeData(
    '@dummy_rootNode',
    rootClass.name,
    true,
    // NOTE: we will not try to analyze property mappedness for operation class mapping
    rootSetImpl instanceof OperationSetImplementation,
    rootSetImpl,
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
        editorStore,
        property,
        treeRootNode,
      );
      addUniqueEntry(treeRootNode.childrenIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
    });
  return { rootIds, nodes };
};

export class QueryBuilderExplorerState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  treeData?: TreeData<QueryBuilderExplorerTreeNodeData>;
  humanizePropertyName = true;
  showUnmappedProperties = false;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      treeData: observable.ref,
      setTreeData: action,
      refreshTree: action,
      refreshTreeData: action,
      setHumanizePropertyName: action,
      setShowUnmappedProperties: action,
    });

    this.editorStore = editorStore;
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
        ? getQueryBuilderTreeData(this.editorStore, _class, _mapping)
        : undefined,
    );
  }
}
