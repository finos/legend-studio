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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  hashArray,
  IllegalStateError,
  guaranteeNonNullable,
  UnsupportedOperationError,
  guaranteeType,
  generateEnumerableNameFromToken,
  assertTrue,
  getClass,
  deleteEntry,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import {
  updateRootSetImplementationOnCreate,
  updateRootSetImplementationOnDelete,
  findRootSetImplementation,
  getLeafSetImplementations,
} from '../../../../../../utils/MappingResolutionUtil';
import {
  CORE_HASH_STRUCTURE,
  SOURCR_ID_LABEL,
} from '../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../model/packageableElements/store//relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { Table } from '../../../model/packageableElements/store/relational/model/Table';
import type { View } from '../../../model/packageableElements/store/relational/model/View';
import {
  PackageableElementExplicitReference,
  OptionalPackageableElementExplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import { PureInstanceSetImplementation } from '../../../model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import { FlatDataInstanceSetImplementation } from '../../../model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { EnumerationMapping } from '../../../model/packageableElements/mapping/EnumerationMapping';
import {
  SetImplementation,
  BASIC_SET_IMPLEMENTATION_TYPE,
} from '../../../model/packageableElements/mapping/SetImplementation';
import { AssociationImplementation } from '../../../model/packageableElements/mapping/AssociationImplementation';
import type { Type } from '../../../model/packageableElements/domain/Type';
import type { Class } from '../../../model/packageableElements/domain/Class';
import type { Enumeration } from '../../../model/packageableElements/domain/Enumeration';
import {
  OperationSetImplementation,
  OperationType,
} from '../../../model/packageableElements/mapping/OperationSetImplementation';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';
import type { MappingTest } from '../../../model/packageableElements/mapping/MappingTest';
import { InstanceSetImplementation } from './InstanceSetImplementation';
import type { PropertyMapping } from './PropertyMapping';
import type { RootFlatDataRecordType } from '../../../model/packageableElements/store/flatData/model/FlatDataDataType';
import { RootRelationalInstanceSetImplementation } from '../../../model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { InferableMappingElementIdExplicitValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';
import type { MappingInclude } from './MappingInclude';
import { InferableMappingElementRootExplicitValue } from './InferableMappingElementRoot';
import { AggregationAwareSetImplementation } from './aggregationAware/AggregationAwareSetImplementation';

export enum MAPPING_ELEMENT_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  ASSOCIATION = 'ASSOCIATION',
}

export type MappingElement =
  | EnumerationMapping
  | SetImplementation
  | AssociationImplementation;

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export type MappingElementSource =
  | Type
  | Class
  | RootFlatDataRecordType
  | View
  | Table;

export class Mapping extends PackageableElement implements Hashable, Stubable {
  includes: MappingInclude[] = [];
  classMappings: SetImplementation[] = [];
  enumerationMappings: EnumerationMapping[] = [];
  associationMappings: AssociationImplementation[] = [];
  tests: MappingTest[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      includes: observable,
      classMappings: observable,
      enumerationMappings: observable,
      associationMappings: observable,
      tests: observable,
      allClassMappings: computed,
      allEnumerationMappings: computed,
      deleteTest: action,
      addTest: action,
      deleteMappingElement: action,
      createClassMapping: action,
      createEnumerationMapping: action,
      isStub: computed,
      hashCode: computed({ keepAlive: true }),
    });
  }

  // TODO: account for mapping includes
  get allClassMappings(): SetImplementation[] {
    return [
      ...this.classMappings,
      ...this.extractAllClassMappingsFromAggregationAware(),
    ];
  }

  get allEnumerationMappings(): EnumerationMapping[] {
    return this.enumerationMappings;
  }

  generateTestName(): string {
    const generatedName = generateEnumerableNameFromToken(
      this.tests.map((test) => test.name),
      'test',
    );
    assertTrue(
      !this.tests.find((test) => test.name === generatedName),
      `Can't auto-generate test name for value '${generatedName}'`,
    );
    return generatedName;
  }

  enumerationMappingsByEnumeration(
    enumeration: Enumeration,
  ): EnumerationMapping[] {
    // TODO: we don't support included mapings yet
    // return this.includes.map(m => m.included).flat().map(m => m.enumerationMappingsByEnumeration(e)).concat(this.enumerationMappings.filter(em => em.enumeration === e));
    return this.enumerationMappings.filter(
      (enumerationMapping) =>
        enumerationMapping.enumeration.value === enumeration,
    );
  }

  getClassMappings(findInIncludedMappings = false): SetImplementation[] {
    // TODO: add association property Mapping to class mappings
    return this.classMappings;
  }

  getAggregationAwareClassMappings(): AggregationAwareSetImplementation[] {
    return this.classMappings.filter(
      (
        classMapping: SetImplementation,
      ): classMapping is AggregationAwareSetImplementation =>
        classMapping instanceof AggregationAwareSetImplementation,
    );
  }

  extractAllClassMappingsFromAggregationAware(): SetImplementation[] {
    const aggregatioAware = this.getAggregationAwareClassMappings();
    return [
      ...aggregatioAware.map((aggregate) => aggregate.mainSetImplementation),
      ...aggregatioAware
        .map((aggregate) =>
          aggregate.aggregateSetImplementations.map(
            (setImpl) => setImpl.setImplementation,
          ),
        )
        .flat(),
    ];
  }

  classMappingsByClass(
    _class: Class,
    findInIncludedMappings = false,
  ): SetImplementation[] {
    // TODO ADD association property Mapping to class mappings, AggregationAwareSetImplementation, mappingClass
    // NOTE: ADD in the proper order so find root can resolve properly down the line
    return this.getClassMappings(findInIncludedMappings).filter(
      (classMapping) => classMapping.class.value === _class,
    );
  }

  getClassMapping = (id: string): SetImplementation =>
    guaranteeNonNullable(
      this.allClassMappings.find(
        (classMapping) => classMapping.id.value === id,
      ),
      `Can't find class mapping with ID '${id}' in mapping '${this.path}'`,
    );

  getAllMappingElements(findInIncludedMappings = false): MappingElement[] {
    if (!findInIncludedMappings) {
      return [
        ...this.classMappings,
        ...this.associationMappings,
        ...this.enumerationMappings,
      ];
    }
    // TODO included mappings
    return [
      ...this.classMappings,
      ...this.associationMappings,
      ...this.enumerationMappings,
    ];
  }

  deleteTest(value: MappingTest): void {
    deleteEntry(this.tests, value);
  }
  addTest(value: MappingTest): void {
    addUniqueEntry(this.tests, value);
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  deleteMappingElement(mappingElement: MappingElement): void {
    let mappingElements: (MappingElement | PropertyMapping)[] = [];
    if (mappingElement instanceof EnumerationMapping) {
      mappingElements = this.enumerationMappings;
    } else if (mappingElement instanceof AssociationImplementation) {
      mappingElements = this.associationMappings;
    } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
      mappingElements = mappingElement.owner.propertyMappings;
    } else if (
      mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
    ) {
      mappingElements = mappingElement.owner.propertyMappings;
    } else if (mappingElement instanceof SetImplementation) {
      mappingElements = this.classMappings;
    }
    deleteEntry(mappingElements, mappingElement);
    if (mappingElement instanceof SetImplementation) {
      updateRootSetImplementationOnDelete(mappingElement);
    }
  }

  createClassMapping(
    id: string,
    _class: Class,
    setImpType: BASIC_SET_IMPLEMENTATION_TYPE,
  ): SetImplementation | undefined {
    let setImp: SetImplementation;
    // NOTE: by default when we create a new instance set implementation, we will create PURE instance set implementation
    // we don't let users choose the various instance set implementation type as that require proper source
    // e.g. flat data class mapping requires stubbing the source
    switch (setImpType) {
      case BASIC_SET_IMPLEMENTATION_TYPE.OPERATION:
        setImp = new OperationSetImplementation(
          InferableMappingElementIdExplicitValue.create(id, _class.path),
          this,
          PackageableElementExplicitReference.create(_class),
          InferableMappingElementRootExplicitValue.create(false),
          OperationType.STORE_UNION,
        );
        break;
      case BASIC_SET_IMPLEMENTATION_TYPE.INSTANCE:
        setImp = new PureInstanceSetImplementation(
          InferableMappingElementIdExplicitValue.create(id, _class.path),
          this,
          PackageableElementExplicitReference.create(_class),
          InferableMappingElementRootExplicitValue.create(false),
          OptionalPackageableElementExplicitReference.create<Class>(undefined),
        );
        break;
      default:
        return undefined;
    }
    updateRootSetImplementationOnCreate(setImp);
    this.classMappings.push(setImp);
    return setImp;
  }

  createEnumerationMapping(
    id: string,
    enumeration: Enumeration,
    sourceType: Type,
  ): EnumerationMapping {
    const enumMapping = new EnumerationMapping(
      InferableMappingElementIdExplicitValue.create(id, enumeration.path),
      PackageableElementExplicitReference.create(enumeration),
      this,
      OptionalPackageableElementExplicitReference.create(sourceType),
    );
    this.enumerationMappings.push(enumMapping);
    return enumMapping;
  }

  getRootSetImplementation = (_class: Class): SetImplementation | undefined =>
    findRootSetImplementation(this.classMappingsByClass(_class, true));
  getLeafSetImplementations = (
    _class: Class,
  ): SetImplementation[] | undefined =>
    getLeafSetImplementations(this.getRootSetImplementation(_class));

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  getMappingElementByTypeAndId(
    type: string,
    id: string,
  ): MappingElement | undefined {
    // NOTE: ID must be unique across all mapping elements of the same type
    switch (type) {
      case MAPPING_ELEMENT_TYPE.CLASS:
      case SOURCR_ID_LABEL.OPERATION_CLASS_MAPPING:
      case SOURCR_ID_LABEL.AGGREGATION_AWARE_CLASS_MAPPING:
      case SOURCR_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING:
        return this.getClassMappings().find(
          (classMapping) => classMapping.id.value === id,
        );
      case SOURCR_ID_LABEL.FLAT_DATA_CLASS_MAPPING:
        return (
          this.getClassMappings().find(
            (classMapping) => classMapping.id.value === id,
          ) ??
          this.getEmbeddedSetImplmentations()
            .filter(
              (
                a: InstanceSetImplementation,
              ): a is EmbeddedFlatDataPropertyMapping =>
                a instanceof EmbeddedFlatDataPropertyMapping,
            )
            .find((me) => me.id.value === id)
        );
      case SOURCR_ID_LABEL.RELATIONAL_CLASS_MAPPING:
        return (
          this.getClassMappings().find(
            (classMapping) => classMapping.id.value === id,
          ) ??
          this.getEmbeddedSetImplmentations()
            .filter(
              (
                a: InstanceSetImplementation,
              ): a is EmbeddedRelationalInstanceSetImplementation =>
                a instanceof EmbeddedRelationalInstanceSetImplementation,
            )
            .find((me) => me.id.value === id)
        );
      case MAPPING_ELEMENT_TYPE.ASSOCIATION:
        return this.associationMappings.find(
          (associationMapping) => associationMapping.id.value === id,
        );
      case MAPPING_ELEMENT_TYPE.ENUMERATION:
        return this.enumerationMappings.find(
          (enumerationMapping) => enumerationMapping.id.value === id,
        );
      default:
        return undefined;
    }
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return this.getClassMappings()
      .filter(
        (setImpl): setImpl is InstanceSetImplementation =>
          setImpl instanceof InstanceSetImplementation,
      )
      .map((setImpl) => setImpl.getEmbeddedSetImplmentations())
      .flat();
  }

  /**
   * Get all included mappings, accounted for loop and duplication (which should be caught by compiler)
   */
  get allIncludedMappings(): Mapping[] {
    const visited = new Set<Mapping>();
    visited.add(this);
    const resolveIncludes = (mapping: Mapping): void => {
      mapping.includes.forEach((incMapping) => {
        if (!visited.has(incMapping.included.value)) {
          visited.add(incMapping.included.value);
          resolveIncludes(incMapping.included.value);
        }
      });
    };
    resolveIncludes(this);
    visited.delete(this);
    return Array.from(visited);
  }

  static createStub = (): Mapping => new Mapping('');

  get isStub(): boolean {
    return (
      super.isStub &&
      // && isStubArray(this.includes)
      isStubArray(this.associationMappings) &&
      isStubArray(this.classMappings) &&
      isStubArray(this.enumerationMappings)
    );
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      super.hashCode,
      // TODO mapping include
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.associationMappings),
      hashArray(this.tests),
      hashArray(this.includes),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Mapping(this);
  }
}

export const getMappingElementType = (
  mappingElement: MappingElement,
): MAPPING_ELEMENT_TYPE => {
  if (mappingElement instanceof EnumerationMapping) {
    return MAPPING_ELEMENT_TYPE.ENUMERATION;
  } else if (mappingElement instanceof AssociationImplementation) {
    return MAPPING_ELEMENT_TYPE.ASSOCIATION;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return MAPPING_ELEMENT_TYPE.CLASS;
  } else if (mappingElement instanceof SetImplementation) {
    return MAPPING_ELEMENT_TYPE.CLASS;
  }
  throw new UnsupportedOperationError(
    `Can't derive mapping element type of type '${
      getClass(mappingElement).name
    }'`,
  );
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementTarget = (
  mappingElement: MappingElement,
): PackageableElement => {
  if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.enumeration.value;
  } else if (mappingElement instanceof AssociationImplementation) {
    return mappingElement.association.value;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return mappingElement.class.value;
  } else if (
    mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    return mappingElement.class.value;
  } else if (mappingElement instanceof SetImplementation) {
    return mappingElement.class.value;
  }
  throw new UnsupportedOperationError(
    `Can't derive mapping element type target of type '${
      getClass(mappingElement).name
    }'`,
  );
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getMappingElementSource = (
  mappingElement: MappingElement,
): MappingElementSource | undefined => {
  if (mappingElement instanceof OperationSetImplementation) {
    // NOTE: we don't need to resolve operation union because at the end of the day, it uses other class mappings
    // in the mapping, so if we use this method on all class mappings of a mapping, we don't miss anything
    return undefined;
  } else if (mappingElement instanceof EnumerationMapping) {
    return mappingElement.sourceType.value;
  } else if (mappingElement instanceof AssociationImplementation) {
    throw new UnsupportedOperationError();
  } else if (mappingElement instanceof PureInstanceSetImplementation) {
    return mappingElement.srcClass.value;
  } else if (mappingElement instanceof FlatDataInstanceSetImplementation) {
    return mappingElement.sourceRootRecordType.value;
  } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
    return getMappingElementSource(
      guaranteeType(
        mappingElement.rootInstanceSetImplementation,
        FlatDataInstanceSetImplementation,
      ),
    );
  } else if (
    mappingElement instanceof RootRelationalInstanceSetImplementation
  ) {
    return mappingElement.mainTableAlias.relation.value;
  } else if (
    mappingElement instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    return mappingElement.rootInstanceSetImplementation.mainTableAlias.relation
      .value;
  } else if (mappingElement instanceof AggregationAwareSetImplementation) {
    return getMappingElementSource(mappingElement.mainSetImplementation);
  }
  throw new UnsupportedOperationError(
    `Can't get mapping element source of type '${
      getClass(mappingElement).name
    }'`,
  );
};

export interface MappingElementLabel {
  value: string;
  root: boolean;
  tooltip: string;
}
