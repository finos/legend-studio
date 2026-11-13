/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import {
  type QUALITY_LEVEL,
  createQualityResponseFactory,
} from './QualityLevel.js';

export class DataProductQualityBreakdown {
  isDescriptionDocumented!: boolean;
  isAccessPointsPresent!: boolean;
  isAccessPointGroupDescriptionsDocumented!: boolean;
  isEveryAccessPointDocumented!: boolean;
  attributeCoverage?: number | undefined;
  documentedAttributeCount!: number;
  totalAttributeCount!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductQualityBreakdown, {
      isDescriptionDocumented: primitive(),
      isAccessPointsPresent: primitive(),
      isAccessPointGroupDescriptionsDocumented: primitive(),
      isEveryAccessPointDocumented: primitive(),
      attributeCoverage: optional(primitive()),
      documentedAttributeCount: primitive(),
      totalAttributeCount: primitive(),
    }),
  );
}

export class DataProductQualityResponse {
  qualityLevel!: QUALITY_LEVEL;
  qualityBreakdown!: DataProductQualityBreakdown;

  static readonly serialization = new SerializationFactory(
    createModelSchema(
      DataProductQualityResponse,
      {
        qualityLevel: primitive(),
        qualityBreakdown: usingModelSchema(
          DataProductQualityBreakdown.serialization.schema,
        ),
      },
      createQualityResponseFactory(() => new DataProductQualityResponse()),
    ),
  );
}
