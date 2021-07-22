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

import {
  UnsupportedOperationError,
  isNonNullable,
  uniq,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../../../../../../utils/Logger';
import type { Section } from '../../../../../../../metamodels/pure/model/packageableElements/section/Section';
import {
  ImportAwareCodeSection,
  DefaultCodeSection,
} from '../../../../../../../metamodels/pure/model/packageableElements/section/Section';
import type { SectionIndex } from '../../../../../../../metamodels/pure/model/packageableElements/section/SectionIndex';
import { Package } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Package';
import { PackageableElementExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_Section } from '../../../../model/packageableElements/section/V1_Section';
import {
  V1_ImportAwareCodeSection,
  V1_DefaultCodeSection,
} from '../../../../model/packageableElements/section/V1_Section';

export const V1_buildSection = (
  section: V1_Section,
  context: V1_GraphBuilderContext,
  parentSectionIndex: SectionIndex,
): Section => {
  let sec: Section;
  if (section instanceof V1_ImportAwareCodeSection) {
    const importAwareSection = new ImportAwareCodeSection(
      section.parserName,
      parentSectionIndex,
    );
    importAwareSection.imports = uniq(section.imports)
      .map((_package) => {
        const element = context.graph.getNullableElement(_package, true);
        if (!(element instanceof Package)) {
          context.logger.warn(
            CORE_LOG_EVENT.GRAPH_PROBLEM,
            `Can't find section import package '${_package}'`,
          );
        }
        return element instanceof Package
          ? PackageableElementExplicitReference.create(element)
          : undefined;
      })
      .filter(isNonNullable);
    sec = importAwareSection;
  } else if (section instanceof V1_DefaultCodeSection) {
    sec = new DefaultCodeSection(section.parserName, parentSectionIndex);
  } else {
    throw new UnsupportedOperationError(`Can't build section`, section);
  }
  // NOTE: we ignore not-found element path and duplicated import packages, but we will prune them as well
  sec.elements = uniq(section.elements)
    .map((elementPath) => {
      const element = context.graph.getNullableElement(elementPath);
      if (!element) {
        context.logger.warn(
          CORE_LOG_EVENT.GRAPH_PROBLEM,
          `Can't find section element '${elementPath}'`,
        );
        return element;
      }
      if (context.graph.getOwnSection(element.path)) {
        context.logger.warn(
          CORE_LOG_EVENT.GRAPH_PROBLEM,
          `Found duplicated section element '${elementPath}'`,
        );
      } else {
        context.graph.setOwnSection(element.path, sec);
      }
      return PackageableElementExplicitReference.create(element);
    })
    .filter(isNonNullable);
  return sec;
};
