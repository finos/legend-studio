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

import { serializable, custom, list, SKIP, deserialize } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Section, SectionType, ImportAwareCodeSection, DefaultCodeSection } from './Section';

const deserializeSection = (value: Section): Section | typeof SKIP => {
  switch (value._type) {
    case SectionType.IMPORT_AWARE: return deserialize(ImportAwareCodeSection, value);
    case SectionType.DEFAULT: return deserialize(DefaultCodeSection, value);
    default: return SKIP;
  }
};

export class SectionIndex extends PackageableElement implements Hashable {
  @serializable(list(custom(() => SKIP, deserializeSection))) sections: Section[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.SECTION_INDEX,
      super.hashCode,
      hashArray(this.sections)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_SectionIndex(this);
  }
}
