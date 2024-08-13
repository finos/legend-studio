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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../model/packageableElements/domain/V1_TaggedValue.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';
import type { QuerySearchSortBy } from '../../../../../action/query/QuerySearchSpecification.js';

export class V1_QueryProjectCoordinates {
  groupId!: string;
  artifactId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryProjectCoordinates, {
      artifactId: primitive(),
      groupId: primitive(),
    }),
  );
}

export class V1_QuerySearchTermSpecification {
  searchTerm!: string;
  exactMatchName: boolean | undefined;
  includeOwner: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QuerySearchTermSpecification, {
      searchTerm: primitive(),
      exactMatchName: optional(primitive()),
      includeOwner: optional(primitive()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export class V1_QuerySearchSpecification {
  searchTermSpecification?: V1_QuerySearchTermSpecification | undefined;
  projectCoordinates?: V1_QueryProjectCoordinates[] | undefined;
  taggedValues?: V1_TaggedValue[] | undefined;
  stereotypes?: V1_StereotypePtr[] | undefined;
  limit?: number | undefined;
  showCurrentUserQueriesOnly?: boolean | undefined;
  combineTaggedValuesCondition?: boolean | undefined;
  sortByOption?: QuerySearchSortBy;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QuerySearchSpecification, {
      combineTaggedValuesCondition: optional(primitive()),
      limit: optional(primitive()),
      projectCoordinates: optional(
        list(usingModelSchema(V1_QueryProjectCoordinates.serialization.schema)),
      ),
      searchTermSpecification: optional(
        usingModelSchema(V1_QuerySearchTermSpecification.serialization.schema),
      ),
      showCurrentUserQueriesOnly: optional(primitive()),
      stereotypes: optional(
        list(usingModelSchema(V1_stereotypePtrModelSchema)),
      ),
      taggedValues: optional(list(usingModelSchema(V1_taggedValueModelSchema))),
      sortByOption: optional(primitive()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}
