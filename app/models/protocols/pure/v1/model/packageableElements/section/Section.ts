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

import { serializable, list, primitive } from 'serializr';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';

export enum SectionType {
  IMPORT_AWARE = 'importAware',
  DEFAULT = 'default'
}

export abstract class Section {
  @serializable _type!: SectionType;
  @serializable parserName!: string[1];
  @serializable(list(primitive())) elements: string[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.SECTION,
      this.parserName,
      hashArray(this.elements)
    ]);
  }
}

export class ImportAwareCodeSection extends Section {
  @serializable(list(primitive())) imports: string[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.IMPORT_AWARE_CODE_SECTION,
      super.hashCode,
      hashArray(this.imports)
    ]);
  }
}

export class DefaultCodeSection extends Section {
  @serializable _type!: SectionType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.DEFAULT_CODE_SECTION,
      super.hashCode
    ]);
  }
}
