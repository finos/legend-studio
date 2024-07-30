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
import { useApplicationStore } from '@finos/legend-application';
import { useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import { QueryBuilderClassSelector } from '@finos/legend-query-builder';
import {
  CustomSelectorInput,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  SearchIcon,
  compareLabelFn,
  type SelectComponent,
} from '@finos/legend-art';
import { type DataSpaceQuerySetupState } from '../../stores/data-space/DataSpaceQuerySetupState.js';
import {
  DataSpaceAdvancedSearchModal,
  buildDataSpaceOption,
  formatDataSpaceOptionLabel,
  type DataSpaceOption,
} from '@finos/legend-extension-dsl-data-space/application-query';
import { generateDataSpaceQueryCreatorRoute } from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { DataSpaceQueryCreatorStore } from '../../stores/data-space/DataSpaceQueryCreatorStore.js';

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link DataSpaceQuerySetupState}
 */
const DataSpaceQuerySetupSetupPanelContent = observer(
  (props: { queryBuilderState: DataSpaceQuerySetupState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const dataSpaceSearchRef = useRef<SelectComponent>(null);
    // data space
    const dataSpaceOptions = queryBuilderState.dataSpaces
      .map(buildDataSpaceOption)
      .sort(compareLabelFn);
    const selectedDataSpaceOption: DataSpaceOption | null = null;
    const onDataSpaceOptionChange = (option: DataSpaceOption): void => {
      queryBuilderState.onDataSpaceChange(option.value);
    };

    const openDataSpaceAdvancedSearch = (): void =>
      queryBuilderState.showAdvancedSearchPanel();

    useEffect(() => {
      flowResult(queryBuilderState.initializeDataSpaceSetup()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    useEffect(() => dataSpaceSearchRef.current?.focus());

    const copyDataSpaceLinkToClipboard = (): void => {
      const editorStore = guaranteeType(
        queryBuilderState.editorStore,
        DataSpaceQueryCreatorStore,
      );
      const dataSpace = guaranteeNonNullable(editorStore.queryableDataSpace);
      const route = generateDataSpaceQueryCreatorRoute(
        dataSpace.groupId,
        dataSpace.artifactId,
        dataSpace.versionId,
        dataSpace.dataSpacePath,
        dataSpace.executionContext,
        dataSpace.runtimePath,
        dataSpace.classPath,
      );

      navigator.clipboard.writeText(route);
    };

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties">
          <PanelHeaderActions>
            <PanelHeaderActionItem title="Copy link">
              <button onClick={copyDataSpaceLinkToClipboard}>link</button>
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="data space"
              htmlFor="query-builder__setup__data-space-selector"
            >
              Data Space
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__data-space-selector"
              ref={dataSpaceSearchRef}
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              options={dataSpaceOptions}
              isLoading={queryBuilderState.loadDataSpacesState.isInProgress}
              onChange={onDataSpaceOptionChange}
              value={selectedDataSpaceOption}
              placeholder="Search for data space..."
              escapeClearsValue={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              formatOptionLabel={formatDataSpaceOptionLabel}
            />
            <button
              tabIndex={-1}
              className="query-builder__setup__data-space-searcher__btn btn--dark"
              onClick={openDataSpaceAdvancedSearch}
              title="Open advanced search for data space..."
            >
              <SearchIcon />
            </button>
            {queryBuilderState.advancedSearchState && (
              <DataSpaceAdvancedSearchModal
                searchState={queryBuilderState.advancedSearchState}
                onClose={() => queryBuilderState.hideAdvancedSearchPanel()}
              />
            )}
          </div>
          <div className="query-builder__setup__config-group__item">
            <QueryBuilderClassSelector
              queryBuilderState={queryBuilderState}
              classes={[]}
              noMatchMessage="No compatible entity found"
            />
          </div>
        </div>
      </div>
    );
  },
);

export const renderDataSpaceQuerySetupSetupPanelContent = (
  queryBuilderState: DataSpaceQuerySetupState,
): React.ReactNode => (
  <DataSpaceQuerySetupSetupPanelContent queryBuilderState={queryBuilderState} />
);
