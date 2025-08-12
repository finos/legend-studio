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
import {
  PackageableElement,
  type PackageableElementVisitor,
} from '../packageableElements/PackageableElement.js';
import type { RawLambda } from '../rawValueSpecification/RawLambda.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../Core_HashUtils.js';
import { AnnotatedElement } from '../packageableElements/domain/AnnotatedElement.js';
import type { Mapping } from '../packageableElements/mapping/Mapping.js';
import type { PackageableRuntime } from '../packageableElements/runtime/PackageableRuntime.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import type { Package } from '../packageableElements/domain/Package.js';
import type { Class } from '../packageableElements/domain/Class.js';
import type { Enumeration } from '../packageableElements/domain/Enumeration.js';
import type { Association } from '../packageableElements/domain/Association.js';

export abstract class AccessPoint implements Hashable {
  id: string;
  description: string | undefined;

  constructor(id: string) {
    this.id = id;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ACCESS_POINT,
      this.id,
      this.description ?? '',
    ]);
  }
}

export enum LakehouseTargetEnv {
  Snowflake = 'Snowflake',
  Databricks = 'Databricks',
  BigQuery = 'BigQuery',
  DuckDb = 'DuckDb',
}

export class LakehouseAccessPoint extends AccessPoint {
  targetEnvironment: string;
  classification: string | undefined;
  func: RawLambda;
  reproducible: boolean | undefined;

  constructor(id: string, targetEnv: string, func: RawLambda) {
    super(id);
    this.targetEnvironment = targetEnv;
    this.func = func;
  }

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

export class UnknownAccessPoint extends AccessPoint {
  content!: PlainObject;
  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.UNKNOWN_ACCESS_POINT,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }
}

export class DataProductRuntimeInfo {
  id!: string;
  description: string | undefined;
  runtime!: PackageableElementReference<PackageableRuntime>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_RUNTIME_INFO,
      this.id,
      this.description ?? '',
      this.runtime.valueForSerialization ?? '',
    ]);
  }
}

export type DataProductElement = Package | Class | Enumeration | Association;

export class DataProductElementScope implements Hashable {
  exclude: boolean | undefined;
  element!: PackageableElementReference<DataProductElement>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ELEMENT_SCOPE,
      this.exclude ?? '',
      this.element.valueForSerialization ?? '',
    ]);
  }
}

export class DataProductDiagram implements Hashable {
  title!: string;
  description: string | undefined;
  diagram!: PackageableElement;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_DIAGRAM,
      this.title,
      this.description ?? '',
      this.diagram,
    ]);
  }
}

export class AccessPointGroup extends AnnotatedElement implements Hashable {
  id!: string;
  description: string | undefined;
  accessPoints: AccessPoint[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ACCESS_POINT_GROUP,
      this.id,
      this.description ?? '',
      hashArray(this.accessPoints),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
    ]);
  }
}

export class ModelAccessPointGroup
  extends AccessPointGroup
  implements Hashable
{
  mapping!: PackageableElementReference<Mapping>;
  defaultRuntime!: DataProductRuntimeInfo;
  featuredElements: DataProductElementScope[] = [];
  compatibleRuntimes: DataProductRuntimeInfo[] = [];
  diagrams: DataProductDiagram[] = [];

  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.DATA_PRODUCT_MODEL_ACCESS_POINT_GROUP,
      this.mapping.valueForSerialization ?? '',
      this.defaultRuntime.id,
      hashArray(this.featuredElements),
      hashArray(this.compatibleRuntimes),
      hashArray(this.diagrams),
    ]);
  }
}

export class Email implements Hashable {
  title!: string;
  address!: string;

  constructor(address: string, title: string) {
    this.address = address;
    this.title = title;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.EMAIL, this.title, this.address]);
  }
}

export class DataProductLink {
  label: string | undefined;
  url: string;

  constructor(url: string, label?: string) {
    this.url = url;
    this.label = label;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_LINK,
      this.label ?? '',
      this.url,
    ]);
  }
}

export class SupportInfo implements Hashable {
  documentation: DataProductLink | undefined;
  website: DataProductLink | undefined;
  faqUrl: DataProductLink | undefined;
  supportUrl: DataProductLink | undefined;
  emails: Email[] = [];

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

export enum DataProduct_DeliveryFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
  ON_DEMAND = 'ON_DEMAND',
  INTRA_DAY = 'INTRA_DAY',
  OTHER = 'OTHER',
}

export enum DataProduct_Region {
  APAC = 'APAC',
  EMEA = 'EMEA',
  LATAM = 'LATAM',
  NAMR = 'NAMR',
}

export abstract class DataProductIcon implements Hashable {
  abstract get hashCode(): string;
}

export class EmbeddedImageIcon extends DataProductIcon implements Hashable {
  imageUrl: string;

  constructor(imageUrl: string) {
    super();
    this.imageUrl = imageUrl;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ICON_EMBEDDED_IMAGE,
      this.imageUrl,
    ]);
  }
}

export class LibraryIcon extends DataProductIcon implements Hashable {
  libraryId: string;
  iconId: string;

  constructor(libraryId: string, iconId: string) {
    super();
    this.libraryId = libraryId;
    this.iconId = iconId;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ICON_LIBRARY,
      this.libraryId,
      this.iconId,
    ]);
  }
}

export class DataProduct extends PackageableElement {
  title: string | undefined;
  description: string | undefined;
  coverageRegions: DataProduct_Region[] | undefined;
  deliveryFrequency: DataProduct_DeliveryFrequency | undefined;
  icon: DataProductIcon | undefined;
  accessPointGroups: AccessPointGroup[] = [];
  supportInfo: SupportInfo | undefined;

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_DataProduct(this);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT,
      this.title ?? '',
      this.description ?? '',
      hashArray(this.coverageRegions ?? []),
      this.deliveryFrequency ?? '',
      this.icon ?? '',
      hashArray(this.accessPointGroups),
      this.supportInfo ?? '',
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }
}
