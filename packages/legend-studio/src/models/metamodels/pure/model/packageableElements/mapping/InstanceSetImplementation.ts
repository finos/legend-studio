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
import type { Hashable } from '@finos/legend-studio-shared';
import type { MappingClass } from '../../../model/packageableElements/mapping/MappingClass';
import { SetImplementation } from '../../../model/packageableElements/mapping/SetImplementation';
import type { PropertyMappingsImplementation } from '../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { PropertyMapping } from '../../../model/packageableElements/mapping/PropertyMapping';
import type { InferableMappingElementIdValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Class } from '../../../model/packageableElements/domain/Class';
import type { InferableMappingElementRoot } from '../../../model/packageableElements/mapping/InferableMappingElementRoot';

export abstract class InstanceSetImplementation
  extends SetImplementation
  implements PropertyMappingsImplementation, Hashable
{
  mappingClass?: MappingClass;
  propertyMappings: PropertyMapping[] = [];
  // aggregateSpecification: AggregateSpecification[0..1];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      mappingClass: observable,
      propertyMappings: observable,
    });
  }

  abstract getEmbeddedSetImplmentations(): InstanceSetImplementation[];
  abstract findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): PropertyMapping | undefined;
}
