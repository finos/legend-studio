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
  LogEvent,
  UnsupportedOperationError,
  isNonNullable,
  uniq,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../../__lib__/GraphManagerEvent.js';
import {
  type Section,
  ImportAwareCodeSection,
  DefaultCodeSection,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/section/Section.js';
import type { SectionIndex } from '../../../../../../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import { PackageableElementExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import {
  type V1_Section,
  V1_ImportAwareCodeSection,
  V1_DefaultCodeSection,
} from '../../../../model/packageableElements/section/V1_Section.js';

export const V1_buildSection = (
  protocol: V1_Section,
  context: V1_GraphBuilderContext,
  parentSectionIndex: SectionIndex,
): Section => {
  let section: Section;

  if (protocol instanceof V1_ImportAwareCodeSection) {
    const importAwareSection = new ImportAwareCodeSection(
      protocol.parserName,
      parentSectionIndex,
    );
    importAwareSection.imports = uniq(protocol.imports)
      .map((_package) => {
        const pkg = context.graph.getNullablePackage(_package);
        if (!pkg) {
          context.logService.warn(
            LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
            `Can't find section import package '${_package}'`,
          );
          return undefined;
        }
        // NOTE: here we use explicit because this information from section
        // must always be the package full path
        return PackageableElementExplicitReference.create(pkg);
      })
      .filter(isNonNullable);
    section = importAwareSection;
  } else if (protocol instanceof V1_DefaultCodeSection) {
    section = new DefaultCodeSection(protocol.parserName, parentSectionIndex);
  } else {
    throw new UnsupportedOperationError(`Can't build section`, protocol);
  }

  // NOTE: we ignore not-found element path and duplicated import packages, but we will prune them as well
  section.elements = uniq(protocol.elements)
    .map((elementPath) => {
      const element = context.graph.getOwnNullableElement(elementPath);
      if (!element) {
        context.logService.warn(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find section element '${elementPath}'`,
        );
        return element;
      }
      if (context.graph.getOwnNullableSection(element.path)) {
        context.logService.warn(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          `Found duplicated section element '${elementPath}'`,
        );
      } else {
        context.graph.setOwnSection(element.path, section);
      }
      // NOTE: here we use explicit because this information from section
      // must always be the full element path
      return PackageableElementExplicitReference.create(element);
    })
    .filter(isNonNullable);
  return section;
};
