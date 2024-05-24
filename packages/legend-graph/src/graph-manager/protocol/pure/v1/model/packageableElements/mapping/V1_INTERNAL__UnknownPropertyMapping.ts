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

import {
  hashArray,
  type Hashable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import {
  V1_PropertyMapping,
  type V1_PropertyMappingVisitor,
} from './V1_PropertyMapping.js';

/**
 * NOTE: compared to other `INTERNAL__UnknownElement...` structure, unknown property mapping is not as
 * well utilized, this is due to our special handling of the serialization process of property
 * mappings, we decided to only serialize property mappings relevant to its parent class mapping
 * e.g. for PureInstanceSetImplementation, we would only serialize PurePropertyMapping and the rest
 * are skipped, hence, the strategy of using unknown property mapping is not really viable here.
 * But we added this here so we are ready in case in the future we change our strategy of handling
 * property mappings.
 */
export class V1_INTERNAL__UnknownPropertyMapping
  extends V1_PropertyMapping
  implements Hashable
{
  content!: PlainObject;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_PROPERTY_MAPPING,
      this.property,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_INTERNAL__UnknownPropertyMapping(this);
  }
}
