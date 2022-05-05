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
import { CORE_HASH_STRUCTURE } from '../../../../MetaModelConst';
import { hashObjectWithoutSourceInformation } from '../../../../MetaModelUtils';
import type { DataElement } from '../packageableElements/data/DataElement';
import type { Class } from '../packageableElements/domain/Class';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference';

export interface EmbeddedDataVisitor<T> {
  visit_EmbeddedData(embeddedData: EmbeddedData): T;
  visit_ExternalFormatData(externalFormatData: ExternalFormatData): T;
  visit_ModelStoreData(modelStoreData: ModelStoreData): T;
  visit_DataElementReference(dataElementReference: DataElementReference): T;
}

export abstract class EmbeddedData implements Hashable {
  abstract get hashCode(): string;
  abstract accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T;
}

export class DataElementReference extends EmbeddedData implements Hashable {
  dataElement!: PackageableElementReference<DataElement>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_ELEMENT_REFERENCE,
      this.dataElement.hashValue,
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

export class ModelStoreData extends EmbeddedData implements Hashable {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   * TODO: we may want to build out the instance `objects` once we build out the form
   *
   * @discrepancy model
   */
  instances!: Map<Class, object>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_STORE_DATA,
      hashArray(Array.from(this.instances.keys()).map((e) => e.path)),
      hashObjectWithoutSourceInformation(Array.from(this.instances.values())),
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_ModelStoreData(this);
  }
}
