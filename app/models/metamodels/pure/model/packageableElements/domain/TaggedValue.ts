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
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { uuid } from 'Utilities/GeneralUtil';
import { Tag } from './Tag';
import { Stubable } from 'MM/Stubable';
import { TagReference, TagExplicitReference } from './TagReference';

export class TaggedValue implements Hashable, Stubable {
  uuid = uuid();
  tag: TagReference;
  @observable value: string;

  constructor(tag: TagReference, value: string) {
    this.tag = tag;
    this.value = value;
  }

  @action setTag(tag: Tag): void { this.tag.setValue(tag) }
  @action setValue(value: string): void { this.value = value }

  static createStub = (tag: Tag): TaggedValue => new TaggedValue(TagExplicitReference.create(tag), '');
  @computed get isStub(): boolean { return !this.value && this.tag.isStub }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.TAGGED_VALUE,
      this.tag.pointerHashCode,
      this.value,
    ]);
  }
}
