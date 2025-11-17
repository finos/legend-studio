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

import { uuid } from '@finos/legend-shared';

export const EMPTY_DIAGRAM_SNIPPET = `Diagram \${1:model::NewDiagram}
{
  \${2:// diagram content: it is highly recommended to create diagrams using\n  // diagram editor as it gives better visual guidance and less error-prone}
}`;

export const getDiagramSnippetWithOneClassView =
  (): string => `Diagram \${1:model::NewDiagram}
{
  classView ${uuid()}
  {
    class: \${2:model::SomeClass};
    position: (0.0,0.0);
    rectangle: (10.0, 10.0);
  }
}`;

export const getDiagramSnippetWithPropertyView = (): string => {
  const classId1 = uuid();
  const classId2 = uuid();

  return `Diagram \${1:model::NewDiagram}
{
  classView ${classId1}
  {
    class: \${2:model::Class1};
    position: (0.0,0.0);
    rectangle: (10.0, 10.0);
  }
  classView ${classId2}
  {
    class: \${3:model::Class2};
    position: (0.0,0.0);
    rectangle: (10.0, 10.0);
  }
  propertyView
  {
    property: \${4:model::Class1.prop1};
    source: ${classId1};
    target: ${classId2};
    points: [];
  }
}`;
};

export const getDiagramSnippetWithGeneralizationView = (): string => {
  const classId1 = uuid();
  const classId2 = uuid();

  return `Diagram \${1:model::NewDiagram}
{
  classView ${classId1}
  {
    class: \${2:model::Class1};
    position: (0.0,0.0);
    rectangle: (10.0, 10.0);
  }
  classView ${classId2}
  {
    class: \${3:model::Class2};
    position: (0.0,0.0);
    rectangle: (10.0, 10.0);
  }
  generalizationView
  {
    source: ${classId1};
    target: ${classId2};
    points: [];
  }
}`;
};
