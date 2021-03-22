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

import { observable, computed, action, makeObservable } from 'mobx';
import { hashArray, IllegalStateError } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import type { PackageableElementVisitor } from '@finos/legend-studio';
import { PackageableElement } from '@finos/legend-studio';
import { TEXT_HASH_STRUCTURE } from '../../../../DSLText_ModelUtils';

export enum TEXT_TYPE {
  PLAIN_TEXT = 'plainText',
  MARKDOWN = 'markdown',
}

export class Text extends PackageableElement implements Hashable {
  type: TEXT_TYPE;
  content: string;

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      type: observable,
      content: observable,
      setType: action,
      setContent: action,
      hashCode: computed({ keepAlive: true }),
    });

    this.type = TEXT_TYPE.PLAIN_TEXT;
    this.content = '';
  }

  setType(type: TEXT_TYPE): void {
    this.type = type;
  }
  setContent(content: string): void {
    this.content = content;
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
      TEXT_HASH_STRUCTURE.ELEMENT,
      super.hashCode,
      this.type,
      this.content,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
