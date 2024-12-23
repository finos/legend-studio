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

import { DataCube } from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  Modal,
  ModalFooter,
  ModalFooterButton,
  TimesIcon,
} from '@finos/legend-art';
import type { QueryBuilderDataCubeViewerState } from '../../stores/data-cube/QueryBuilderDataCubeViewerState.js';

export const QueryDataCubeViewer = observer(
  (props: {
    state: QueryBuilderDataCubeViewerState;
    close: () => void;
    options?: {
      fullScreen: boolean;
    };
  }) => {
    const { state, close, options } = props;
    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: clsx('editor-modal__content', {
            'query-builder-data-cube__dialog__container__content':
              options?.fullScreen,
          }),
        }}
      >
        <Modal
          darkMode={false}
          className={clsx('editor-modal query-builder-data-cube__dialog', {
            'query-builder-data-cube__dialog--expanded': options?.fullScreen,
          })}
        >
          <div className="query-builder-data-cube__dialog__header">
            <div className="query-builder-data-cube__dialog__header__actions">
              <button
                className="query-builder-data-cube__dialog__header__action"
                tabIndex={-1}
                onClick={close}
                title="Close"
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div
            className={clsx('query-builder-data-cube__dialog__content', {
              'query-builder-data-cube__dialog__content-full':
                options?.fullScreen,
            })}
          >
            <DataCube query={state.query} engine={state.engine} />
          </div>
          {!options?.fullScreen && (
            <ModalFooter>
              <ModalFooterButton onClick={close}>Close</ModalFooterButton>
            </ModalFooter>
          )}
        </Modal>
      </Dialog>
    );
  },
);
