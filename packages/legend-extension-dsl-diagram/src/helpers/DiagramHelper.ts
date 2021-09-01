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

import type { PureModel } from '@finos/legend-graph';
import type { ClassView } from '../models/metamodels/pure/packageableElements/diagram/ClassView';
import type { Diagram } from '../models/metamodels/pure/packageableElements/diagram/Diagram';
import { Point } from '../models/metamodels/pure/packageableElements/diagram/geometry/Point';

/**
 * Get absolute position of element on the screen by recursively walking up element tree
 */
export const getElementPosition = (element: HTMLElement): Point => {
  let xPosition = 0;
  let yPosition = 0;
  while (element.offsetParent) {
    xPosition += element.offsetLeft - element.scrollLeft + element.clientLeft;
    yPosition += element.offsetTop - element.scrollTop + element.clientTop;
    element = element.offsetParent as HTMLElement;
  }
  return new Point(xPosition, yPosition);
};

export const getClassView = (
  diagram: Diagram,
  sourceViewId: string,
): ClassView | undefined =>
  diagram.classViews.find((classView) => classView.id === sourceViewId);

export const cleanUpDeadReferencesInDiagram = (
  diagram: Diagram,
  graph: PureModel,
): void => {
  // Delete orphan property views
  const propertyViewsToRemove = diagram.propertyViews.filter(
    (p) =>
      !p.property.ownerReference.value.properties
        .map((p) => p.name)
        .includes(p.property.value.name),
  );
  propertyViewsToRemove.forEach((propertyView) =>
    diagram.deletePropertyView(propertyView),
  );

  // Fix orphan class views
  const classViewsToRemove = diagram.classViews.filter(
    (cv) => !graph.getNullableClass(cv.class.value.path),
  );
  classViewsToRemove.forEach((cw) => diagram.deleteClassView(cw));

  // Fix orphan gneralization views
  const generalizationViewsToRemove = diagram.generalizationViews.filter(
    (g) => {
      const srcClass = g.from.classView.value.class.value;
      const targetClass = g.to.classView.value.class.value;
      return (
        !graph.getNullableClass(srcClass.path) ||
        !graph.getNullableClass(targetClass.path) ||
        srcClass.generalizations.filter((c) => c.value.rawType === targetClass)
          .length === 0
      );
    },
  );
  generalizationViewsToRemove.forEach((g) =>
    diagram.deleteGeneralizationView(g),
  );
};
