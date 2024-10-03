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

import { DataCube, DataCubeProvider } from '@finos/legend-data-cube';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { observer } from 'mobx-react-lite';
import { QueryBuilderDataCubeApplicationEngine } from '../../stores/data-cube/QueryBuilderDataCubeApplicationEngine.js';
import {
  clsx,
  Dialog,
  EmptyWindowRestoreIcon,
  Modal,
  TimesIcon,
  WindowMaximizeIcon,
} from '@finos/legend-art';
import { useState } from 'react';
import { RuntimePointer } from '@finos/legend-graph';
import { QueryBuilderDataCubeEngine } from '../../stores/data-cube/QueryBuilderDataCubeEngine.js';

const QueryBuilderDataCube = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = new QueryBuilderDataCubeApplicationEngine(
      queryBuilderState.applicationStore,
    );
    const runtime =
      queryBuilderState.executionContextState.runtimeValue instanceof
      RuntimePointer
        ? queryBuilderState.executionContextState.runtimeValue
            .packageableRuntime.value.path
        : undefined;
    if (!runtime) {
      // TODO: add better message
      return null;
    }
    const queryBuilderEngine = new QueryBuilderDataCubeEngine(
      queryBuilderState.buildQuery(),
      queryBuilderState.executionContextState.mapping?.path,
      runtime,
      queryBuilderState.graphManagerState,
    );

    return (
      <DataCubeProvider
        application={applicationStore}
        engine={queryBuilderEngine}
      >
        <DataCube />
      </DataCubeProvider>
    );
  },
);

export const QueryBuilderDataCubeDialog = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const [isMaximized, setIsMaximized] = useState(false);
    const toggleMaximize = (): void => setIsMaximized(!isMaximized);
    const closeModal = () => queryBuilderState.setIsCubeEnabled(false);
    return (
      <Dialog
        open={true}
        onClose={closeModal}
        classes={{ container: 'dataspace-info-modal__container' }}
      >
        <Modal
          darkMode={false}
          className={clsx('editor-modal query-builder__dialog', {
            'query-builder__dialog--expanded': isMaximized,
          })}
        >
          <div className="query-builder__dialog__header">
            <div className="query-builder__dialog__header__actions">
              <button
                className="query-builder__dialog__header__action"
                tabIndex={-1}
                onClick={toggleMaximize}
                title={isMaximized ? 'Minimize' : 'Maximize'}
              >
                {isMaximized ? (
                  <EmptyWindowRestoreIcon />
                ) : (
                  <WindowMaximizeIcon />
                )}
              </button>
              <button
                className="query-builder__dialog__header__action"
                tabIndex={-1}
                onClick={closeModal}
                title="Close"
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div className="query-builder__dialog__content">
            <QueryBuilderDataCube queryBuilderState={queryBuilderState} />
          </div>
        </Modal>
      </Dialog>
    );
  },
);
