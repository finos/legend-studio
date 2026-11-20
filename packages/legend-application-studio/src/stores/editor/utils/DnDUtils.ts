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

import type { MappingElement } from '../editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  FlatDataRecordTypeTreeNodeData,
  TypeTreeNodeData,
  PackageTreeNodeData,
} from './TreeUtils.js';
import type { EditorStore } from '../EditorStore.js';
import {
  type Type,
  DerivedProperty,
  VariableExpression,
  generateDerivedPropertyCallString,
} from '@finos/legend-graph';
import {
  type PlainObject,
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

export enum CORE_DND_TYPE {
  NONE = 'NONE',
  // type tree
  TYPE_TREE_CLASS = 'TYPE_TREE_CLASS',
  TYPE_TREE_ENUMERATION = 'TYPE_TREE_ENUMERATION',
  TYPE_TREE_ENUM = 'TYPE_TREE_ENUM',
  TYPE_TREE_PRIMITIVE = 'TYPE_TREE_PRIMITIVE',
  // project explorer tree
  PROJECT_EXPLORER_PACKAGE = 'PROJECT_EXPLORER_PACKAGE',
  PROJECT_EXPLORER_CLASS = 'PROJECT_EXPLORER_CLASS',
  PROJECT_EXPLORER_ASSOCIATION = 'PROJECT_EXPLORER_ASSOCIATION',
  PROJECT_EXPLORER_MEASURE = 'PROJECT_EXPLORER_MEASURE',
  PROJECT_EXPLORER_ENUMERATION = 'PROJECT_EXPLORER_ENUMERATION',
  PROJECT_EXPLORER_PROFILE = 'PROJECT_EXPLORER_PROFILE',
  PROJECT_EXPLORER_FUNCTION = 'PROJECT_EXPLORER_FUNCTION',
  PROJECT_EXPLORER_FLAT_DATA = 'PROJECT_EXPLORER_FLAT_DATA',
  PROJECT_EXPLORER_DATABASE = 'PROJECT_EXPLORER_DATABASE',
  PROJECT_EXPLORER_MAPPING = 'PROJECT_EXPLORER_MAPPING',
  PROJECT_EXPLORER_SERVICE = 'PROJECT_EXPLORER_SERVICE',
  PROJECT_EXPLORER_CONNECTION = 'PROJECT_EXPLORER_CONNECTION',
  PROJECT_EXPLORER_RUNTIME = 'PROJECT_EXPLORER_RUNTIME',
  PROJECT_EXPLORER_FILE_GENERATION = 'PROJECT_EXPLORER_FILE_GENERATION',
  PROJECT_EXPLORER_DATA = 'PROJECT_EXPLORER_DATA',
  PROJECT_EXPLORER_GENERATION_TREE = 'PROJECT_EXPLORER_GENERATION_TREE',
  PROJECT_EXPLORER_EXECUTION_ENVIRONMENT = 'PROJECT_EXPLORER_EXECUTION_ENVIRONMENT',
  // mapping explorer
  MAPPING_EXPLORER_CLASS_MAPPING = 'MAPPING_EXPLORER_CLASS_MAPPING',
  MAPPING_EXPLORER_ENUMERATION_MAPPING = 'MAPPING_EXPLORER_ENUMERATION_MAPPING',
  MAPPING_EXPLORER_ASSOCIATION_MAPPING = 'MAPPING_EXPLORER_ASSOCIATION_MAPPING',
}

// react-dnd uses Redux under the hood and also it champions the use of plain object over class instance
// There is some practical reason for that (due to the potential need to serialize the item object), but as for now
// this way of creating the drag itm is still very convenient for us since we can do direct type comparison rather than having
// to use element full path, we might need follow the following threads if there are any breaking changes
// See https://github.com/react-dnd/react-dnd/issues/1094
// See https://github.com/react-dnd/react-dnd/pull/1079
export class TypeDragSource {
  data: TypeTreeNodeData | undefined;

  constructor(data: TypeTreeNodeData) {
    this.data = data;
  }
}

export class FlatDataColumnDragSource {
  data: FlatDataRecordTypeTreeNodeData;

  constructor(data: FlatDataRecordTypeTreeNodeData) {
    this.data = data;
  }
}

export class ElementDragSource {
  data: PackageTreeNodeData;

  constructor(data: PackageTreeNodeData) {
    this.data = data;
  }
}

export class MappingElementDragSource {
  data: MappingElement;

  constructor(data: MappingElement) {
    this.data = data;
  }
}

/**
 * Resolve the types of the parameters of a derived property; `undefined` is
 * returned for a parameter whose type cannot be resolved.
 */
const getDerivedPropertyParameterTypes = (
  derivedProperty: DerivedProperty,
  editorStore: EditorStore,
): (Type | undefined)[] => {
  // NOTE: parameters of derived properties are kept in raw JSON form in the metamodel
  // and they do not include the `this` parameter
  const parameters = Array.isArray(derivedProperty.parameters)
    ? (derivedProperty.parameters as PlainObject[])
    : [];
  return parameters.map((parameter) => {
    try {
      const variable =
        editorStore.graphManagerState.graphManager.buildValueSpecification(
          parameter,
          editorStore.graphManagerState.graph,
        );
      return variable instanceof VariableExpression
        ? variable.genericType?.value.rawType
        : undefined;
    } catch (error) {
      assertErrorThrown(error);
      editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        `Can't resolve the type of a parameter of derived property '${derivedProperty.name}', using a placeholder value instead`,
        error,
      );
      return undefined;
    }
  });
};

/**
 * Generate the path to append when a type tree node is dropped into a lambda
 * editor, e.g. `$src.firmFor('', 0).name`.
 *
 * Every derived property along the path is turned into a call with default
 * arguments (not just the last one), otherwise the path does not compile.
 */
export const generateTypeTreeNodeLambdaPath = (
  node: TypeTreeNodeData,
  editorStore: EditorStore,
): string => {
  const segments: string[] = [];
  let current = node;
  while (current.property && current.parentNode) {
    segments.unshift(
      current.property instanceof DerivedProperty
        ? generateDerivedPropertyCallString(
            current.property,
            getDerivedPropertyParameterTypes(current.property, editorStore),
          )
        : current.property.name,
    );
    current = current.parentNode;
  }
  return [current.id, ...segments].join('.');
};

// TODO: disperse all of these to the editor, we should probably remove all of these
export type FlatDataPropertyMappingTransformDropTarget =
  FlatDataColumnDragSource;
export type TransformDropTarget = TypeDragSource;
export type OperationSetImplementationDropTarget = MappingElementDragSource;
export type MappingElementSourceDropTarget = ElementDragSource;
export type MappingExplorerDropTarget = ElementDragSource;
export type UMLEditorElementDropTarget = ElementDragSource;
export type FileGenerationSourceDropTarget = ElementDragSource;
