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
import { EmbeddedData, type EmbeddedDataVisitor } from './EmbeddedData.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../Core_HashUtils.js';

export class INTERNAL__UnknownEmbeddedData
  extends EmbeddedData
  implements Hashable
{
  content!: PlainObject;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_EMBEDDED_DATA,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_INTERNAL__UnknownEmbeddedData(this);
  }
}
