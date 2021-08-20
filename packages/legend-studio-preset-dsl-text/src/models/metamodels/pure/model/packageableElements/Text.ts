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
import { TEXT_HASH_STRUCTURE } from '../../../../DSLText_ModelUtils';
import type { PackageableElementVisitor } from '@finos/legend-graph';
import { PackageableElement } from '@finos/legend-graph';

export enum TEXT_TYPE {
  PLAIN_TEXT = 'plainText',
  MARKDOWN = 'markdown',
}

export class Text extends PackageableElement implements Hashable {
  type: TEXT_TYPE;
  content: string;

  constructor(name: string) {
    super(name);

    makeObservable<Text, '_elementHashCode'>(this, {
      type: observable,
      content: observable,
      setType: action,
      setContent: action,
      _elementHashCode: override,
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

  protected override get _elementHashCode(): string {
    return hashArray([
      TEXT_HASH_STRUCTURE.ELEMENT,
      this.path,
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
