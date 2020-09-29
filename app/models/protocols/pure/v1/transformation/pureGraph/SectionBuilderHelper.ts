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

import { UnsupportedOperationError, isNonNullable, uniq } from 'Utilities/GeneralUtil';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { Section as MM_Section, ImportAwareCodeSection as MM_ImportAwareCodeSection, DefaultCodeSection as MM_DefaultCodeSection } from 'MM/model/packageableElements/section/Section';
import { SectionIndex as MM_SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';
import { Package as MM_Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElementExplicitReference as MM_PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { Section, ImportAwareCodeSection, DefaultCodeSection } from 'V1/model/packageableElements/section/Section';

export const processSection = (section: Section, context: GraphBuilderContext, parentSectionIndex: MM_SectionIndex): MM_Section => {
  let sec: MM_Section;
  if (section instanceof ImportAwareCodeSection) {
    const importAwareSection = new MM_ImportAwareCodeSection(section.parserName, parentSectionIndex);
    importAwareSection.imports = uniq(section.imports).map(_package => {
      const element = context.graph.getNullableElement(_package, true);
      if (!(element instanceof MM_Package)) {
        Log.warn(LOG_EVENT.GRAPH_PROBLEM, `Can't find section import package '${_package}'`);
      }
      return element instanceof MM_Package ? MM_PackageableElementExplicitReference.create(element) : undefined;
    }).filter(isNonNullable);
    sec = importAwareSection;
  } else if (section instanceof DefaultCodeSection) {
    sec = new MM_DefaultCodeSection(section.parserName, parentSectionIndex);
  } else {
    throw new UnsupportedOperationError(`Unsupported section type '${section.constructor.name}'`);
  }
  // NOTE: we ignore not-found element path and duplicated import packages, but we will prune them as well
  sec.elements = uniq(section.elements).map(elementPath => {
    const element = context.graph.getNullableElement(elementPath);
    if (!element) {
      Log.warn(LOG_EVENT.GRAPH_PROBLEM, `Can't find section element '${elementPath}'`);
      return element;
    }
    if (context.graph.getSection(element.path)) {
      Log.warn(LOG_EVENT.GRAPH_PROBLEM, `Found duplicated section element '${elementPath}'`);
    } else {
      context.graph.setSection(element.path, sec);
    }
    return MM_PackageableElementExplicitReference.create(element);
  }).filter(isNonNullable);
  return sec;
};
