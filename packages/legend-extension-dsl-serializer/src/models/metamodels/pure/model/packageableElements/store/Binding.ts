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

import { observable, action, makeObservable, override } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type {
  OptionalPackageableElementReference,
  PackageableElementVisitor,
} from '@finos/legend-graph';
import { Store } from '@finos/legend-graph';
import type { ModelUnit } from './ModelUnit';
import { DSL_SERIALIZER_HASH_STRUCTURE } from '../../../../../DSLSerializer_ModelUtils';
import type { SchemaSet } from '../schemaSet/SchemaSet';

export enum BINDING_CONTENT_TYPE {
  FLAT_DATA = 'application/x.flatdata',
  XSD = 'application/xml',
  JSON = 'application/json',
}

export class Binding extends Store implements Hashable {
  schemaSet?: OptionalPackageableElementReference<SchemaSet>;
  schemaId?: string | undefined;
  contentType!: BINDING_CONTENT_TYPE;
  modelUnit!: ModelUnit;

  constructor(name: string) {
    super(name);

    makeObservable<Binding, '_elementHashCode'>(this, {
      schemaSet: observable,
      schemaId: observable,
      contentType: observable,
      modelUnit: observable,
      setSchemaSet: action,
      setSchemaId: action,
      setContentType: action,
      setModelUnit: action,
      _elementHashCode: override,
    });
  }

  setSchemaSet(value: OptionalPackageableElementReference<SchemaSet>): void {
    this.schemaSet = value;
  }

  setSchemaId(value: string | undefined): void {
    this.schemaId = value;
  }

  setContentType(value: BINDING_CONTENT_TYPE): void {
    this.contentType = value;
  }

  setModelUnit(value: ModelUnit): void {
    this.modelUnit = value;
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      DSL_SERIALIZER_HASH_STRUCTURE.BINDING,
      this.path,
      this.schemaSet?.valueForSerialization ?? '',
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
