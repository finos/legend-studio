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
  SerializationFactory,
  usingModelSchema,
  type Hashable,
} from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';
import type { V1_Type } from '../packageableElements/type/V1_Type.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';

export class V1_RelationTypeColumn implements Hashable {
  name!: string;
  type!: string;
  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RelationTypeColumn, {
      name: primitive(),
      type: primitive(),
    }),
  );

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.REALTION_TYPE, this.name, this.type]);
  }
}

export class V1_RelationType implements V1_Type {
  columns: V1_RelationTypeColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RelationType, {
      columns: list(
        usingModelSchema(V1_RelationTypeColumn.serialization.schema),
      ),
    }),
  );

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REALTION_TYPE,
      hashArray(this.columns),
    ]);
  }
}
