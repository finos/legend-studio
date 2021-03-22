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

import { observable, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { EnumerationMapping } from '../../../../../model/packageableElements/mapping/EnumerationMapping';
import type { PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import { PropertyMapping } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import type { RelationalOperationElement } from '../../../../../model/packageableElements/store/relational/model/RelationalOperationElement';
import type { PropertyMappingsImplementation } from '../../../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../../../model/packageableElements/domain/PropertyReference';
import type { SetImplementation } from '../../../../../model/packageableElements/mapping/SetImplementation';

export class RelationalPropertyMapping
  extends PropertyMapping
  implements Hashable {
  transformer?: EnumerationMapping;
  relationalOperation: RelationalOperationElement;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    relationalOperation: RelationalOperationElement,
    source: SetImplementation,
    target?: SetImplementation,
  ) {
    super(owner, property, source, target);

    makeObservable(this, {
      transformer: observable,
      relationalOperation: observable,
      hashCode: computed,
    });

    this.relationalOperation = relationalOperation;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_RelationalPropertyMapping(this);
  }

  get isStub(): boolean {
    // TODO figure out isStub conditions
    return false;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REALTIONAL_PROPERTY_MAPPPING,
      super.hashCode,
      this.transformer?.id.value ?? '',
      this.relationalOperation,
    ]);
  }
}
