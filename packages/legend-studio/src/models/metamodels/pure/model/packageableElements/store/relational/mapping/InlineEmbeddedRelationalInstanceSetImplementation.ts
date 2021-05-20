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
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { InlineEmbeddedSetImplementation } from '../../../../../model/packageableElements/mapping/EmbeddedSetImplementation';
import type {
  SetImplementation,
  SetImplementationVisitor,
} from '../../../../../model/packageableElements/mapping/SetImplementation';
import type { PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import type { PropertyMappingsImplementation } from '../../../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../../../model/packageableElements/domain/PropertyReference';
import type { RootRelationalInstanceSetImplementation } from '../../../../../model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { InferableMappingElementIdValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementId';

export class InlineEmbeddedRelationalInstanceSetImplementation
  extends EmbeddedRelationalInstanceSetImplementation
  implements InlineEmbeddedSetImplementation
{
  inlineSetImplementation!: SetImplementation;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: RootRelationalInstanceSetImplementation,
    source: SetImplementation,
    _class: PackageableElementReference<Class>,
    id: InferableMappingElementIdValue,
    target?: SetImplementation,
  ) {
    super(
      owner,
      property,
      rootInstanceSetImplementation,
      source,
      _class,
      id,
      target,
    );

    makeObservable(this, {
      inlineSetImplementation: observable,
    });
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_InlineEmbeddedRelationalPropertyMapping(this);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    throw new Error('Method not implemented.');
  }
}
