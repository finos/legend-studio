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
import { hashArray } from 'Utilities/HashUtil';
import { IllegalStateError, guaranteeNonNullable, UnsupportedOperationError, generateEnumerableNameFromToken, assertTrue, deleteEntry, addUniqueEntry } from 'Utilities/GeneralUtil';
import { updateRootSetImplementationOnCreate, updateRootSetImplementationOnDelete, findRootSetImplementation, getLeafSetImplementations } from 'Utilities/MappingResolutionUtil';
import { HASH_STRUCTURE, SOURCR_ID_LABEL } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { PackageableElementExplicitReference, OptionalPackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { SetImplementation, BASIC_SET_IMPLEMENTATION_TYPE } from 'MM/model/packageableElements/mapping/SetImplementation';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { OperationSetImplementation, OPERATION_TYPE } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Stubable, isStubArray } from 'MM/Stubable';
import { MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { InstanceSetImplementation } from './InstanceSetImplementation';
import { PropertyMapping } from './PropertyMapping';
import { InferableMappingElementIdExplicitValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';
import { MappingInclude } from './MappingInclude';

export enum MAPPING_ELEMENT_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  ASSOCIATION = 'ASSOCIATION'
}

export type MappingElement = EnumerationMapping | SetImplementation;

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export type MappingElementSource = Type | Class;

export class Mapping extends PackageableElement implements Hashable, Stubable {
  @observable includes: MappingInclude[] = [];
  @observable classMappings: SetImplementation[] = [];
  @observable enumerationMappings: EnumerationMapping[] = [];
  @observable tests: MappingTest[] = [];

  // TODO: account for mapping includes
  @computed get allClassMappings(): SetImplementation[] { return this.classMappings }
  @computed get allEnumerationMappings(): EnumerationMapping[] { return this.enumerationMappings }

  generateTestName(): string {
    const generatedName = generateEnumerableNameFromToken(this.tests.map(test => test.name), 'test');
    assertTrue(!this.tests.find(test => test.name === generatedName), `Can't auto-generate test name for value '${generatedName}'`);
    return generatedName;
  }

  enumerationMappingsByEnumeration(enumeration: Enumeration): EnumerationMapping[] {
    // TODO: we don't support included mapings yet
    // return this.includes.map(m => m.included).flat().map(m => m.enumerationMappingsByEnumeration(e)).concat(this.enumerationMappings.filter(em => em.enumeration === e));
    return this.enumerationMappings.filter(enumerationMapping => enumerationMapping.enumeration.value === enumeration);
  }

  getClassMappings(findInIncludedMappings = false): SetImplementation[] {
    // TODO: add association property Mapping to class mappings
    return this.classMappings;
  }

  classMappingsByClass(_class: Class, findInIncludedMappings = false): SetImplementation[] {
    // TODO ADD association property Mapping to class mappings, AggregationAwareSetImplementation, mappingClass
    // NOTE: ADD in the proper order so find root can resolve properly down the line
    return this.getClassMappings(findInIncludedMappings).filter(classMapping => classMapping.class.value === _class);
  }

  getClassMapping = (id: string): SetImplementation => guaranteeNonNullable(this.classMappings.find(classMapping => classMapping.id.value === id), `Can't find class mapping with ID '${id}' in mapping '${this.path}'`);

  getAllMappingElements(findInIncludedMappings = false): MappingElement[] {
    if (!findInIncludedMappings) {
      return [...this.classMappings, ...this.enumerationMappings];
    }
    // TODO included mappings
    return [...this.classMappings, ...this.enumerationMappings];
  }

  @action deleteTest(value: MappingTest): void { deleteEntry(this.tests, value) }
  @action addTest(value: MappingTest): void { addUniqueEntry(this.tests, value) }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  @action deleteMappingElement(mappingElement: MappingElement): void {
    let mappingElements: (MappingElement | PropertyMapping)[] = [];
    if (mappingElement instanceof EnumerationMapping) {
      mappingElements = this.enumerationMappings;
    } else if (mappingElement instanceof SetImplementation) {
      mappingElements = this.classMappings;
    }
    deleteEntry(mappingElements, mappingElement);
    if (mappingElement instanceof SetImplementation) {
      updateRootSetImplementationOnDelete(mappingElement);
    }
  }

  @action createClassMapping(id: string, _class: Class, setImpType: BASIC_SET_IMPLEMENTATION_TYPE): SetImplementation | undefined {
    let setImp: SetImplementation;
    // NOTE: by default when we create a new instance set implementation, we will create PURE instance set implementation
    // we don't let users choose the various instance set implementation type as that require proper source
    // e.g. flat data class mapping requires stubbing the source
    switch (setImpType) {
      case BASIC_SET_IMPLEMENTATION_TYPE.OPERATION: setImp = new OperationSetImplementation(InferableMappingElementIdExplicitValue.create(id, _class.path), this, PackageableElementExplicitReference.create(_class), false, OPERATION_TYPE.STORE_UNION); break;
      case BASIC_SET_IMPLEMENTATION_TYPE.INSTANCE: setImp = new PureInstanceSetImplementation(InferableMappingElementIdExplicitValue.create(id, _class.path), this, PackageableElementExplicitReference.create(_class), false, OptionalPackageableElementExplicitReference.create<Class>(undefined)); break;
      default: return undefined;
    }
    updateRootSetImplementationOnCreate(setImp);
    this.classMappings.push(setImp);
    return setImp;
  }

  @action createEnumerationMapping(id: string, enumeration: Enumeration, sourceType: Type): EnumerationMapping {
    const enumMapping = new EnumerationMapping(InferableMappingElementIdExplicitValue.create(id, enumeration.path), PackageableElementExplicitReference.create(enumeration), this, OptionalPackageableElementExplicitReference.create(sourceType));
    this.enumerationMappings.push(enumMapping);
    return enumMapping;
  }

  getRootSetImplementation = (_class: Class): SetImplementation | undefined => findRootSetImplementation(this.classMappingsByClass(_class, true));
  getLeafSetImplementations = (_class: Class): SetImplementation[] | undefined => getLeafSetImplementations(this.getRootSetImplementation(_class));

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  getMappingElementByTypeAndId(type: string, id: string): MappingElement | undefined {
    // NOTE: ID must be unique across all mapping elements of the same type
    switch (type) {
      case MAPPING_ELEMENT_TYPE.CLASS:
      case SOURCR_ID_LABEL.OPERATION_CLASS_MAPPING:
      case SOURCR_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING: return this.getClassMappings().find(classMapping => classMapping.id.value === id);
      case MAPPING_ELEMENT_TYPE.ENUMERATION: return this.enumerationMappings.find(enumerationMapping => enumerationMapping.id.value === id);
      default: return undefined;
    }
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return this.getClassMappings()
      .filter((setImpl): setImpl is InstanceSetImplementation => setImpl instanceof InstanceSetImplementation)
      .map(setImpl => setImpl.getEmbeddedSetImplmentations()).flat();
  }

  static createStub = (): Mapping => new Mapping('');

  @computed get isStub(): boolean {
    return super.isStub
      // && isStubArray(this.includes)
      // && isStubArray(this.associationMappings)
      && isStubArray(this.classMappings)
      && isStubArray(this.enumerationMappings);
  }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.MAPPING,
      super.hashCode,
      // TODO mapping include
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.tests),
      hashArray(this.includes)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Mapping(this);
  }
}

export const getMappingElementType = (mappingElement: MappingElement): MAPPING_ELEMENT_TYPE => {
  if (mappingElement instanceof EnumerationMapping) {
    return MAPPING_ELEMENT_TYPE.ENUMERATION;
  } else if (mappingElement instanceof SetImplementation) {
    return MAPPING_ELEMENT_TYPE.CLASS;
  }
  throw new UnsupportedOperationError(`Unsupported mapping element type '${(mappingElement as MappingElement).constructor.name}'`);
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementTarget = (mappingElement: MappingElement): PackageableElement => {
  if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.enumeration.value;
  } else if (mappingElement instanceof SetImplementation) {
    return mappingElement.class.value;
  }
  throw new UnsupportedOperationError(`Unsupported mapping element type '${(mappingElement as MappingElement).constructor.name}'`);
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementSource = (mappingElement: MappingElement): MappingElementSource | undefined => {
  if (mappingElement instanceof OperationSetImplementation) {
    // NOTE: we don't need to resolve operation union because at the end of the day, it uses other class mappings
    // in the mapping, so if we use this method on all class mappings of a mapping, we don't miss anything
    return undefined;
  } else if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.sourceType.value;
  } else if (mappingElement instanceof PureInstanceSetImplementation) {
    return mappingElement.srcClass.value;
  }
  throw new UnsupportedOperationError(`Unsupported mapping element type '${mappingElement.constructor.name}'`);
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementSourceFilterText = (option: MappingElementSourceSelectOption): string => {
  const val = option.value;
  if (val instanceof Class) {
    return val.path;
  }
  throw new UnsupportedOperationError();
};

export interface MappingElementLabel {
  value: string;
  root: boolean;
  tooltip: string;
}

export interface MappingElementSourceSelectOption {
  label: string;
  value: MappingElementSource;
}
