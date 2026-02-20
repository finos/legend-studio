/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { CommandRegistrar } from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_ModelDocumentationEntry,
  V1_ClassDocumentationEntry,
  V1_EnumerationDocumentationEntry,
  V1_AssociationDocumentationEntry,
} from '@finos/legend-graph';
import {
  AssociationDocumentationEntry,
  BasicDocumentationEntry,
  ClassDocumentationEntry,
  EnumerationDocumentationEntry,
  PropertyDocumentationEntry,
  NormalizedDocumentationEntry,
  ViewerModelsDocumentationState,
} from '@finos/legend-lego/model-documentation';

export class DataProductDocumentationState
  extends ViewerModelsDocumentationState
  implements CommandRegistrar
{
  constructor(
    elementDocs: V1_ModelDocumentationEntry[],
    graphManagerState: GraphManagerState,
  ) {
    super(
      DataProductDocumentationState.fromElementDocs(
        elementDocs,
        graphManagerState,
      ),
    );
  }

  private static fromElementDocs(
    elementDocs: V1_ModelDocumentationEntry[],
    graphManagerState: GraphManagerState,
  ): NormalizedDocumentationEntry[] {
    if (!elementDocs.length) {
      return [];
    }

    const graph = graphManagerState.graph;
    const entries: NormalizedDocumentationEntry[] = [];

    elementDocs.forEach((docEntry) => {
      if (docEntry instanceof V1_ClassDocumentationEntry) {
        const classData = new ClassDocumentationEntry();
        classData.name = docEntry.name;
        classData.docs = docEntry.docs;
        classData.path = docEntry.path;
        classData.milestoning = docEntry.milestoning;
        entries.push(
          new NormalizedDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            classData,
            classData,
          ),
        );

        docEntry.properties.forEach((property) => {
          const propertyData = new PropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = property.docs;
          propertyData.type = property.type;
          propertyData.milestoning = property.milestoning;
          propertyData.multiplicity = graph.getMultiplicity(
            property.multiplicity.lowerBound,
            property.multiplicity.upperBound,
          );
          classData.properties.push(propertyData);
          entries.push(
            new NormalizedDocumentationEntry(
              property.name,
              property.docs.join('\n').trim(),
              classData,
              propertyData,
            ),
          );
        });
      } else if (docEntry instanceof V1_EnumerationDocumentationEntry) {
        const enumerationData = new EnumerationDocumentationEntry();
        enumerationData.name = docEntry.name;
        enumerationData.docs = docEntry.docs;
        enumerationData.path = docEntry.path;
        entries.push(
          new NormalizedDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            enumerationData,
            enumerationData,
          ),
        );
        docEntry.enumValues.forEach((enumValue) => {
          const enumData = new BasicDocumentationEntry();
          enumData.name = enumValue.name;
          enumData.docs = enumValue.docs;
          enumerationData.enumValues.push(enumData);
          entries.push(
            new NormalizedDocumentationEntry(
              enumValue.name,
              enumValue.docs.join('\n').trim(),
              enumerationData,
              enumData,
            ),
          );
        });
      } else if (docEntry instanceof V1_AssociationDocumentationEntry) {
        const associationData = new AssociationDocumentationEntry();
        associationData.name = docEntry.name;
        associationData.docs = docEntry.docs;
        associationData.path = docEntry.path;
        entries.push(
          new NormalizedDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            associationData,
            associationData,
          ),
        );
        docEntry.properties.forEach((property) => {
          const propertyData = new PropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = property.docs;
          propertyData.type = property.type;
          propertyData.milestoning = property.milestoning;
          propertyData.multiplicity = graph.getMultiplicity(
            property.multiplicity.lowerBound,
            property.multiplicity.upperBound,
          );
          associationData.properties.push(propertyData);
          entries.push(
            new NormalizedDocumentationEntry(
              property.name,
              property.docs.join('\n'),
              associationData,
              propertyData,
            ),
          );
        });
      }
    });

    return entries;
  }

  override registerCommands(): void {
    //To be implemented
  }

  override deregisterCommands(): void {
    //To be implemented
  }
}
