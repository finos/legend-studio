/**
 * Copyright Goldman Sachs
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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  IllegalStateError,
  guaranteeNonNullable,
  hashArray,
  deleteEntry,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';
import type {
  Stereotype,
  StereotypeSelectOption,
} from '../../../model/packageableElements/domain/Stereotype';
import type {
  Tag,
  TagSelectOption,
} from '../../../model/packageableElements/domain/Tag';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';

export class Profile extends PackageableElement implements Hashable, Stubable {
  stereotypes: Stereotype[] = [];
  tags: Tag[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      stereotypes: observable,
      tags: observable,
      addTag: action,
      deleteTag: action,
      addStereotype: action,
      deleteStereotype: action,
      isStub: computed,
      hashCode: computed({ keepAlive: true }),
    });
  }

  get tagOptions(): TagSelectOption[] {
    return this.tags.map((tag) => ({ label: tag.value, value: tag }));
  }
  get stereotypeOptions(): StereotypeSelectOption[] {
    return this.stereotypes.map((stereotype) => ({
      label: stereotype.value,
      value: stereotype,
    }));
  }

  addTag(value: Tag): void {
    addUniqueEntry(this.tags, value);
  }
  deleteTag(value: Tag): void {
    deleteEntry(this.tags, value);
  }
  addStereotype(value: Stereotype): void {
    addUniqueEntry(this.stereotypes, value);
  }
  deleteStereotype(value: Stereotype): void {
    deleteEntry(this.stereotypes, value);
  }

  getTag = (value: string): Tag =>
    guaranteeNonNullable(
      this.tags.find((tag) => tag.value === value),
      `Can't find tag '${value}' in profile '${this.path}'`,
    );

  getStereotype = (value: string): Stereotype =>
    guaranteeNonNullable(
      this.stereotypes.find((stereotype) => stereotype.value === value),
      `Can't find stereotype '${value}' in profile '${this.path}'`,
    );

  static createStub = (): Profile => new Profile('');
  get isStub(): boolean {
    return (
      super.isStub && isStubArray(this.stereotypes) && isStubArray(this.tags)
    );
  }

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
      CORE_HASH_STRUCTURE.PROFILE,
      super.hashCode,
      hashArray(this.stereotypes.map((st) => st.value)),
      hashArray(this.tags.map((st) => st.value)),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Profile(this);
  }
}
