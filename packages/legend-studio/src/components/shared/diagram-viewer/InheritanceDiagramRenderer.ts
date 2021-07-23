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

import { DiagramRenderer } from '../../shared/diagram-viewer/DiagramRenderer';
import type { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Diagram } from '../../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { ClassView } from '../../../models/metamodels/pure/model/packageableElements/diagram/ClassView';
import { PackageableElementExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { uuid } from '@finos/legend-studio-shared';

export class InheritanceDiagramRenderer extends DiagramRenderer {
  constructor(div: HTMLDivElement, _class: Class) {
    super(div, new Diagram(''));
    this.loadClass(_class);
  }

  loadClass(_class: Class): void {
    const result = this.layoutTaxonomy(
      this.getSuperTypeLevels(
        [
          new ClassView(
            this.diagram,
            uuid(),
            PackageableElementExplicitReference.create(_class),
          ),
        ],
        this.diagram,
        0,
        -1,
      ),
      this.diagram,
      true,
      true,
    );
    this.diagram.classViews = result[0];
    this.diagram.generalizationViews = result[1];
  }
}
