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
  ModelAccessPointDataProductExecutionState,
  DataProductQueryBuilderSetupFormContent,
} from '@finos/legend-query-builder';
import {
  AnchorLinkIcon,
  CogIcon,
  ControlledDropdownMenu,
  Dialog,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  MoreVerticalIcon,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  TimesIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LakehouseRuntime } from '@finos/legend-graph';
import { useEffect, useState } from 'react';
import type { LegendQueryDataProductQueryBuilderState } from '../../stores/data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';
import { formatDataProductOptionLabel } from '../shared/LegendQueryDataProductOptionLabel.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';

/**
 * Modal for editing LakehouseRuntime configuration (environment and warehouse).
 */
const LakehouseRuntimeConfigModal = observer(
  (props: {
    executionState: ModelAccessPointDataProductExecutionState;
    open: boolean;
    onClose: () => void;
    darkMode: boolean;
  }) => {
    const { executionState, open, onClose, darkMode } = props;
    const lakehouseRuntime =
      executionState.selectedRuntime?.runtimeValue instanceof LakehouseRuntime
        ? executionState.selectedRuntime.runtimeValue
        : undefined;
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

const LegendDataProductQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: LegendQueryDataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const executionState = queryBuilderState.executionState;

    // lakehouse runtime config modal
    const showLakehouseConfigButton =
      executionState instanceof ModelAccessPointDataProductExecutionState &&
      executionState.selectedRuntime?.runtimeValue instanceof LakehouseRuntime;
    const [isLakehouseConfigModalOpen, setIsLakehouseConfigModalOpen] =
      useState(false);

    // auto-select first class when none is chosen
    const classes = queryBuilderState.usableClasses;
    useEffect(() => {
      if (!queryBuilderState.class && classes[0]) {
        queryBuilderState.changeClass(classes[0]);
      }
    }, [classes, queryBuilderState]);

    const copyDataProductLinkToClipboard = (): void => {
      if (queryBuilderState.isProductLinkable) {
        queryBuilderState.copyDataProductLinkToClipBoard();
      }
    };

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              title="copy data product query set up link to clipboard"
              onClick={copyDataProductLinkToClipboard}
              disabled={!queryBuilderState.isProductLinkable}
            >
              <AnchorLinkIcon />
            </PanelHeaderActionItem>
            {showLakehouseConfigButton && (
              <ControlledDropdownMenu
                className="panel__header__action query-builder__setup__config-group__header__dropdown-trigger"
                title="Show Settings..."
                content={
                  <MenuContent>
                    <MenuContentItem
                      onClick={() => setIsLakehouseConfigModalOpen(true)}
                    >
                      <MenuContentItemIcon>
                        <CogIcon />
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>
                        Lakehouse Runtime Configuration
                      </MenuContentItemLabel>
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'right',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'right',
                  },
                }}
              >
                <MoreVerticalIcon className="query-builder__icon__more-options" />
              </ControlledDropdownMenu>
            )}
          </PanelHeaderActions>
        </PanelHeader>
        <div className="query-builder__setup__config-group__content">
          <DataProductQueryBuilderSetupFormContent
            queryBuilderState={queryBuilderState}
            formatOptionLabel={formatDataProductOptionLabel}
            isLoading={
              queryBuilderState.productSelectorState.loadProductsState
                .isInProgress ||
              queryBuilderState.loadDataProductModelState.isInProgress
            }
          />
        </div>
        {executionState instanceof
          ModelAccessPointDataProductExecutionState && (
          <LakehouseRuntimeConfigModal
            executionState={executionState}
            open={isLakehouseConfigModalOpen}
            onClose={() => setIsLakehouseConfigModalOpen(false)}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        )}
      </div>
    );
  },
);

export const renderLegendDataProductQueryBuilderSetupPanelContent = (
  queryBuilderState: LegendQueryDataProductQueryBuilderState,
): React.ReactNode => (
  <LegendDataProductQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
