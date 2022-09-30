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

import { useState, useRef, useEffect, useCallback } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { type Class, isElementReadOnly } from '@finos/legend-graph';
import { InheritanceDiagramRenderer } from './DSL_Diagram_InheritanceDiagramRenderer.js';
import { DSL_DIAGRAM_TEST_ID } from './DSL_Diagram_TestID.js';

export const ClassDiagramPreview = observer((props: { _class: Class }) => {
  const { _class } = props;
  const applicationStore = useApplicationStore();
  const classHash = isElementReadOnly(_class)
    ? undefined
    : applicationStore.notifyAndReturnAlternativeOnError(
        () => _class.hashCode,
        undefined,
      ); // attempting to read the hashCode of immutable element will throw an error
  const [diagramRenderer, setDiagramRenderer] =
    useState<InheritanceDiagramRenderer>();
  const canvas = useRef<HTMLDivElement>(null);
  const resizeDiagram = useCallback((): void => {
    if (diagramRenderer) {
      diagramRenderer.refresh();
      diagramRenderer.autoRecenter();
    }
  }, [diagramRenderer]);
  const { ref, height, width } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'debounce',
    refreshRate: 50,
  });

  useEffect(() => {
    resizeDiagram();
  }, [resizeDiagram, height, width]);

  useEffect(() => {
    if (canvas.current) {
      let currentRenderer = diagramRenderer;
      if (!currentRenderer) {
        const newRender = new InheritanceDiagramRenderer(
          canvas.current,
          _class,
        );
        setDiagramRenderer(newRender);
        currentRenderer = newRender;
      }
      currentRenderer.render();
      currentRenderer.autoRecenter();
    }
  }, [diagramRenderer, _class]);

  useEffect(() => {
    if (diagramRenderer) {
      diagramRenderer.loadClass(_class);
      diagramRenderer.render();
      diagramRenderer.autoRecenter();
    }
  }, [_class, classHash, diagramRenderer]);

  return (
    <div
      ref={ref}
      className="class-editor__diagram-preview"
      data-testid={DSL_DIAGRAM_TEST_ID.CLASS_DIAGRAM_PREVIEW}
    >
      <div
        ref={canvas}
        className="diagram-canvas"
        tabIndex={0}
        onContextMenu={(event): void => event.preventDefault()}
      />
    </div>
  );
});
