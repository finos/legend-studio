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
  ControlledDropdownMenu,
  MenuContentItem,
  MenuContent,
  MenuContentItemIcon,
  CheckIcon,
  MenuContentItemLabel,
  SearchIcon,
  PanelHeaderActions,
  PanelHeader,
  MoreVerticalIcon,
  compareLabelFn,
  PanelHeaderActionItem,
  AnchorLinkIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import {
  type DataSpaceQueryBuilderState,
  resolveUsableDataSpaceClasses,
} from '../../stores/query-builder/DataSpaceQueryBuilderState.js';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
  type EntityWithOriginOption,
} from '@finos/legend-query-builder';
import {
  type Runtime,
  type PackageableRuntime,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import { ResolvedDataSpaceEntityWithOrigin } from '../../stores/shared/DataSpaceInfo.js';
import {
  DepotEntityWithOrigin,
  generateGAVCoordinates,
} from '@finos/legend-storage';
import { useEffect } from 'react';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { type DataSpaceExecutionContext } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DataSpaceAdvancedSearchModal } from './DataSpaceAdvancedSearchModal.js';

export type DataSpaceOption = {
  label: string;
  value: ResolvedDataSpaceEntityWithOrigin;
};

export const formatDataSpaceOptionLabel = (
  option: EntityWithOriginOption,
): React.ReactNode => (
  <div
    className="query-builder__setup__data-space__option"
    title={`${option.label} - ${option.value.path} - ${
      option.value.origin
        ? generateGAVCoordinates(
            option.value.origin.groupId,
            option.value.origin.artifactId,
            option.value.origin.versionId,
          )
        : ''
    }`}
  >
    <div className="query-builder__setup__data-space__option__label">
      {option.label}
    </div>
  </div>
);

const resolveExecutionContextRuntimes = (
  queryBuilderState: DataSpaceQueryBuilderState,
): PackageableRuntime[] => {
  if (queryBuilderState.dataSpaceAnalysisResult) {
    const executionContext = Array.from(
      queryBuilderState.dataSpaceAnalysisResult.executionContextsIndex.values(),
    ).find(
      (e) =>
        e.mapping.path ===
        queryBuilderState.executionContext.mapping.value.path,
    );
    return guaranteeNonNullable(executionContext).compatibleRuntimes;
  }
  return getMappingCompatibleRuntimes(
    queryBuilderState.executionContext.mapping.value,
    queryBuilderState.graphManagerState.usableRuntimes,
  );
};

export type ExecutionContextOption = {
  label: string;
  value: DataSpaceExecutionContext;
};
export const buildExecutionContextOption = (
  value: DataSpaceExecutionContext,
): ExecutionContextOption => ({
  label: value.name,
  value,
});

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected
 execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link DataSpaceQueryBuilderState}
 */
const DataSpaceQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: DataSpaceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // data product
    const dataSpaceOptions = queryBuilderState.dataSpaceOptions;
    const allOptions = [
      ...dataSpaceOptions,
      ...(queryBuilderState.extraOptionsConfig?.options ?? []),
    ];

    const selectedDataSpaceOption: EntityWithOriginOption =
      queryBuilderState.selectedDataSpaceOption;
    const onDataSpaceOptionChange = (option: EntityWithOriginOption): void => {
      const value = option.value;
      if (value instanceof ResolvedDataSpaceEntityWithOrigin) {
        queryBuilderState.queryChatState?.abort();
        queryBuilderState
          .onDataSpaceChange(value)
          .catch(queryBuilderState.applicationStore.alertUnhandledError);
      } else if (
        value instanceof DepotEntityWithOrigin &&
        queryBuilderState.extraOptionsConfig
      ) {
        queryBuilderState.queryChatState?.abort();
        queryBuilderState.extraOptionsConfig.onChange(value);
      }
    };

    const openDataSpaceAdvancedSearch = (): void => {
      if (queryBuilderState.isAdvancedDataSpaceSearchEnabled) {
        queryBuilderState.showAdvancedSearchPanel(queryBuilderState.dataSpace);
      }
    };

    // execution context
    const executionContextOptions =
      queryBuilderState.dataSpace.executionContexts
        .map(buildExecutionContextOption)
        .sort(compareLabelFn);
    const showExecutionContextOptions = executionContextOptions.length > 1;
    const selectedExecutionContextOption = buildExecutionContextOption(
      queryBuilderState.executionContext,
    );

    const onExecutionContextOptionChange = async (
      option: ExecutionContextOption,
    ): Promise<void> => {
      if (option.value === queryBuilderState.executionContext) {
        return;
      }
      const currentMapping =
        queryBuilderState.executionContext.mapping.value.path;
      queryBuilderState.setExecutionContext(option.value);
      await queryBuilderState.propagateExecutionContextChange(
        currentMapping === option.value.mapping.value.path,
      );
      queryBuilderState.onExecutionContextChange?.(option.value);
    };

    const handleExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      flowResult(onExecutionContextOptionChange(option));
    };

    // runtime
    const runtimeOptions = resolveExecutionContextRuntimes(queryBuilderState)
      .map(
        (rt) =>
          new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      )
      .map(buildRuntimeValueOption)
      .sort(compareLabelFn);
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
      stringify: (option: { data: { value: Runtime } }): string =>
        guaranteeType(option.data.value, RuntimePointer).packageableRuntime
          .value.path,
    });

    // class
    const classes = resolveUsableDataSpaceClasses(
      queryBuilderState.dataSpace,
      queryBuilderState.executionContext.mapping.value,
      queryBuilderState.graphManagerState,
      queryBuilderState,
    );

    useEffect(() => {
      flowResult(queryBuilderState.loadEntities()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    const copyDataSpaceLinkToClipboard = (): void => {
      if (queryBuilderState.isDataSpaceLinkable) {
        queryBuilderState.copyDataSpaceLinkToClipboard();
      }
    };

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              title="copy data product query set up link to clipboard"
              onClick={copyDataSpaceLinkToClipboard}
              disabled={!queryBuilderState.isDataSpaceLinkable}
            >
              <AnchorLinkIcon />
            </PanelHeaderActionItem>
            <ControlledDropdownMenu
              className="panel__header__action query-builder__setup__config-group__header__dropdown-trigger"
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
              <MoreVerticalIcon className="query-builder__icon__more-options" />
            </ControlledDropdownMenu>
          </PanelHeaderActions>
        </PanelHeader>
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
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              options={allOptions}
              isLoading={queryBuilderState.loadEntitiesState.isInProgress}
              onChange={onDataSpaceOptionChange}
              value={selectedDataSpaceOption}
              placeholder="Search for data product..."
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
              </>
            )}
          </div>
          {Boolean(showExecutionContextOptions) && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="execution context"
                htmlFor="query-builder__setup__context-selector"
              >
                Context
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__context-selector"
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose an execution context..."
                options={executionContextOptions}
                disabled={
                  executionContextOptions.length < 1 ||
                  (executionContextOptions.length === 1 &&
                    Boolean(selectedExecutionContextOption))
                }
                onChange={handleExecutionContextOptionChange}
                value={selectedExecutionContextOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          )}
          {queryBuilderState.showRuntimeSelector && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="runtime"
                htmlFor="query-builder__setup__runtime-selector"
              >
                Runtime
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__runtime-selector"
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
          <div className="query-builder__setup__config-group__item">
            <QueryBuilderClassSelector
              queryBuilderState={queryBuilderState}
              classes={classes}
              onClassChange={queryBuilderState.onClassChange}
              noMatchMessage="No compatible entity found for specified execution context"
            />
          </div>
        </div>
      </div>
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
