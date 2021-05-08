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
  IllegalStateError,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { computed, observable, makeObservable } from 'mobx';
import { Store } from '../../../../../model/packageableElements/store/Store';
import type { PackageableElementVisitor } from '../../../../../model/packageableElements/PackageableElement';
import type { Schema } from '../../../../../model/packageableElements/store/relational/model/Schema';
import type { Join } from '../../../../../model/packageableElements/store/relational/model/Join';
import type { Filter } from '../../../../../model/packageableElements/store/relational/model/Filter';
import { getAllIncludedDbs } from '../../../../helpers/store/relational/model/DatabaseHelper';

export class Database extends Store implements Hashable {
  schemas: Schema[] = [];
  joins: Join[] = [];
  filters: Filter[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      schemas: observable,
      joins: observable,
      filters: observable,
      hashCode: computed({ keepAlive: true }),
    });
  }

  static createStub = (): Database => new Database('');

  getSchema = (name: string): Schema =>
    guaranteeNonNullable(
      this.schemas.find((schema) => schema.name === name),
      `Can't find schema '${name}' in database '${this.path}'`,
    );
  getJoin = (name: string): Join =>
    guaranteeNonNullable(
      Array.from(getAllIncludedDbs(this))
        .flatMap((db) => db.joins)
        .find((join) => join.name === name),
      `Can't find join '${name}' in database '${this.path}'`,
    );
  getFilter = (name: string): Filter =>
    guaranteeNonNullable(
      this.filters.find((filter) => filter.name === name),
      `Can't find filter '${name}' in database '${this.path}'`,
    );

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE,
      super.hashCode,
      hashArray(this.schemas),
      hashArray(this.joins),
      hashArray(this.filters),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Database(this);
  }
}
