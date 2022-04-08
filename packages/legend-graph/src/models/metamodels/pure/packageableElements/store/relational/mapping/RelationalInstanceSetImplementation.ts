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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation';
import type { RelationalOperationElement } from '../model/RelationalOperationElement';
import type { PropertyMapping } from '../../../mapping/PropertyMapping';
import { EmbeddedRelationalInstanceSetImplementation } from './EmbeddedRelationalInstanceSetImplementation';

export class RelationalInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  primaryKey: RelationalOperationElement[] = [];

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
