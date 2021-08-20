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

import { observable, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation';
import type { RelationalOperationElement } from '../model/RelationalOperationElement';
import type { PropertyMapping } from '../../../mapping/PropertyMapping';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import type { Mapping } from '../../../mapping/Mapping';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { Class } from '../../../domain/Class';
import type { InferableMappingElementRoot } from '../../../mapping/InferableMappingElementRoot';
import { EmbeddedRelationalInstanceSetImplementation } from './EmbeddedRelationalInstanceSetImplementation';

export class RelationalInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  primaryKey: RelationalOperationElement[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      primaryKey: observable,
    });
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    const embeddedPropertyMappings = this.propertyMappings.filter(
      (
        propertyMapping: PropertyMapping,
      ): propertyMapping is EmbeddedRelationalInstanceSetImplementation =>
        propertyMapping instanceof EmbeddedRelationalInstanceSetImplementation,
    );
    return embeddedPropertyMappings
      .map((propertyMapping) => propertyMapping.getEmbeddedSetImplmentations())
      .flat()
      .concat(embeddedPropertyMappings);
  }

  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): PropertyMapping | undefined {
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

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_RelationalInstanceSetImplementation(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      hashArray(this.primaryKey),
      hashArray(
        this.propertyMappings.filter(
          (propertyMapping) => !propertyMapping.isStub,
        ),
      ),
    ]);
  }
}
