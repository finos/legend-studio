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

import { observable, makeObservable, override } from 'mobx';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { SchemaSet } from '../schemaSet/DSLExternalFormat_SchemaSet';
import { Store } from '../../store/Store';
import type { OptionalPackageableElementReference } from '../../PackageableElementReference';
import type { ModelUnit } from './DSLExternalFormat_ModelUnit';
import type { PackageableElementVisitor } from '../../PackageableElement';
import { DSL_EXTERNAL_FORMAT_HASH_STRUCTURE } from '../../../../../DSLExternalFormat_ModelUtils';

export class Binding extends Store implements Hashable {
  schemaSet!: OptionalPackageableElementReference<SchemaSet>;
  schemaId?: string | undefined;
  contentType!: string;
  modelUnit!: ModelUnit;

  constructor(name: string) {
    super(name);

    makeObservable<Binding, '_elementHashCode'>(this, {
      schemaSet: observable,
      schemaId: observable,
      contentType: observable,
      modelUnit: observable,
      _elementHashCode: override,
    });
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      DSL_EXTERNAL_FORMAT_HASH_STRUCTURE.BINDING,
      this.path,
      this.schemaSet.valueForSerialization ?? '',
      this.schemaId ?? '',
      this.contentType,
      this.modelUnit,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
