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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../graph/Core_HashUtils.js';
import type { V1_RelationalCSVData } from './V1_RelationalCSVData.js';
import type { V1_INTERNAL__UnknownEmbeddedData } from './V1_INTERNAL__UnknownEmbeddedData.js';
import type { V1_PackageableElementPointer } from '../packageableElements/V1_PackageableElement.js';

export interface V1_EmbeddedDataVisitor<T> {
  visit_EmbeddedData(data: V1_EmbeddedData): T;
  visit_INTERNAL__UnknownEmbeddedData(
    data: V1_INTERNAL__UnknownEmbeddedData,
  ): T;

  visit_ExternalFormatData(data: V1_ExternalFormatData): T;
  visit_ModelStoreData(data: V1_ModelStoreData): T;
  visit_DataElementReference(data: V1_DataElementReference): T;
  visit_RelationalData(data: V1_RelationalCSVData): T;
}

export abstract class V1_EmbeddedData implements Hashable {
  abstract get hashCode(): string;

  abstract accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T;
}

export class V1_DataElementReference
  extends V1_EmbeddedData
  implements Hashable
{
  dataElement!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_ELEMENT_REFERENCE,
      this.dataElement.path,
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
    return visitor.visit_DataElementReference(this);
  }
}
export class V1_ExternalFormatData extends V1_EmbeddedData implements Hashable {
  contentType!: string;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXTERNAL_FORMAT_DATA,
      this.contentType,
      this.data,
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
    return visitor.visit_ExternalFormatData(this);
  }
}

export abstract class V1_ModelData {
  model!: string;

  abstract get hashCode(): string;
}

export class V1_ModelEmbeddedData extends V1_ModelData implements Hashable {
  data!: V1_EmbeddedData;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_EMBEDDED_DATA,
      this.model,
      this.data,
    ]);
  }
}

export class V1_ModelInstanceData extends V1_ModelData {
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
      this.model,
      hashObjectWithoutSourceInformation(this.instances),
    ]);
  }
}

export class V1_ModelStoreData extends V1_EmbeddedData implements Hashable {
  modelData: V1_ModelData[] | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_STORE_DATA,
      this.modelData ? hashArray(this.modelData) : '',
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
    return visitor.visit_ModelStoreData(this);
  }
}
