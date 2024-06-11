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

import { observer } from 'mobx-react-lite';
import { useREPLStore } from '../REPLStoreProvider.js';
import { useEffect, useRef } from 'react';
import { DataCubeGrid } from './grid/DataCubeGrid.js';
import { PivotPanelEditor } from './editor/DataCubeEditor.js';
import { useApplicationStore } from '@finos/legend-application';

export const DataCube = observer(() => {
  const dataCubeStore = useREPLStore();
  const applicationStore = useApplicationStore();
  const dataCubeState = dataCubeStore.dataCubeState;
  const pivotPanelButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dataCubeState.initialize().catch(applicationStore.alertUnhandledError);
  }, [dataCubeState, applicationStore]);

  return (
    <div className="repl">
      <div className="repl__header">
        <div className="repl__header__content">
          <div className="repl__header__content__title">Legend DataCube</div>
          <div className="repl__header__actions"></div>
        </div>
      </div>
      <div className="repl__content">
        <DataCubeGrid editorStore={dataCubeStore} />
      </div>
      <div className="repl__footer">
        <div
          className="repl__footer__pivot"
          ref={pivotPanelButtonRef}
          onClick={(): void => dataCubeState.editor.openPanel()}
        >
          Pivot
        </div>
        <div className="repl__footer__filter">Filter</div>
        {dataCubeState.editor.isPanelOpen && (
          <PivotPanelEditor
            editorStore={dataCubeStore}
            triggerElement={pivotPanelButtonRef.current}
          />
        )}
      </div>
    </div>
  );
});
