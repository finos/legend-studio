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

import { hashArray, type Hashable } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../graph/Core_HashUtils.js';
import type { Type } from '../packageableElements/domain/Type.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import type { RelationalCSVData } from './RelationalCSVData.js';
import type { INTERNAL__UnknownEmbeddedData } from './INTERNAL__UnknownEmbeddedData.js';
import type { PackageableElement } from '../packageableElements/PackageableElement.js';

export interface EmbeddedDataVisitor<T> {
  visit_EmbeddedData(data: EmbeddedData): T;
  visit_INTERNAL__UnknownEmbeddedData(data: INTERNAL__UnknownEmbeddedData): T;

  visit_ExternalFormatData(data: ExternalFormatData): T;
  visit_ModelStoreData(data: ModelStoreData): T;
  visit_DataElementReference(data: DataElementReference): T;
  visit_RelationalCSVData(data: RelationalCSVData): T;
}

export abstract class EmbeddedData implements Hashable {
  abstract get hashCode(): string;
  abstract accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T;
}

export class DataElementReference extends EmbeddedData implements Hashable {
  dataElement!: PackageableElementReference<PackageableElement>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_ELEMENT_REFERENCE,
      this.dataElement.valueForSerialization ?? '',
    ]);
  }
  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_DataElementReference(this);
  }
}

export class ExternalFormatData extends EmbeddedData implements Hashable {
  contentType!: string;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXTERNAL_FORMAT_DATA,
      this.contentType,
      this.data,
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_ExternalFormatData(this);
  }
}

export abstract class ModelData implements Hashable {
  model!: PackageableElementReference<Type>;

  abstract get hashCode(): string;
}

export class ModelEmbeddedData extends ModelData implements Hashable {
  data!: EmbeddedData;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_EMBEDDED_DATA,
      this.model.valueForSerialization ?? '',
      this.data,
    ]);
  }
}

export class ModelInstanceData extends ModelData {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   * TODO: we may want to build out the instance `objects` once we build out the form
   *
   * @discrepancy model
   */
  instances!: object;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_INSTANCE_DATA,
      this.model.valueForSerialization ?? '',
      hashObjectWithoutSourceInformation(this.instances),
    ]);
  }
}

export class ModelStoreData extends EmbeddedData implements Hashable {
  modelData: ModelData[] | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_STORE_DATA,
      this.modelData ? hashArray(this.modelData) : '',
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_ModelStoreData(this);
  }
}
