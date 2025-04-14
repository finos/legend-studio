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

import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, list, object, primitive } from 'serializr';

export class SearchResultTableField {
  field_description!: string;
  field_name!: string;
  similarity!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SearchResultTableField, {
      field_description: primitive(),
      field_name: primitive(),
      similarity: primitive(),
    }),
  );
}

export class SearchResultTable {
  dataset_score!: number;
  table_description!: string;
  table_fields!: SearchResultTableField[];
  table_name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SearchResultTable, {
      dataset_score: primitive(),
      table_description: primitive(),
      table_fields: list(object(SearchResultTableField)),
      table_name: primitive(),
    }),
  );
}

export class SearchResult {
  data_product_description!: string;
  data_product_link!: string;
  data_product_name!: string;
  product_score!: number;
  tables!: SearchResultTable[];
  vendor_name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SearchResult, {
      data_product_description: primitive(),
      data_product_link: primitive(),
      data_product_name: primitive(),
      product_score: primitive(),
      tables: list(object(SearchResultTable)),
      vendor_name: primitive(),
    }),
  );
}
