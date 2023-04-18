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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  DefaultCodeSection,
  ImportAwareCodeSection,
} from '../../../../../../../graph/metamodel/pure/packageableElements/section/Section.js';
import type { SectionIndex } from '../../../../../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import {
  V1_DefaultCodeSection,
  V1_ImportAwareCodeSection,
} from '../../../model/packageableElements/section/V1_Section.js';
import { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';

const transformDefaultCodeSectionSchema = (
  element: DefaultCodeSection,
): V1_DefaultCodeSection => {
  const defaultCodeSection = new V1_DefaultCodeSection();
  defaultCodeSection.elements = element.elements.map(
    (el) => el.valueForSerialization ?? '',
  );
  defaultCodeSection.parserName = element.parserName;
  return defaultCodeSection;
};

const transformImportAwareCodeSectionSchema = (
  element: ImportAwareCodeSection,
): V1_ImportAwareCodeSection => {
  const importAware = new V1_ImportAwareCodeSection();
  importAware.imports = element.imports.map(
    (el) => el.valueForSerialization ?? '',
  );
  importAware.elements = element.elements.map(
    (el) => el.valueForSerialization ?? '',
  );
  importAware.parserName = element.parserName;
  return importAware;
};

export const V1_transformSectionIndex = (
  element: SectionIndex,
): V1_SectionIndex => {
  const _sectionIndex = new V1_SectionIndex();
  V1_initPackageableElement(_sectionIndex, element);
  _sectionIndex.package = '__internal__';
  _sectionIndex.sections = element.sections.map((section) => {
    if (section instanceof ImportAwareCodeSection) {
      return transformImportAwareCodeSectionSchema(section);
    } else if (section instanceof DefaultCodeSection) {
      return transformDefaultCodeSectionSchema(section);
    }
    throw new UnsupportedOperationError(
      `Can't transform section index`,
      section,
    );
  });
  return _sectionIndex;
};
