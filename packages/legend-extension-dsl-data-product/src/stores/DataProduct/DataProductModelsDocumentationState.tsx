/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { type DataProductViewerState } from './DataProductViewerState.js';
import type { CommandRegistrar } from '@finos/legend-application';
import {
  AssociationDocumentationEntry,
  BasicDocumentationEntry,
  ClassDocumentationEntry,
  EnumerationDocumentationEntry,
  PropertyDocumentationEntry,
  NormalizedDocumentationEntry,
  ViewerModelsDocumentationState,
} from '@finos/legend-lego/model-documentation';
import {
  Association,
  Class,
  Enumeration,
  ModelAccessPointGroup,
} from '@finos/legend-graph';
import { assertErrorThrown } from '@finos/legend-shared';

export class DataProductViewerModelsDocumentationState
  extends ViewerModelsDocumentationState
  implements CommandRegistrar
{
  readonly dataProductViewerState: DataProductViewerState;

  constructor(dataProductViewerState: DataProductViewerState) {
    super(
      DataProductViewerModelsDocumentationState.formElementDocs(
        dataProductViewerState,
      ),
    );
    this.dataProductViewerState = dataProductViewerState;
  }

  override registerCommands(): void {
    //To be implemented
  }

  override deregisterCommands(): void {
    //To be implemented
  }

  private static formElementDocs(
    dataProductViewerState: DataProductViewerState,
  ): NormalizedDocumentationEntry[] {
    const entries: NormalizedDocumentationEntry[] = [];
    try {
      const dataProduct =
        dataProductViewerState.graphManagerState.graph.getDataProduct(
          dataProductViewerState.product.path,
        );
      const allFeaturedElementsScopes = dataProduct.accessPointGroups
        .filter((apg) => apg instanceof ModelAccessPointGroup)
        .flatMap((apg) => apg.featuredElements);
      const allFeaturedElements = allFeaturedElementsScopes.map((scope) => {
        return scope.element.value;
      });
      const featuredClasses = allFeaturedElements.filter(
        (element) => element instanceof Class,
      );
      const featuredEnums = allFeaturedElements.filter(
        (element) => element instanceof Enumeration,
      );
      const featuredAssociations = allFeaturedElements.filter(
        (element) => element instanceof Association,
      );
      // Process Classes
      featuredClasses.forEach((classElement, idx) => {
        const classData = new ClassDocumentationEntry();
        classData.name = classElement.name;
        classData.path = classElement.path;
        classData.docs = [];
        entries.push(
          new NormalizedDocumentationEntry(
            classElement.name,
            '',
            classData,
            classData,
          ),
        );
        classElement.properties.forEach((property) => {
          const propertyData = new PropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = [];
          propertyData.type = property.genericType.value.rawType.name;
          propertyData.multiplicity = property.multiplicity;
          classData.properties.push(propertyData);
          entries.push(
            new NormalizedDocumentationEntry(
              property.name,
              '',
              classData,
              propertyData,
            ),
          );
        });
      });
      // Process Enumerations
      featuredEnums.forEach((enumElement, idx) => {
        const enumerationData = new EnumerationDocumentationEntry();
        enumerationData.name = enumElement.name;
        enumerationData.path = enumElement.path;
        enumerationData.docs = [];
        entries.push(
          new NormalizedDocumentationEntry(
            enumElement.name,
            '',
            enumerationData,
            enumerationData,
          ),
        );
        enumElement.values.forEach((enumValue) => {
          const enumData = new BasicDocumentationEntry();
          enumData.name = enumValue.name;
          enumData.docs = [];
          enumerationData.enumValues.push(enumData);
          entries.push(
            new NormalizedDocumentationEntry(
              enumValue.name,
              '',
              enumerationData,
              enumData,
            ),
          );
        });
      });
      // Process Associations
      featuredAssociations.forEach((associationElement, idx) => {
        const associationData = new AssociationDocumentationEntry();
        associationData.name = associationElement.name;
        associationData.path = associationElement.path;
        associationData.docs = [];
        entries.push(
          new NormalizedDocumentationEntry(
            associationElement.name,
            '',
            associationData,
            associationData,
          ),
        );
        associationElement.properties.forEach((property) => {
          const propertyData = new PropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = [];
          propertyData.type = property.genericType.value.rawType.name;
          propertyData.multiplicity = property.multiplicity;
          associationData.properties.push(propertyData);
          entries.push(
            new NormalizedDocumentationEntry(
              property.name,
              '',
              associationData,
              propertyData,
            ),
          );
        });
      });
      return entries;
    } catch (error) {
      assertErrorThrown(error);
      dataProductViewerState.applicationStore.notificationService.notifyError(
        error,
      );
      return entries;
    }
  }
}
