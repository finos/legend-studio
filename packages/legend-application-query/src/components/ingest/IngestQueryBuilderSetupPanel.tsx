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
  AnchorLinkIcon,
  CogIcon,
  compareLabelFn,
  ControlledDropdownMenu,
  createFilter,
  CustomSelectorInput,
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
import { useState } from 'react';
import type { IngestLegendQueryBuilderState } from '../../stores/ingest/IngestLegendQueryBuilderState.js';
import { LakehouseRuntimeConfigModal } from '../shared/LakehouseRuntimeConfigModal.js';

type DataSetOption = {
  label: string;
  value: { schemaName?: string | undefined; tableName: string };
};

type IngestOption = {
  label: string;
  value: string;
};

/**
 * Setup panel for ingest-backed queries. Mirrors the data-product setup
 * panel's header actions (copy deep-link, edit lakehouse runtime) but
 * skips the source / runtime selectors since the ingest flow is fully
 * resolved from the route + adhoc runtime. The data set selector is kept
 * so the user can switch between datasets of the same ingest definition.
 */
const IngestQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: IngestLegendQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const [isLakehouseConfigModalOpen, setIsLakehouseConfigModalOpen] =
      useState(false);
    const lakehouseRuntime = queryBuilderState.lakehouseRuntime;
    const showLakehouseConfigButton = Boolean(lakehouseRuntime);
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    // data set selector (driven by the ingest definition's datasets via
    // `AccessorQueryBuilderState.accessorsOptions`).
    const dataSetOptions =
      queryBuilderState.accessorsOptions.sort(compareLabelFn);
    const selectedDataSetOption = queryBuilderState.sourceAccessor
      ? (dataSetOptions.find(
          (opt) =>
            opt.value.tableName ===
              queryBuilderState.sourceAccessor?.accessor &&
            opt.value.schemaName === queryBuilderState.sourceAccessor.schema,
        ) ?? null)
      : null;
    const changeDataSet = async (val: DataSetOption): Promise<void> => {
      await queryBuilderState.changeAccessor(val.value);
    };

    // ingest selector (paths fetched up front; only one ingest is built into
    // the graph at a time — see `IngestQueryCreatorStore.swapIngestDefinition`).
    const ingestOptions: IngestOption[] = queryBuilderState.allIngestPaths
      .map((path) => ({ label: path, value: path }))
      .sort(compareLabelFn);
    const selectedIngestOption: IngestOption | null =
      ingestOptions.find(
        (opt) => opt.value === queryBuilderState.ingestDefinition.path,
      ) ?? null;
    const changeIngest = async (val: IngestOption): Promise<void> => {
      await queryBuilderState.changeIngestDefinition(val.value);
    };
    const ingestFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: IngestOption }): string => option.data.value,
    });

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              title="copy ingest query set up link to clipboard"
              onClick={() => queryBuilderState.copyIngestQueryLinkToClipBoard()}
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
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="ingest definition"
              htmlFor="query-builder__setup__ingest-selector"
            >
              Ingest
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__ingest-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              placeholder="Choose an ingest..."
              options={ingestOptions}
              onChange={(val: IngestOption): void => {
                changeIngest(val).catch(() => undefined);
              }}
              value={selectedIngestOption}
              darkMode={darkMode}
              disabled={queryBuilderState.isSwappingIngest}
              filterOption={ingestFilterOption}
            />
          </div>
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="data set"
              htmlFor="query-builder__setup__ingest-dataset-selector"
            >
              Data Set
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__ingest-dataset-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              placeholder="Choose a data set..."
              options={dataSetOptions}
              onChange={(val: DataSetOption): void => {
                changeDataSet(val).catch(() => undefined);
              }}
              value={selectedDataSetOption}
              darkMode={darkMode}
            />
          </div>
        </div>
        <LakehouseRuntimeConfigModal
          lakehouseRuntime={lakehouseRuntime}
          open={isLakehouseConfigModalOpen}
          onClose={() => setIsLakehouseConfigModalOpen(false)}
          darkMode={darkMode}
        />
      </div>
    );
  },
);

export const renderIngestQueryBuilderSetupPanelContent = (
  queryBuilderState: IngestLegendQueryBuilderState,
): React.ReactNode => (
  <IngestQueryBuilderSetupPanelContent queryBuilderState={queryBuilderState} />
);
