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

import {
  ClassView,
  Diagram,
  GeneralizationView,
  PropertyView,
} from '@finos/legend-extension-dsl-diagram';
import {
  Class,
  getAllOwnClassProperties,
  getMappingCompatibleClasses,
  PackageableElementExplicitReference,
  PropertyExplicitReference,
  type Mapping,
} from '@finos/legend-graph';
import { uuid } from '@finos/legend-shared';

export const generateMappingDiagram = (
  mapping: Mapping,
  allClasses: Class[],
): Diagram => {
  let diagramName = mapping.name.replace(/mapping/i, 'Diagram');
  if (diagramName === mapping.name) {
    diagramName = `${mapping.name}GeneratedDiagram`;
  }
  const diagram = new Diagram(diagramName);
  const classesInMapping = getMappingCompatibleClasses(mapping, allClasses);
  diagram.classViews = classesInMapping.map(
    (clazz) =>
      new ClassView(
        diagram,
        uuid(),
        PackageableElementExplicitReference.create(clazz),
      ),
  );
  diagram.propertyViews = diagram.classViews.flatMap((classView) => {
    return getAllOwnClassProperties(classView.class.value)
      .filter(
        (property) =>
          property.genericType.value.rawType instanceof Class &&
          classesInMapping.includes(property.genericType.value.rawType),
      )
      .map((property) => {
        const targetClass = property.genericType.value.rawType as Class;
        const targetView = diagram.classViews.find(
          (view) => view.class.value === targetClass,
        );
        if (!targetView) {
          throw new Error(
            `Target class ${targetClass.name} for property ${property.name} not found in diagram`,
          );
        }
        return new PropertyView(
          diagram,
          PropertyExplicitReference.create(property),
          classView,
          targetView,
        );
      });
  });
  diagram.classViews.forEach((classView) => {
    diagram.classViews
      .filter((view) =>
        view.class.value.generalizations
          .map((g) => g.value.rawType)
          .includes(classView.class.value),
      )
      .forEach((childView) => {
        diagram.generalizationViews.push(
          new GeneralizationView(diagram, childView, classView),
        );
      });
  });
  return diagram;
};
