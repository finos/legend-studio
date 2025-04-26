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
}

export class LakehouseAccessPoint extends AccessPoint {
  targetEnvironment: string;
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

export class AccessPointGroup implements Hashable {
  id!: string;
  description: string | undefined;
  accessPoints: AccessPoint[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT_ACCESS_POINT_GROUP,
      this.id,
      this.description ?? '',
      hashArray(this.accessPoints),
    ]);
  }
}

export class DataProduct extends PackageableElement {
  title: string | undefined;
  description: string | undefined;
  accessPointGroups: AccessPointGroup[] = [];

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_DataProduct(this);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATA_PRODUCT,
      hashArray(this.accessPointGroups),
      this.title ?? '',
      this.description ?? '',
    ]);
  }
}
