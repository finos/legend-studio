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

import {
  CustomSelectorInput,
  createFilter,
  PURE_RuntimeIcon,
  PlayIcon,
  DropdownMenu,
  MoreHorizontalIcon,
  MenuContentItem,
  MenuContent,
  MenuContentItemIcon,
  CheckIcon,
  MenuContentItemLabel,
  SearchIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import type { DataSpaceQueryBuilderState } from '../../stores/query/DataSpaceQueryBuilderState.js';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
} from '@finos/legend-query-builder';
import {
  type Runtime,
  type GraphManagerState,
  type Mapping,
  getMappingCompatibleClasses,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  RuntimePointer,
  Class,
  Package,
  getDescendantsOfPackage,
} from '@finos/legend-graph';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  debounce,
  filterByType,
  guaranteeType,
  uniq,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DataSpaceIcon } from '../DSL_DataSpace_Icon.js';
import { DataSpaceAdvancedSearchModal } from './DataSpaceAdvancedSearchModal.js';

export type DataSpaceOption = {
  label: string;
  value: DataSpaceInfo;
};
export const buildDataSpaceOption = (
  value: DataSpaceInfo,
): DataSpaceOption => ({
  label: value.title ?? value.name,
  value,
});
export const formatDataSpaceOptionLabel = (
  option: DataSpaceOption,
): React.ReactNode => (
  <div
    className="query-builder__setup__data-space__option"
    title={`${option.label} - ${option.value.path} - ${generateGAVCoordinates(
      option.value.groupId,
      option.value.artifactId,
      option.value.versionId,
    )}`}
  >
    <div className="query-builder__setup__data-space__option__label">
      {option.label}
    </div>
    <div className="query-builder__setup__data-space__option__path">
      {option.value.path}
    </div>
    <div className="query-builder__setup__data-space__option__gav">
      {generateGAVCoordinates(
        option.value.groupId,
        option.value.artifactId,
        option.value.versionId,
      )}
    </div>
  </div>
);

const resolveDataSpaceClasses = (
  dataSpace: DataSpace,
  mapping: Mapping,
  graphManagerState: GraphManagerState,
): Class[] => {
  if (dataSpace.elements?.length) {
    const dataSpaceElements = dataSpace.elements.map((ep) => ep.element.value);
    return uniq([
      ...dataSpaceElements.filter(filterByType(Class)),
      ...dataSpaceElements
        .filter(filterByType(Package))
        .map((_package) => Array.from(getDescendantsOfPackage(_package)))
        .flat()
        .filter(filterByType(Class)),
    ]);
  }
  return getMappingCompatibleClasses(mapping, graphManagerState.usableClasses);
};

type ExecutionContextOption = {
  label: string;
  value: DataSpaceExecutionContext;
};
const buildExecutionContextOption = (
  value: DataSpaceExecutionContext,
): ExecutionContextOption => ({
  label: value.name,
  value,
});

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link DataSpaceQueryBuilderState}
 */
const DataSpaceQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: DataSpaceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const [dataSpaceSearchText, setDataSpaceSearchText] = useState('');

    // data space
    const dataSpaceOptions =
      queryBuilderState.dataSpaces.map(buildDataSpaceOption);
    const selectedDataSpaceOption: DataSpaceOption = {
      label:
        queryBuilderState.dataSpace.title ?? queryBuilderState.dataSpace.name,
      value: {
        groupId: queryBuilderState.groupId,
        artifactId: queryBuilderState.artifactId,
        versionId: queryBuilderState.versionId,
        title: queryBuilderState.dataSpace.title,
        name: queryBuilderState.dataSpace.name,
        path: queryBuilderState.dataSpace.path,
        defaultExecutionContext:
          queryBuilderState.dataSpace.defaultExecutionContext.name,
      },
    };
    const onDataSpaceOptionChange = (option: DataSpaceOption): void => {
      queryBuilderState.onDataSpaceChange(option.value);
    };

    // data space search text
    const debouncedLoadDataSpaces = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(queryBuilderState.loadDataSpaces(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, queryBuilderState],
    );
    const onDataSpaceSearchTextChange = (value: string): void => {
      if (value !== dataSpaceSearchText) {
        setDataSpaceSearchText(value);
        debouncedLoadDataSpaces.cancel();
        debouncedLoadDataSpaces(value);
      }
    };
    const openDataSpaceAdvancedSearch = (): void =>
      queryBuilderState.showAdvancedSearchPanel();

    // execution context
    const executionContextOptions =
      queryBuilderState.dataSpace.executionContexts.map(
        buildExecutionContextOption,
      );
    const selectedExecutionContextOption = buildExecutionContextOption(
      queryBuilderState.executionContext,
    );
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value === queryBuilderState.executionContext) {
        return;
      }
      queryBuilderState.setExecutionContext(option.value);
      queryBuilderState.propagateExecutionContextChange(option.value);
      queryBuilderState.onExecutionContextChange?.(option.value);
    };

    // runtime
    const runtimeOptions = getMappingCompatibleRuntimes(
      queryBuilderState.executionContext.mapping.value,
      queryBuilderState.graphManagerState.usableRuntimes,
    )
      .map(
        (rt) =>
          new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      )
      .map(buildRuntimeValueOption);
    const selectedRuntimeOption = queryBuilderState.executionContextState
      .runtimeValue
      ? buildRuntimeValueOption(
          queryBuilderState.executionContextState.runtimeValue,
        )
      : null;
    const changeRuntime = (option: { value: Runtime }): void => {
      if (
        option.value === queryBuilderState.executionContextState.runtimeValue
      ) {
        return;
      }
      queryBuilderState.changeRuntime(option.value);
      queryBuilderState.onRuntimeChange?.(option.value);
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { value: Runtime }): string =>
        guaranteeType(option.value, RuntimePointer).packageableRuntime.value
          .path,
    });

    // class
    const classes = resolveDataSpaceClasses(
      queryBuilderState.dataSpace,
      queryBuilderState.executionContext.mapping.value,
      queryBuilderState.graphManagerState,
    );

    useEffect(() => {
      flowResult(queryBuilderState.loadDataSpaces('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              data space execution context
            </div>
            <DropdownMenu
              className="query-builder__setup__config-group__header__dropdown-trigger"
              title="Show Settings..."
              content={
                <MenuContent>
                  <MenuContentItem
                    onClick={(): void =>
                      queryBuilderState.setShowRuntimeSelector(
                        !queryBuilderState.showRuntimeSelector,
                      )
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.showRuntimeSelector ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Runtime Selector
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <MoreHorizontalIcon />
            </DropdownMenu>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="data space"
              >
                <DataSpaceIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                options={dataSpaceOptions}
                isLoading={queryBuilderState.loadDataSpacesState.isInProgress}
                onInputChange={onDataSpaceSearchTextChange}
                inputValue={dataSpaceSearchText}
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
              {queryBuilderState.isAdvancedDataSpaceSearchEnabled && (
                <>
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
                      onClose={() =>
                        queryBuilderState.hideAdvancedSearchPanel()
                      }
                    />
                  )}
                </>
              )}
            </div>
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="execution context"
              >
                <PlayIcon className="query-builder__setup__data-space__icon__execution-context" />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose an execution context..."
                options={executionContextOptions}
                disabled={
                  executionContextOptions.length < 1 ||
                  (executionContextOptions.length === 1 &&
                    Boolean(selectedExecutionContextOption))
                }
                onChange={onExecutionContextOptionChange}
                value={selectedExecutionContextOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
            {queryBuilderState.showRuntimeSelector && (
              <div className="query-builder__setup__config-group__item">
                <div
                  className="btn--sm query-builder__setup__config-group__item__label"
                  title="runtime"
                >
                  <PURE_RuntimeIcon />
                </div>
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                  placeholder="Choose a runtime..."
                  noMatchMessage="No compatible runtime found for specified execution context"
                  options={runtimeOptions}
                  onChange={changeRuntime}
                  value={selectedRuntimeOption}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  filterOption={runtimeFilterOption}
                  formatOptionLabel={getRuntimeOptionFormatter({
                    darkMode:
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled,
                  })}
                />
              </div>
            )}
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          onClassChange={queryBuilderState.onClassChange}
          noMatchMessage="No compatible class found for specified execution context"
        />
      </>
    );
  },
);

export const renderDataSpaceQueryBuilderSetupPanelContent = (
  queryBuilderState: DataSpaceQueryBuilderState,
): React.ReactNode => (
  <DataSpaceQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
