/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { IllegalStateError, guaranteeNonNullable, deleteEntry, addUniqueEntry } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Stereotype, StereotypeSelectOption } from 'MM/model/packageableElements/domain/Stereotype';
import { Tag, TagSelectOption } from 'MM/model/packageableElements/domain/Tag';
import { Stubable, isStubArray } from 'MM/Stubable';

export class Profile extends PackageableElement implements Hashable, Stubable {
  @observable stereotypes: Stereotype[] = [];
  @observable tags: Tag[] = [];

  get tagOptions(): TagSelectOption[] { return this.tags.map(tag => ({ label: tag.value, value: tag })) }
  get stereotypeOptions(): StereotypeSelectOption[] { return this.stereotypes.map(stereotype => ({ label: stereotype.value, value: stereotype })) }

  @action addTag(value: Tag): void { addUniqueEntry(this.tags, value) }
  @action deleteTag(value: Tag): void { deleteEntry(this.tags, value) }
  @action addStereotype(value: Stereotype): void { addUniqueEntry(this.stereotypes, value) }
  @action deleteStereotype(value: Stereotype): void { deleteEntry(this.stereotypes, value) }

  getTag = (value: string): Tag => guaranteeNonNullable(this.tags.find(tag => tag.value === value),
    `Can't find tag '${value}' in profile '${this.path}'`);

  getStereotype = (value: string): Stereotype => guaranteeNonNullable(this.stereotypes.find(stereotype => stereotype.value === value),
    `Can't find stereotype '${value}' in profile '${this.path}'`);

  static createStub = (): Profile => new Profile('');
  @computed get isStub(): boolean { return super.isStub && isStubArray(this.stereotypes) && isStubArray(this.tags) }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.PROFILE,
      super.hashCode,
      hashArray(this.stereotypes.map(st => st.value)),
      hashArray(this.tags.map(st => st.value))
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Profile(this);
  }
}
