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

import { observable } from 'mobx';
import { Hashable } from 'MetaModelUtility';
import { MappingClass } from 'MM/model/packageableElements/mapping/MappingClass';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PropertyMappingsImplementation } from 'MM/model/packageableElements/mapping/PropertyMappingsImplementation';
import { PropertyMapping } from 'MM/model/packageableElements/mapping/PropertyMapping';

export abstract class InstanceSetImplementation extends SetImplementation implements PropertyMappingsImplementation, Hashable {
  @observable mappingClass?: MappingClass;
  @observable propertyMappings: PropertyMapping[] = [];
  // aggregateSpecification: AggregateSpecification[0..1];
  abstract getEmbeddedSetImplmentations(): InstanceSetImplementation[];
  abstract findPropertyMapping(propertyName: string, targetId: string | undefined): PropertyMapping | undefined;
}
