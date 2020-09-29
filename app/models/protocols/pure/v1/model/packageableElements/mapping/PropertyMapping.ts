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

import { serializable, object } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { LocalMappingPropertyInfo } from './LocalMappingPropertyInfo';
import { PropertyPointer } from 'V1/model/packageableElements/domain/PropertyPointer';
import { PurePropertyMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export enum PropertyMappingType {
  PURE = 'purePropertyMapping'
  // XSTORE = 'xStorePropertyMapping',
}

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface PropertyMappingVisitor<T> {
  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): T;
}

export abstract class PropertyMapping implements Hashable {
  @serializable _type!: PropertyMappingType;
  @serializable(object(PropertyPointer)) property!: PropertyPointer;
  @serializable source?: string; // `source` is an information that we actually do not need to care about much as it can derived from the container/holder of the property mapping
  // NOTE: `target` is required in protocol but that doesn't seem right since the value can be empty string,
  // also when we convert this to metamodel, we might not be able to identify the class mapping corresponding to the `target` ID
  // in that case we will handle the logic in Transformer to have `target` as empty, here we use `?:` because the
  // specification in the current protocol is unreasonable and will be should be changed to optional (String[0..1])
  @serializable target?: string;
  @serializable(object(LocalMappingPropertyInfo)) localMappingProperty?: LocalMappingPropertyInfo;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROPERTY_MAPPING,
      this.property,
      this.target ?? ''
    ]);
  }

  abstract accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T
}
