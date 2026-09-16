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
import { createModelSchema, optional, primitive } from 'serializr';

export class DataSpaceQualityBreakdown {
  isDescriptionDocumented!: boolean;
  isExecutablesPresent!: boolean;
  isModelsDocumentationPresent!: boolean;
  isEveryServiceDocumented!: boolean;
  attributeCoverage?: number;
  documentedAttributeCount!: number;
  totalAttributeCount!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataSpaceQualityBreakdown, {
      isDescriptionDocumented: primitive(),
      isExecutablesPresent: primitive(),
      isModelsDocumentationPresent: primitive(),
      isEveryServiceDocumented: primitive(),
      attributeCoverage: optional(primitive()),
      documentedAttributeCount: primitive(),
      totalAttributeCount: primitive(),
    }),
  );
}

export class DataSpaceQualityResponse {
  qualityLevel!: string; // 'DIAMOND' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'
  qualityBreakdown!: DataSpaceQualityBreakdown;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataSpaceQualityResponse, {
      qualityLevel: primitive(),
      qualityBreakdown: usingModelSchema(
        DataSpaceQualityBreakdown.serialization.schema,
      ),
    }),
  );
}
