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

import { filterByType, hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation';
import type { AbstractFlatDataPropertyMapping } from './AbstractFlatDataPropertyMapping';
import type { Class } from '../../../domain/Class';
import type { Mapping } from '../../../mapping/Mapping';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation';
import { EmbeddedFlatDataPropertyMapping } from './EmbeddedFlatDataPropertyMapping';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import type { RawLambda } from '../../../../rawValueSpecification/RawLambda';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { RootFlatDataRecordTypeReference } from '../model/RootFlatDataRecordTypeReference';
import type { InferableMappingElementRoot } from '../../../mapping/InferableMappingElementRoot';

export class FlatDataInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  sourceRootRecordType: RootFlatDataRecordTypeReference;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  filter?: RawLambda | undefined;
  declare propertyMappings: AbstractFlatDataPropertyMapping[];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    sourceRootRecordType: RootFlatDataRecordTypeReference,
  ) {
    super(id, parent, _class, root);
    this.sourceRootRecordType = sourceRootRecordType;
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
      filterByType(EmbeddedFlatDataPropertyMapping),
    );
    return embeddedPropertyMappings
      .map((propertyMapping) => propertyMapping.getEmbeddedSetImplmentations())
      .flat()
      .concat(embeddedPropertyMappings);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.sourceRootRecordType.ownerReference.hashValue,
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
