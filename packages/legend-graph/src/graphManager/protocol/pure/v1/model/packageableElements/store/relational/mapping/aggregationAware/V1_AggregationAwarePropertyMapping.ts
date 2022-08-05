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
  type V1_PropertyMappingVisitor,
  V1_PropertyMapping,
} from '../../../../../../model/packageableElements/mapping/V1_PropertyMapping.js';

export class V1_AggregationAwarePropertyMapping extends V1_PropertyMapping {
  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_AggregationAwarePropertyMapping(this);
  }
}
