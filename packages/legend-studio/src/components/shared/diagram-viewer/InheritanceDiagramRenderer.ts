/**
 * Copyright Goldman Sachs
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

import { DiagramRenderer } from '../../shared/diagram-viewer/DiagramRenderer';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Diagram } from '../../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { ClassView } from '../../../models/metamodels/pure/model/packageableElements/diagram/ClassView';
import { GeneralizationView } from '../../../models/metamodels/pure/model/packageableElements/diagram/GeneralizationView';
import { Point } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import { PackageableElementExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';

export class InheritanceDiagramRenderer extends DiagramRenderer {
  constructor(div: HTMLDivElement, _class: Class) {
    super(div, new Diagram(''));
    this.loadClass(_class);
  }

  loadClass(_class: Class): void {
    this.diagram = this.compute(
      this.buildLevels([
        new ClassView(
          this.diagram,
          '',
          PackageableElementExplicitReference.create(_class),
        ),
      ]),
    );
  }

  // TODO?: build sub types as well
  buildLevels(classViews: ClassView[]): ClassView[][] {
    if (classViews.length) {
      classViews.forEach((classView) =>
        this.computeClassViewMinDimensions(classView),
      );
      const res = classViews.flatMap((classView) =>
        classView.class.value.generalizations.map(
          (generation) =>
            new ClassView(
              this.diagram,
              '',
              PackageableElementExplicitReference.create(
                generation.value.getRawType(Class),
              ),
            ),
        ),
      );
      const rec = this.buildLevels(res);
      rec.push(classViews);
      return rec;
    }
    return [];
  }

  compute(classViewLevels: ClassView[][]): Diagram {
    const newDiagram = new Diagram('');
    const classViews = classViewLevels.flatMap((level, i) => {
      const spaceY = 30;
      const y = i === 0 ? 0 : classViewLevels[i - 1][0].position.y;
      const maxHeight =
        i === 0
          ? 0
          : Math.max(
              ...classViewLevels[i - 1].map(
                (classView) => classView.rectangle.height,
              ),
            );
      const totalWidth = level
        .map((classView) => classView.rectangle.width)
        .reduce((a, b) => a + b);
      level[0].setPosition(new Point(-totalWidth / 2, level[0].position.y));
      return level.flatMap((view, index) => {
        if (index) {
          const precedent = level[index - 1];
          view.setPosition(
            new Point(
              precedent.position.x + precedent.rectangle.width,
              view.position.y,
            ),
          );
        }
        view.setPosition(new Point(view.position.x, y + maxHeight + spaceY));
        return view;
      });
    });

    const generalizationViews = classViewLevels.flatMap((level, i) => {
      if (i > 0) {
        return level.flatMap((fromClassView) =>
          classViewLevels[i - 1].flatMap((toClassView) => {
            if (
              fromClassView.class.value.generalizations
                .map((g) => g.value.rawType)
                .includes(toClassView.class.value)
            ) {
              return new GeneralizationView(
                newDiagram,
                fromClassView,
                toClassView,
              );
            }
            return [];
          }),
        );
      }
      return [];
    });
    newDiagram.classViews = classViews;
    newDiagram.generalizationViews = generalizationViews;
    return newDiagram;
  }
}
