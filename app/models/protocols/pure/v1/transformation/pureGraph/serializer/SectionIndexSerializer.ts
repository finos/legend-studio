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

import { primitive, createSimpleSchema, list, serialize, custom } from 'serializr';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Section as MM_Section, ImportAwareCodeSection as MM_ImportAwareCodeSection, DefaultCodeSection as MM_DefaultCodeSection } from 'MM/model/packageableElements/section/Section';
import { SKIP_FN, constant, elementReferenceSerializer } from './CoreSerializerHelper';
import { SectionType } from 'V1/model/packageableElements/section/Section';
import { PackageableElementType } from 'V1/model/packageableElements/PackageableElement';

const importAwareCodeSectionSchema = createSimpleSchema({
  _type: constant(SectionType.IMPORT_AWARE),
  imports: list(elementReferenceSerializer),
  elements: list(elementReferenceSerializer),
  parserName: primitive(),
});

const defaultCodeSectionSchema = createSimpleSchema({
  _type: constant(SectionType.DEFAULT),
  elements: list(elementReferenceSerializer),
  parserName: primitive(),
});

export const sectionIndexSchema = createSimpleSchema({
  _type: constant(PackageableElementType.SECTION_INDEX),
  name: primitive(),
  // package: packagePathSerializer,
  // WIP: fix this when we fully support section index
  package: constant('__internal__'),
  sections: custom((values: MM_Section[]) => values.map((section: MM_Section) => {
    if (section instanceof MM_ImportAwareCodeSection) {
      return serialize(importAwareCodeSectionSchema, section);
    } else if (section instanceof MM_DefaultCodeSection) {
      return serialize(defaultCodeSectionSchema, section);
    }
    throw new UnsupportedOperationError(`Can't serialize unsupported section type '${section.constructor.name}'`);
  }), SKIP_FN)
});
