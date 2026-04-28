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
import type { DataProductSearchResultDetailsType } from './DataProductSearchResult.js';

export enum FieldSearchType {
  HYBRID = 'hybrid',
}

export interface FieldSearchRequest {
  query: string;
  searchType?: FieldSearchType;
  pageSize?: number;
  pageNumber?: number;
  dataProductTypes?: string[];
}

// ============================================================================
// Grouped Field Search API Models
// ============================================================================

export class GroupedFieldSearchDataProduct {
  path!: string;
  productType!: DataProductSearchResultDetailsType;
  datasetName?: string;
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  modelPath?: string;
  dataProductId?: string;
  deploymentId?: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(GroupedFieldSearchDataProduct, {
      path: primitive(),
      productType: primitive(),
      datasetName: optional(primitive()),
      groupId: optional(primitive()),
      artifactId: optional(primitive()),
      versionId: optional(primitive()),
      modelPath: optional(primitive()),
      dataProductId: optional(primitive()),
      deploymentId: optional(primitive()),
    }),
  );
}

export class GroupedFieldSearchResultEntry {
  fieldName!: string;
  fieldType?: string;
  fieldDescription?: string;
  dataProducts!: GroupedFieldSearchDataProduct[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(GroupedFieldSearchResultEntry, {
      fieldName: primitive(),
      fieldType: optional(primitive()),
      fieldDescription: optional(primitive()),
      dataProducts: customListWithSchema(
        GroupedFieldSearchDataProduct.serialization.schema,
      ),
    }),
  );
}

export class GroupedFieldSearchResponseMetadata {
  total_count!: number;
  num_pages!: number;
  page_size!: number;
  page_number!: number;
  lakehouse_count!: number;
  legacy_count!: number;
  total_field_matches!: number;
  next_page_number?: number | null;
  prev_page_number?: number | null;

  static readonly serialization = new SerializationFactory(
    createModelSchema(GroupedFieldSearchResponseMetadata, {
      total_count: primitive(),
      num_pages: primitive(),
      page_size: primitive(),
      page_number: primitive(),
      lakehouse_count: primitive(),
      legacy_count: primitive(),
      total_field_matches: primitive(),
      next_page_number: optional(primitive()),
      prev_page_number: optional(primitive()),
    }),
  );
}

export class GroupedFieldSearchResponse {
  results!: GroupedFieldSearchResultEntry[];
  metadata!: GroupedFieldSearchResponseMetadata;

  static readonly serialization = new SerializationFactory(
    createModelSchema(GroupedFieldSearchResponse, {
      results: customListWithSchema(
        GroupedFieldSearchResultEntry.serialization.schema,
      ),
      metadata: usingModelSchema(
        GroupedFieldSearchResponseMetadata.serialization.schema,
      ),
    }),
  );
}
