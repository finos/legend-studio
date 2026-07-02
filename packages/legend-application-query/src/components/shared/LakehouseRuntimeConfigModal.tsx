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

import { useApplicationStore } from '@finos/legend-application';
import {
  CogIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  TimesIcon,
} from '@finos/legend-art';
import type { LakehouseRuntime } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';

/**
 * Modal for editing a {@link LakehouseRuntime}'s environment and warehouse.
 * Reused by both the data-product and ingest query builder setup panels.
 */
export const LakehouseRuntimeConfigModal = observer(
  (props: {
    lakehouseRuntime: LakehouseRuntime | undefined;
    open: boolean;
    onClose: () => void;
    darkMode: boolean;
  }) => {
    const { lakehouseRuntime, open, onClose, darkMode } = props;
    const [env, setEnv] = useState(lakehouseRuntime?.environment ?? '');
    const [warehouse, setWarehouse] = useState(
      lakehouseRuntime?.warehouse ?? '',
    );

    // sync local state when the modal opens or the runtime changes
    useEffect(() => {
      if (open && lakehouseRuntime) {
        setEnv(lakehouseRuntime.environment ?? '');
        setWarehouse(lakehouseRuntime.warehouse ?? '');
      }
    }, [open, lakehouseRuntime]);

    const applicationStore = useApplicationStore();

    const handleApply = (): void => {
      if (lakehouseRuntime) {
        const newEnv = env || undefined;
        const newWarehouse = warehouse || undefined;
        const hasChanged =
          newEnv !== lakehouseRuntime.environment ||
          newWarehouse !== lakehouseRuntime.warehouse;
        lakehouseRuntime.environment = newEnv;
        lakehouseRuntime.warehouse = newWarehouse;
        if (hasChanged) {
          LegendQueryUserDataHelper.persistLakehouseUserInfo(
            applicationStore.userDataService,
            {
              env: newEnv,
              snowflakeWarehouse: newWarehouse,
            },
          );
        }
      }
      onClose();
    };

    if (!lakehouseRuntime) {
      return null;
    }

    return (
      <Dialog onClose={onClose} open={open}>
        <Modal darkMode={darkMode}>
          <ModalHeader>
            <ModalTitle
              icon={<CogIcon />}
              title="Lakehouse Runtime Configuration"
            />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={onClose}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Environment
              </div>
              <input
                className="panel__content__form__section__input input--dark input--small"
                spellCheck={false}
                value={env}
                placeholder="(optional)"
                onChange={(e) => setEnv(e.target.value)}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Warehouse
              </div>
              <input
                className="panel__content__form__section__input input--dark input--small"
                spellCheck={false}
                value={warehouse}
                placeholder="(optional)"
                onChange={(e) => setWarehouse(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Apply"
              onClick={handleApply}
              type="primary"
            />
            <ModalFooterButton
              text="Cancel"
              onClick={onClose}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
