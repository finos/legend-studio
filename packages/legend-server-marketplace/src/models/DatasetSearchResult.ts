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
  customListWithSchema,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';

// ------------------------------------------- Dataset Search -------------------------------------------

export class DatasetSearchDataProductDetails {
  _type!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DatasetSearchDataProductDetails, {
      _type: primitive(),
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      path: primitive(),
    }),
  );
}

export class DatasetSearchDatasetDetails {
  _type!: string;
  modelPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DatasetSearchDatasetDetails, {
      _type: primitive(),
      modelPath: primitive(),
    }),
  );
}

export class DatasetSearchResult {
  datasetName!: string;
  datasetDescription?: string;
  dataProductDetails!: DatasetSearchDataProductDetails;
  datasetDetails!: DatasetSearchDatasetDetails;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DatasetSearchResult, {
      datasetName: primitive(),
      datasetDescription: optional(primitive()),
      dataProductDetails: usingModelSchema(
        DatasetSearchDataProductDetails.serialization.schema,
      ),
      datasetDetails: usingModelSchema(
        DatasetSearchDatasetDetails.serialization.schema,
      ),
    }),
  );
}

export class DatasetSearchMetadata {
  total_count!: number;
  num_pages!: number;
  page_size!: number;
  page_number!: number;
  next_page_number?: number;
  prev_page_number?: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DatasetSearchMetadata, {
      total_count: primitive(),
      num_pages: primitive(),
      page_size: primitive(),
      page_number: primitive(),
      next_page_number: optional(primitive()),
      prev_page_number: optional(primitive()),
    }),
  );
}

export class DatasetSearchResponse {
  results!: DatasetSearchResult[];
  metadata!: DatasetSearchMetadata;
  errorMessage?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DatasetSearchResponse, {
      results: customListWithSchema(DatasetSearchResult.serialization.schema),
      metadata: usingModelSchema(DatasetSearchMetadata.serialization.schema),
      errorMessage: optional(primitive()),
    }),
  );
}

// ------------------------------------------- Field Search -------------------------------------------

export class FieldSearchResult {
  fieldName!: string;
  fieldDescription?: string;
  fieldType!: string;
  datasetName!: string;
  dataProductTitle?: string;
  dataProductDetails!: DatasetSearchDataProductDetails;
  modelPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(FieldSearchResult, {
      fieldName: primitive(),
      fieldDescription: optional(primitive()),
      fieldType: primitive(),
      datasetName: primitive(),
      dataProductTitle: optional(primitive()),
      dataProductDetails: usingModelSchema(
        DatasetSearchDataProductDetails.serialization.schema,
      ),
      modelPath: primitive(),
    }),
  );
}

export class FieldSearchResponse {
  results!: FieldSearchResult[];
  metadata!: DatasetSearchMetadata;
  errorMessage?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(FieldSearchResponse, {
      results: customListWithSchema(FieldSearchResult.serialization.schema),
      metadata: usingModelSchema(DatasetSearchMetadata.serialization.schema),
      errorMessage: optional(primitive()),
    }),
  );
}
