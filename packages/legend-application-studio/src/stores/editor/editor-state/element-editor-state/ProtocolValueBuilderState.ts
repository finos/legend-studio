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

import { action, makeObservable, observable } from 'mobx';
import {
  getAllClassProperties,
  type Class,
  type PureModel,
  PrimitiveType,
  PRIMITIVE_TYPE,
  PROPERTY_ACCESSOR,
  type Property,
  classHasCycle,
} from '@finos/legend-graph';
import {
  isString,
  uuid,
  type PlainObject,
  prettyCONSTName,
} from '@finos/legend-shared';
import type { TreeData, TreeNodeData } from '@finos/legend-art';

export abstract class ProtocolValueFieldNode implements TreeNodeData {
  readonly id: string;
  readonly label: string;
  readonly builderState: ProtocolValueBuilderState;
  readonly property: Property;
  readonly propertyPath: string;
  isOpen = true;
  childrenIds: string[] = [];
  childrenNodes: ProtocolValueFieldNode[] = [];

  constructor(
    id: string,
    label: string,
    builderState: ProtocolValueBuilderState,
    property: Property,
    propertyPath: string,
  ) {
    makeObservable(this, {
      isOpen: observable,
      setIsOpen: action,
    });

    this.id = id;
    this.label = label;
    this.builderState = builderState;
    this.property = property;
    this.propertyPath = propertyPath;
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }

  abstract getValue(): unknown;
}

export class StringFieldNode extends ProtocolValueFieldNode {
  value: string;

  constructor(
    id: string,
    label: string,
    builderState: ProtocolValueBuilderState,
    property: Property,
    propertyPath: string,
    initialValue: string,
  ) {
    super(id, label, builderState, property, propertyPath);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.value = initialValue;
  }

  setValue(val: string): void {
    this.value = val;

    this.builderState.onValueChange?.(this.builderState.getValue());
  }

  getValue(): string {
    return this.value;
  }
}

export class OptionalStringFieldNode extends ProtocolValueFieldNode {
  value: string | undefined;

  constructor(
    id: string,
    label: string,
    builderState: ProtocolValueBuilderState,
    property: Property,
    propertyPath: string,
    initialValue: string | undefined,
  ) {
    super(id, label, builderState, property, propertyPath);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.value = initialValue;
  }

  setValue(val: string | undefined): void {
    this.value = val;

    this.builderState.onValueChange?.(this.builderState.getValue());
  }

  getValue(): string | undefined {
    return this.value;
  }
}

export class UnsupportedFieldNode extends ProtocolValueFieldNode {
  readonly value: unknown; // we will not support editing unknown value

  constructor(
    id: string,
    label: string,
    builderState: ProtocolValueBuilderState,
    property: Property,
    propertyPath: string,
    initialValue: unknown,
  ) {
    super(id, label, builderState, property, propertyPath);

    this.value = initialValue;
  }

  getValue(): unknown {
    return this.value;
  }
}

export class ProtocolValueBuilderState {
  readonly type: Class;
  readonly isCyclic: boolean;
  readonly graph: PureModel;
  readonly excludedPaths: Map<string, string[]>;
  readonly initialValue: PlainObject;
  readonly onValueChange?: ((value: PlainObject) => void) | undefined;
  readonly decorateValue?: ((value: PlainObject) => PlainObject) | undefined;

  treeData: TreeData<ProtocolValueFieldNode> | undefined;

  constructor(
    type: Class,
    options: {
      graph: PureModel;
      initialValue: PlainObject | undefined;
      excludedPaths: string[];
      onValueChange?: ((value: PlainObject) => void) | undefined;
      decorateValue?: ((value: PlainObject) => PlainObject) | undefined;
    },
  ) {
    makeObservable(this, { treeData: observable.ref });

    this.type = type;
    this.graph = options.graph;
    this.onValueChange = options.onValueChange;
    this.decorateValue = options.decorateValue;

    this.excludedPaths = new Map<string, string[]>();
    options.excludedPaths.forEach((path) => {
      const idx = path.indexOf(PROPERTY_ACCESSOR);
      if (idx === -1) {
        return;
      }
      const classPath = path.substring(0, idx);
      const propertyName = path.substring(idx + 1);
      if (!this.excludedPaths.has(classPath)) {
        this.excludedPaths.set(classPath, [propertyName]);
      } else {
        this.excludedPaths.get(classPath)?.push(propertyName);
      }
    });

    this.isCyclic = classHasCycle(type, {
      traverseNonRequiredProperties: true,
      excludedPaths: this.excludedPaths,
    });
    this.initialValue =
      options.initialValue ??
      (this.isCyclic ? {} : this.generateInitialValue(type));
    this.treeData = this.isCyclic ? undefined : this.buildTreeData(type);
  }

  buildTreeData(type: Class): TreeData<ProtocolValueFieldNode> {
    const rootIds: string[] = [];
    const nodes = new Map<string, ProtocolValueFieldNode>();

    getAllClassProperties(type).forEach((property) => {
      // filter properties
      const propertyOwnerPath = property._OWNER.path;
      const excludedProperties =
        this.excludedPaths.get(propertyOwnerPath) ?? [];
      if (excludedProperties.includes(property.name)) {
        return;
      }

      const propertyType = property.genericType.value.rawType;
      const multiplicity = property.multiplicity;

      const childNodeValue = this.initialValue[property.name];
      const childNodeId = uuid();
      let childNode: ProtocolValueFieldNode;

      if (!(propertyType instanceof PrimitiveType)) {
        childNode = new UnsupportedFieldNode(
          uuid(),
          '',
          this,
          property,
          property.name,
          childNodeValue,
        );
      } else {
        switch (propertyType.name) {
          case PRIMITIVE_TYPE.STRING: {
            if (multiplicity.lowerBound === 0) {
              childNode = new OptionalStringFieldNode(
                childNodeId,
                '',
                this,
                property,
                property.name,
                childNodeValue === undefined
                  ? undefined
                  : isString(childNodeValue)
                    ? childNodeValue
                    : '',
              );
            } else if (multiplicity.upperBound === 1) {
              childNode = new StringFieldNode(
                childNodeId,
                '',
                this,
                property,
                property.name,
                isString(childNodeValue) ? childNodeValue : '',
              );
            } else {
              childNode = new UnsupportedFieldNode(
                childNodeId,
                '',
                this,
                property,
                property.name,
                childNodeValue,
              );
            }
            break;
          }
          default: {
            childNode = new UnsupportedFieldNode(
              childNodeId,
              '',
              this,
              property,
              property.name,
              childNodeValue,
            );
            break;
          }
        }
      }
      nodes.set(childNodeId, childNode);
    });

    nodes.forEach((node) => {
      rootIds.push(node.id);
    });

    return { rootIds, nodes };
  }

  private generateInitialValue(type: Class): PlainObject {
    const value: PlainObject = {};
    const excludedProperties = this.excludedPaths.get(type.path) ?? [];
    getAllClassProperties(type)
      .filter((property) => !excludedProperties.includes(property.name))
      .forEach((property) => {
        // NOTE: for now, we only handle very basic properties: i.e. primitive property (except Date) with multiplicity [0..1] or [1]
        // we have not handled list of primitives, enumeration type, list of enumeration values, complex type
        //
        // Note that subtype is something we need to think very carefully about: displaying subtype in the form is not necessarily hard
        // as we can draw a selector dropdown for the type, but in terms of actually generate the right protocol value, it depends on the
        // use case and that could add complexity, for example, if we use this to generate Pure protocol, we would need the information
        // for _type flag for subtype
        const propertyType = property.genericType.value.rawType;
        const multiplicity = property.multiplicity;
        if (
          !(propertyType instanceof PrimitiveType) ||
          (multiplicity.upperBound && multiplicity.upperBound > 1)
        ) {
          return;
        }
        if (multiplicity.lowerBound === 0) {
          value[property.name] = undefined;
        } else {
          switch (propertyType.name) {
            case PRIMITIVE_TYPE.BOOLEAN: {
              value[property.name] = false;
              break;
            }
            case PRIMITIVE_TYPE.FLOAT:
            case PRIMITIVE_TYPE.DECIMAL: {
              value[property.name] = 0.0;
              break;
            }
            case PRIMITIVE_TYPE.NUMBER:
            case PRIMITIVE_TYPE.INTEGER: {
              value[property.name] = 0;
              break;
            }
            case PRIMITIVE_TYPE.STRING: {
              // NOTE: this just provides some default value, and they are not necessarily sensible
              // perhaps, we can create a mechanism for this class where we can inject value to fields
              // but that might violate the generic usage principle of this builder as this builder's
              // user should be relatively agnostic to the extension they are picking
              value[property.name] = prettyCONSTName(property.name);
              break;
            }
            case PRIMITIVE_TYPE.DATE:
            case PRIMITIVE_TYPE.STRICTDATE:
            case PRIMITIVE_TYPE.DATETIME:
            default:
              return; // unsupported
          }
        }
      });

    return value;
  }

  getValue(): PlainObject {
    if (!this.treeData) {
      return {};
    }

    const value: PlainObject = {};
    this.treeData.rootIds.forEach((rootId) => {
      const node = this.treeData?.nodes.get(rootId);
      if (node) {
        value[node.property.name] = node.getValue();
      }
    });

    return this.decorateValue ? this.decorateValue(value) : value;
  }
}
