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
import { QueryBuilderClassSelector } from '@finos/legend-query-builder';
import {
  CustomSelectorInput,
  PanelHeader,
  SearchIcon,
  compareLabelFn,
  type SelectComponent,
} from '@finos/legend-art';
import {
  DataSpaceAdvancedSearchModal,
  formatDataSpaceOptionLabel,
  type DataSpaceOption,
} from '@finos/legend-extension-dsl-data-space/application-query';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/graph';
import type { LegendQueryBareQueryBuilderState } from '../../stores/data-space/LegendQueryBareQueryBuilderState.js';
import type {
  DataProductOption,
  DataProductWithLegacyOption,
} from '../../stores/data-space/DataSpaceQueryCreatorStore.js';
import { flowResult } from 'mobx';

// Custom format function to handle both DataSpace and DataProduct options
const formatDataSpaceOrProductOptionLabel = (
  option: DataProductWithLegacyOption,
): React.ReactNode => {
  // If it's a DataSpace (ResolvedDataSpaceEntityWithOrigin), use the standard formatter
  if (option.value instanceof ResolvedDataSpaceEntityWithOrigin) {
    return formatDataSpaceOptionLabel(option as DataSpaceOption);
  }
  // For DataProduct (DepotEntityWithOrigin), render a simpler label
  return (
    <div
      className="query-builder__setup__data-space__option"
      title={`${option.label} - ${option.value.path} - ${
        option.value.origin
          ? `${option.value.origin.groupId}:${option.value.origin.artifactId}:${option.value.origin.versionId}`
          : ''
      }`}
    >
      <div className="query-builder__setup__data-space__option__label">
        {option.label}
      </div>
    </div>
  );
};

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link LegendQueryBareQueryBuilderState}
 */
const DataProductQuerySetupSetupPanelContent = observer(
  (props: { queryBuilderState: LegendQueryBareQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const dataSpaceSearchRef = useRef<SelectComponent>(null);
    // Combine data spaces and data products
    const dataProductOptions =
      queryBuilderState.productSelectorState.dataProductOptions.sort(
        compareLabelFn,
      );
    const selectedDataSpaceOption = null;
    const onDataSpaceOptionChange = (
      option: DataSpaceOption | DataProductOption,
    ): void => {
      queryBuilderState.queryChatState?.abort();
      const value = option.value;
      if (value instanceof ResolvedDataSpaceEntityWithOrigin) {
        queryBuilderState.changeHandlers.onDataSpaceChange(value);
      } else {
        queryBuilderState.changeHandlers.onDataProductChange(value);
      }
    };

    const openDataSpaceAdvancedSearch = (): void =>
      queryBuilderState.showAdvancedSearchPanel();

    useEffect(() => dataSpaceSearchRef.current?.focus());

    useEffect(() => {
      flowResult(queryBuilderState.productSelectorState.loadProducts()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties" />
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__data-product"
              title="data product"
              htmlFor="query-builder__setup__data-space-selector"
            >
              Data Product
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__data-space-selector"
              inputRef={dataSpaceSearchRef}
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              options={dataProductOptions}
              isLoading={
                queryBuilderState.productSelectorState.loadProductsState
                  .isInProgress
              }
              onChange={onDataSpaceOptionChange}
              value={selectedDataSpaceOption}
              placeholder="Search for data product..."
              escapeClearsValue={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              formatOptionLabel={formatDataSpaceOrProductOptionLabel}
            />
            <button
              tabIndex={-1}
              className="query-builder__setup__data-space-searcher__btn btn--dark"
              onClick={openDataSpaceAdvancedSearch}
              title="Open advanced search for data product..."
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
  queryBuilderState: LegendQueryBareQueryBuilderState,
): React.ReactNode => (
  <DataProductQuerySetupSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
