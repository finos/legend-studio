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
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  Modal,
  ModalFooter,
  ModalFooterButton,
  TimesIcon,
} from '@finos/legend-art';
import { createDataCubeEngineFromQueryBuilder } from '../../stores/data-cube/QueryBuilderDataCubeEngineHelper.js';

const QueryBuilderDataCube = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const engine = createDataCubeEngineFromQueryBuilder(queryBuilderState);

    if (!engine) {
      return null;
    }
    return <DataCube engine={engine} />;
  },
);

export const QueryBuilderDataCubeDialog = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const closeModal = () => queryBuilderState.setIsCubeEnabled(false);
    return (
      <Dialog
        open={true}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={false}
          className={clsx('editor-modal query-builder-data-cube__dialog')}
        >
          <div className="query-builder-data-cube__dialog__header">
            <div className="query-builder-data-cube__dialog__header__actions">
              <button
                className="query-builder-data-cube__dialog__header__action"
                tabIndex={-1}
                onClick={closeModal}
                title="Close"
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div className="query-builder-data-cube__dialog__content">
            <QueryBuilderDataCube queryBuilderState={queryBuilderState} />
          </div>
          <ModalFooter>
            <ModalFooterButton onClick={closeModal}>Close</ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
