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
import { hashArray, addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type { PackageableElementVisitor } from '@finos/legend-graph';
import { PackageableElement } from '@finos/legend-graph';
import { DSL_SERIALIZER_HASH_STRUCTURE } from '../../../../../DSLSerializer_ModelUtils';
import type { Schema } from './Schema';

export enum FORMAT_TYPE {
  FLAT_DATA = 'FlatData',
  XSD = 'XSD',
  JSON = 'JSON',
}

export class SchemaSet extends PackageableElement implements Hashable {
  format!: FORMAT_TYPE;
  schemas: Schema[] = [];

  constructor(name: string) {
    super(name);

    makeObservable<SchemaSet, '_elementHashCode'>(this, {
      format: observable,
      schemas: observable,
      setFormat: action,
      addSchema: action,
      deleteSchema: action,
      _elementHashCode: override,
    });
  }

  setFormat(value: FORMAT_TYPE): void {
    this.format = value;
  }

  addSchema(value: Schema): void {
    addUniqueEntry(this.schemas, value);
  }

  deleteSchema(value: Schema): void {
    deleteEntry(this.schemas, value);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      DSL_SERIALIZER_HASH_STRUCTURE.SCHEMA_SET,
      this.path,
      this.format,
      hashArray(this.schemas),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
