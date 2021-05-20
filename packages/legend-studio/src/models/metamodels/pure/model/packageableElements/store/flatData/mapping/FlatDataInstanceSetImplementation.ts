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
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InstanceSetImplementation } from '../../../../../model/packageableElements/mapping/InstanceSetImplementation';
import type { AbstractFlatDataPropertyMapping } from './AbstractFlatDataPropertyMapping';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { Mapping } from '../../../../../model/packageableElements/mapping/Mapping';
import type { SetImplementationVisitor } from '../../../../../model/packageableElements/mapping/SetImplementation';
import { EmbeddedFlatDataPropertyMapping } from './EmbeddedFlatDataPropertyMapping';
import type { RootFlatDataRecordType } from '../../../../../model/packageableElements/store/flatData/model/FlatDataDataType';
import type { InferableMappingElementIdValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementId';
import type { RawLambda } from '../../../../../model/rawValueSpecification/RawLambda';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import type { RootFlatDataRecordTypeReference } from '../../../../../model/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference';
import type { InferableMappingElementRoot } from '../../../../../model/packageableElements/mapping/InferableMappingElementRoot';

export class FlatDataInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  sourceRootRecordType: RootFlatDataRecordTypeReference;
  filter?: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  declare propertyMappings: AbstractFlatDataPropertyMapping[];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    sourceRootRecordType: RootFlatDataRecordTypeReference,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      filter: observable,
      setSourceRootRecordType: action,
      setPropertyMappings: action,
      hashCode: computed,
    });

    this.sourceRootRecordType = sourceRootRecordType;
  }

  setSourceRootRecordType(value: RootFlatDataRecordType): void {
    this.sourceRootRecordType.setValue(value);
  }
  setPropertyMappings(value: AbstractFlatDataPropertyMapping[]): void {
    this.propertyMappings = value;
  }

  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): AbstractFlatDataPropertyMapping | undefined {
    let properties = undefined;
    properties = this.propertyMappings.filter(
      (propertyMapping) => propertyMapping.property.value.name === propertyName,
    );
    if (targetId === undefined || properties.length === 1) {
      return properties[0];
    }
    return properties.find(
      (propertyMapping) =>
        propertyMapping.targetSetImplementation &&
        propertyMapping.targetSetImplementation.id.value === targetId,
    );
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    const embeddedPropertyMappings = this.propertyMappings.filter(
      (
        propertyMapping: AbstractFlatDataPropertyMapping,
      ): propertyMapping is EmbeddedFlatDataPropertyMapping =>
        propertyMapping instanceof EmbeddedFlatDataPropertyMapping,
    );
    return embeddedPropertyMappings
      .map((propertyMapping) => propertyMapping.getEmbeddedSetImplmentations())
      .flat()
      .concat(embeddedPropertyMappings);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.sourceRootRecordType.ownerReference.valueForSerialization,
      this.sourceRootRecordType.value.owner.name,
      this.filter ?? '',
      hashArray(
        this.propertyMappings.filter(
          (propertyMapping) => !propertyMapping.isStub,
        ),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_FlatDataInstanceSetImplementation(this);
  }
}
