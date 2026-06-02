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

import {
  customListWithSchema,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';
import {
  DatasetSearchDataProductDetails,
  DatasetSearchDatasetDetails,
  DatasetSearchMetadata,
} from './DatasetSearchResult.js';

export class EntitySearchRelatedField {
  fieldName!: string;
  fieldDescription?: string;
  fieldType?: string;
  similarityScore!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(EntitySearchRelatedField, {
      fieldName: primitive(),
      fieldDescription: optional(primitive()),
      fieldType: optional(primitive()),
      similarityScore: primitive(),
    }),
  );
}

export class EntitySearchResult {
  datasetName!: string;
  datasetDescription?: string;
  dataProductTitle?: string;
  dataProductDetails!: DatasetSearchDataProductDetails;
  datasetDetails?: DatasetSearchDatasetDetails;
  similarityScore!: number;
  relatedFields!: EntitySearchRelatedField[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(EntitySearchResult, {
      datasetName: primitive(),
      datasetDescription: optional(primitive()),
      dataProductTitle: optional(primitive()),
      dataProductDetails: usingModelSchema(
        DatasetSearchDataProductDetails.serialization.schema,
      ),
      datasetDetails: optional(
        usingModelSchema(DatasetSearchDatasetDetails.serialization.schema),
      ),
      similarityScore: primitive(),
      relatedFields: customListWithSchema(
        EntitySearchRelatedField.serialization.schema,
      ),
    }),
  );
}

export class EntitySearchResponse {
  results!: EntitySearchResult[];
  metadata?: DatasetSearchMetadata;

  static readonly serialization = new SerializationFactory(
    createModelSchema(EntitySearchResponse, {
      results: customListWithSchema(EntitySearchResult.serialization.schema),
      metadata: optional(
        usingModelSchema(DatasetSearchMetadata.serialization.schema),
      ),
    }),
  );
}
