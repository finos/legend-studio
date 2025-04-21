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

export class ProductSearchResultTableField {
  field_description!: string;
  field_name!: string;
  similarity!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProductSearchResultTableField, {
      field_description: primitive(),
      field_name: primitive(),
      similarity: primitive(),
    }),
  );
}

export class ProductSearchResultTable {
  dataset_score!: number;
  table_description!: string;
  table_fields!: ProductSearchResultTableField[];
  table_name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProductSearchResultTable, {
      dataset_score: primitive(),
      table_description: primitive(),
      table_fields: list(object(ProductSearchResultTableField)),
      table_name: primitive(),
    }),
  );
}

export class ProductSearchResult {
  data_product_description!: string;
  data_product_link!: string;
  data_product_name!: string;
  product_score!: number;
  tables!: ProductSearchResultTable[];
  vendor_name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProductSearchResult, {
      data_product_description: primitive(),
      data_product_link: primitive(),
      data_product_name: primitive(),
      product_score: primitive(),
      tables: list(object(ProductSearchResultTable)),
      vendor_name: primitive(),
    }),
  );
}
