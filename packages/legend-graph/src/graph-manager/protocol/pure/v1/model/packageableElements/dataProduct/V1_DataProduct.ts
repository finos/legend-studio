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
  hashArray,
  type Hashable,
  type PlainObject,
} from '@finos/legend-shared';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '../V1_PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_StereotypePtr } from '../domain/V1_StereotypePtr.js';

export const V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE = 'dataProduct';

export abstract class V1_AccessPoint implements Hashable {
  id!: string;
  description: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ACCESS_POINT,
      this.id,
      this.description ?? '',
    ]);
  }
}

export class V1_LakehouseAccessPoint
  extends V1_AccessPoint
  implements Hashable
{
  targetEnvironment!: string;
  classification: string | undefined;
  func!: V1_RawLambda;
  reproducible: boolean | undefined;

  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.LAKEHOUSE_ACCESS_POINT,
      this.targetEnvironment,
      this.classification ?? '',
      this.func,
      this.reproducible ?? '',
    ]);
  }
}

// handle incoming accesspoints not yet modeled
export class V1_UnknownAccessPoint extends V1_AccessPoint implements Hashable {
  content!: PlainObject;
  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.UNKNOWN_ACCESS_POINT,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }
}

export class V1_AccessPointGroup implements Hashable {
  id!: string;
  description: string | undefined;
  stereotypes: V1_StereotypePtr[] = [];
  accessPoints: V1_AccessPoint[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ACCESS_POINT_GROUP,
      this.id,
      this.description ?? '',
      hashArray(this.accessPoints),
      hashArray(this.stereotypes),
    ]);
  }
}

export class V1_Email implements Hashable {
  title!: string;
  address!: string;

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.EMAIL, this.title, this.address]);
  }
}

export class V1_SupportInfo implements Hashable {
  documentationUrl: string | undefined;
  website: string | undefined;
  faqUrl: string | undefined;
  supportUrl: string | undefined;
  emails: V1_Email[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SUPPORT_INFO,
      this.documentationUrl ?? '',
      this.website ?? '',
      this.faqUrl ?? '',
      this.supportUrl ?? '',
      hashArray(this.emails),
    ]);
  }
}

export class V1_DataProduct extends V1_PackageableElement implements Hashable {
  title: string | undefined;
  description: string | undefined;
  accessPointGroups: V1_AccessPointGroup[] = [];
  icon: string | undefined;
  imageUrl: string | undefined;
  supportInfo: V1_SupportInfo | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT,
      hashArray(this.accessPointGroups),
      this.title ?? '',
      this.description ?? '',
      this.icon ?? '',
      this.imageUrl ?? '',
      this.supportInfo ?? '',
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_DataProduct(this);
  }
}
