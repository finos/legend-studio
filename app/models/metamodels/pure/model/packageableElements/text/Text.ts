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

import { observable, computed, action } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { IllegalStateError } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';

export enum TEXT_TYPE {
  PLAIN_TEXT = 'plainText',
  MARKDOWN = 'markdown'
}

export class Text extends PackageableElement implements Hashable {
  @observable type: TEXT_TYPE;
  @observable content: string;

  constructor(name: string) {
    super(name);
    this.type = TEXT_TYPE.PLAIN_TEXT;
    this.content = '';
  }

  @action setType(type: TEXT_TYPE): void { this.type = type }
  @action setContent(content: string): void { this.content = content }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.TEXT,
      super.hashCode,
      this.type,
      this.content
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Text(this);
  }
}
