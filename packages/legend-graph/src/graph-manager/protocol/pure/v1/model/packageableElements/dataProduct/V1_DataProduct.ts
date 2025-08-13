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
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
} from '../V1_PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_StereotypePtr } from '../domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../domain/V1_TaggedValue.js';

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

export class V1_DataProductLink implements Hashable {
  label: string | undefined;
  url!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_LINK,
      this.label ?? '',
      this.url,
    ]);
  }
}

export class V1_SupportInfo implements Hashable {
  documentation: V1_DataProductLink | undefined;
  website: V1_DataProductLink | undefined;
  faqUrl: V1_DataProductLink | undefined;
  supportUrl: V1_DataProductLink | undefined;
  emails: V1_Email[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SUPPORT_INFO,
      this.documentation ?? '',
      this.website ?? '',
      this.faqUrl ?? '',
      this.supportUrl ?? '',
      hashArray(this.emails),
    ]);
  }
}

export class V1_DataProductRuntimeInfo {
  id!: string;
  description: string | undefined;
  runtime!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_RUNTIME_INFO,
      this.id,
      this.description ?? '',
      this.runtime.path,
    ]);
  }
}

export class V1_ElementScope {
  exclude: boolean | undefined;
  element!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ELEMENT_SCOPE,
      this.exclude ?? '',
      this.element.path,
    ]);
  }
}

export class V1_DataProductDiagram {
  title!: string;
  description: string | undefined;
  diagram!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_DIAGRAM,
      this.title,
      this.description ?? '',
      this.diagram.path,
    ]);
  }
}

export class V1_ModelAccessPointGroup extends V1_AccessPointGroup {
  mapping!: V1_PackageableElementPointer;
  defaultRuntime!: string;
  featuredElements: V1_ElementScope[] | undefined;
  compatibleRuntimes: V1_DataProductRuntimeInfo[] = [];
  diagrams: V1_DataProductDiagram[] = [];
  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.DATA_PRODUCT_MODEL_ACCESS_POINT_GROUP,
      this.mapping.path,
      this.defaultRuntime,
      hashArray(this.featuredElements ?? []),
      hashArray(this.compatibleRuntimes),
      hashArray(this.diagrams),
    ]);
  }
}

export enum V1_DeliveryFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
  ON_DEMAND = 'ON_DEMAND',
  INTRA_DAY = 'INTRA_DAY',
  OTHER = 'OTHER',
}

export enum V1_DataProductRegion {
  APAC = 'APAC',
  EMEA = 'EMEA',
  LATAM = 'LATAM',
  NAMR = 'NAMR',
}

export abstract class V1_DataProductIcon implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DataProductLibraryIcon
  extends V1_DataProductIcon
  implements Hashable
{
  libraryId!: string;
  iconId!: string;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ICON_LIBRARY,
      this.libraryId,
      this.iconId,
    ]);
  }
}

export class V1_DataProductEmbeddedImageIcon
  extends V1_DataProductIcon
  implements Hashable
{
  imageUrl!: string;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ICON_EMBEDDED_IMAGE,
      this.imageUrl,
    ]);
  }
}

// handle incoming icons not yet modeled
export class V1_UnknownDataProductIcon
  extends V1_DataProductIcon
  implements Hashable
{
  content!: PlainObject;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_DATA_PRODUCT_ICON,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }
}

export class V1_DataProduct extends V1_PackageableElement implements Hashable {
  title: string | undefined;
  description: string | undefined;
  coverageRegions: V1_DataProductRegion[] | undefined;
  deliveryFrequency: V1_DeliveryFrequency | undefined;
  icon: V1_DataProductIcon | undefined;
  accessPointGroups: V1_AccessPointGroup[] = [];
  supportInfo: V1_SupportInfo | undefined;
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT,
      this.title ?? '',
      this.description ?? '',
      hashArray(this.coverageRegions ?? []),
      this.deliveryFrequency ?? '',
      this.icon ?? '',
      hashArray(this.accessPointGroups),
      this.supportInfo ?? '',
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_DataProduct(this);
  }
}
