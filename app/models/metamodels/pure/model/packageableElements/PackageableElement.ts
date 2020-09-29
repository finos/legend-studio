/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray, hashString } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE, ENTITY_PATH_DELIMITER, PROTOCOL_CLASSIFIER_PATH } from 'MetaModelConst';
import { UnsupportedOperationError, uuid } from 'Utilities/GeneralUtil';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { Stubable } from 'MM/Stubable';
import { Profile } from './domain/Profile';
import { Enumeration } from './domain/Enumeration';
import { Class } from './domain/Class';
import { Association } from './domain/Association';
import { ConcreteFunctionDefinition } from './domain/ConcreteFunctionDefinition';
import { Mapping } from './mapping/Mapping';
import { Diagram } from './diagram/Diagram';
import { Text } from './text/Text';
import { PrimitiveType } from './domain/PrimitiveType';
import { PackageableConnection } from './connection/PackageableConnection';
import { PackageableRuntime } from './runtime/PackageableRuntime';
import { FileGeneration } from './fileGeneration/FileGeneration';
import { GenerationSpecification } from './generationSpecification/GenerationSpecification';
import { Measure } from './domain/Measure';
import { SectionIndex } from './section/SectionIndex';

export interface PackageableElementVisitor<T> {
  visit_Package(element: Package): T;
  visit_PrimitiveType(element: PrimitiveType): T;
  visit_Profile(element: Profile): T;
  visit_Enumeration(element: Enumeration): T;
  visit_Measure(element: Measure): T;
  visit_Class(element: Class): T;
  visit_Association(element: Association): T;
  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): T;
  visit_Mapping(element: Mapping): T;
  visit_Diagram(element: Diagram): T;
  visit_PackageableRuntime(element: PackageableRuntime): T;
  visit_PackageableConnection(element: PackageableConnection): T;
  visit_Text(element: Text): T;
  visit_FileGeneration(element: FileGeneration): T;
  visit_GenerationSpecification(element: GenerationSpecification): T;
  visit_SectionIndex(element: SectionIndex): T
}

export abstract class PackageableElement implements Hashable, Stubable {
  uuid = uuid();
  @observable protected _isDeleted = false;
  @observable protected _isDisposed = false;
  @observable protected _isImmutable = false;
  @observable name: string;
  @observable package?: Package;
  @observable generationParentElement?: PackageableElement;

  constructor(name: string) {
    this.name = name;
  }

  @computed get isReadOnly(): boolean { return this._isImmutable }
  @computed get isDeleted(): boolean { return this._isDeleted }
  @action setName(value: string): void { this.name = value }
  @action setIsDeleted(value: boolean): void { this._isDeleted = value }
  @action deleteElementFromGraph(): void {
    if (this.package) { this.package.deleteElement(this) }
    this.setIsDeleted(true);
  }

  /**
   * Get root element. In the ideal case, this method is important for finding the root package, but
   * if we do something like `this instanceof Package` that would case circular dependency.
   */
  getRoot = (): PackageableElement => !this.package ? this : this.package.getRoot();
  @computed get selectOption(): PackageableElementSelectOption<PackageableElement> { return { label: this.name, value: this } }

  @computed get path(): string {
    if (!this.package) { return this.name }
    const parentPackageName = this.package.fullPath;
    return !parentPackageName ? this.name : `${parentPackageName}${ENTITY_PATH_DELIMITER}${this.name}`;
  }

  // NOTE: we don't need `createStub` as the sub-classes will have to implement their own for type narrowing
  get isStub(): boolean { return !this.name && !this.package }

  /**
   * Since `keepAlive` can cause memory-leak, we need to dispose it manually when we are about to discard the graph
   * in order to avoid leaking.
   * See https://mobx.js.org/best/pitfalls.html#computed-values-run-more-often-than-expected
   * See https://medium.com/terria/when-and-why-does-mobxs-keepalive-cause-a-memory-leak-8c29feb9ff55
   */
  @action dispose(): void {
    this._isDisposed = true;
    // trigger recomputation on `hashCode` so it removes itself from all observables it previously observed
    try { this.hashCode } catch { /* do nothing */ }
  }

  @action freeze(): void {
    this._isImmutable = true;
    // Since hash code computation depends on this flag, we retrigger and wrap in a try catch to prevent future call
    // to get `hashCode`, as this would indicate mutation
    try { this.hashCode } catch { /* do nothing */ }
  }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PACKAGEABLE_ELEMENT,
      this.path,
    ]);
  }

  abstract accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T
}

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export enum PACKAGEABLE_ELEMENT_TYPE {
  PRIMITIVE = 'PRIMITIVE',
  PACKAGE = 'PACKAGE',
  PROFILE = 'PROFILE',
  ENUMERATION = 'ENUMERATION',
  CLASS = 'CLASS',
  ASSOCIATION = 'ASSOCIATION',
  FUNCTION = 'FUNCTION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  MAPPING = 'MAPPING',
  DIAGRAM = 'DIAGRAM',
  TEXT = 'TEXT',
  CONNECTION = 'CONNECTION',
  RUNTIME = 'RUNTIME',
  FILE_GENERATION = 'FILE_GENERATION',
  GENERATION_SPECIFICATION = 'GENERATION_SPECIFICATION',
  SECTION_INDEX = 'SECTION_INDEX',
}

export enum PACKAGEABLE_ELEMENT_POINTER_TYPE {
  STORE = 'STORE',
  MAPPING = 'MAPPING',
  FILE_GENERATION = 'FILE_GENERATION'
}

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export const getClassiferPathFromType = (type: PACKAGEABLE_ELEMENT_TYPE): PROTOCOL_CLASSIFIER_PATH => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.CLASS: return PROTOCOL_CLASSIFIER_PATH.CLASS;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: return PROTOCOL_CLASSIFIER_PATH.ASSOCIATION;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: return PROTOCOL_CLASSIFIER_PATH.ENUMERATION;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE: return PROTOCOL_CLASSIFIER_PATH.MEASURE;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE: return PROTOCOL_CLASSIFIER_PATH.PROFILE;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: return PROTOCOL_CLASSIFIER_PATH.FUNCTION;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING: return PROTOCOL_CLASSIFIER_PATH.MAPPING;
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: return PROTOCOL_CLASSIFIER_PATH.DIAGRAM;
    case PACKAGEABLE_ELEMENT_TYPE.TEXT: return PROTOCOL_CLASSIFIER_PATH.TEXT;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return PROTOCOL_CLASSIFIER_PATH.CONNECTION;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return PROTOCOL_CLASSIFIER_PATH.RUNTIME;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return PROTOCOL_CLASSIFIER_PATH.FILE_GENERATION;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: return PROTOCOL_CLASSIFIER_PATH.GENERATION_SPECIFICATION;
    case PACKAGEABLE_ELEMENT_TYPE.SECTION_INDEX: return PROTOCOL_CLASSIFIER_PATH.SECTION_INDEX;
    default: throw new UnsupportedOperationError(`Unsupported classifier path for type '${type}'`);
  }
};

export interface PackageableElementSelectOption<T extends PackageableElement> {
  label: string;
  value: T;
}

export const getElementPointerHashCode = (pointerType: PACKAGEABLE_ELEMENT_POINTER_TYPE, path: string): string => [
  HASH_STRUCTURE.PACKAGEABLE_ELEMENT_POINTER,
  pointerType,
  path,
].map(hashString).join(',');
