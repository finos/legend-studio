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
  LakehouseDataProductExecutionState,
  DataProductQueryBuilderSetupFormContent,
} from '@finos/legend-query-builder';
import {
  AnchorLinkIcon,
  CogIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  MoreVerticalIcon,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LakehouseRuntime } from '@finos/legend-graph';
import { useEffect, useState } from 'react';
import type { LegendQueryDataProductQueryBuilderState } from '../../stores/data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';
import { formatDataProductOptionLabel } from '../shared/LegendQueryDataProductOptionLabel.js';
import { LakehouseRuntimeConfigModal } from '../shared/LakehouseRuntimeConfigModal.js';

/**
 * Modal for editing LakehouseRuntime configuration (environment and warehouse).
 */

const LegendDataProductQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: LegendQueryDataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const executionState = queryBuilderState.executionState;

    // lakehouse runtime config modal
    const showLakehouseConfigButton =
      (executionState instanceof ModelAccessPointDataProductExecutionState ||
        executionState instanceof LakehouseDataProductExecutionState) &&
      executionState.selectedRuntime?.runtimeValue instanceof LakehouseRuntime;
    const [isLakehouseConfigModalOpen, setIsLakehouseConfigModalOpen] =
      useState(false);

    // auto-select first class when none is chosen
    const classes = queryBuilderState.usableClasses;
    useEffect(() => {
      if (!queryBuilderState.sourceElement && classes[0]) {
        queryBuilderState.changeSourceElement(classes[0]);
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
        {(executionState instanceof ModelAccessPointDataProductExecutionState ||
          executionState instanceof LakehouseDataProductExecutionState) && (
          <LakehouseRuntimeConfigModal
            lakehouseRuntime={
              executionState.selectedRuntime?.runtimeValue instanceof
              LakehouseRuntime
                ? executionState.selectedRuntime.runtimeValue
                : undefined
            }
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
