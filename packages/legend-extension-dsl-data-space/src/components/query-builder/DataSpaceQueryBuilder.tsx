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
  DataSpacesDepotRepository,
} from '../../stores/query-builder/DataSpaceQueryBuilderState.js';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
} from '@finos/legend-query-builder';
import {
  type Runtime,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import type { DataSpaceInfo } from '../../stores/shared/DataSpaceInfo.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { useEffect } from 'react';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { type DataSpaceExecutionContext } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DataSpaceAdvancedSearchModal } from './DataSpaceAdvancedSearchModal.js';
import { generateDataSpaceQueryCreatorRoute } from '../../__lib__/to-delete/DSL_DataSpace_LegendQueryNavigation_to_delete.js';

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
    title={`${option.label} - ${option.value.path} - ${
      option.value.groupId && option.value.artifactId && option.value.versionId
        ? generateGAVCoordinates(
            option.value.groupId,
            option.value.artifactId,
            option.value.versionId,
          )
        : ''
    }`}
  >
    <div className="query-builder__setup__data-space__option__label">
      {option.label}
    </div>
  </div>
);

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
    const repo = queryBuilderState.dataSpaceRepo;
    const depotRepo =
      repo instanceof DataSpacesDepotRepository ? repo : undefined;
    const project = depotRepo?.project;

    // data space
    const prioritizeDataSpaceFunc =
      queryBuilderState.dataSpaceRepo.prioritizeDataSpaceFunc;
    const sortedAllOptions = (queryBuilderState.dataSpaceRepo.dataSpaces ?? [])
      .map(buildDataSpaceOption)
      .sort(compareLabelFn);

    const dataSpaceOptions = prioritizeDataSpaceFunc
      ? [
          ...sortedAllOptions.filter((val) =>
            prioritizeDataSpaceFunc(val.value),
          ),
          ...sortedAllOptions.filter(
            (val) => !prioritizeDataSpaceFunc(val.value),
          ),
        ]
      : sortedAllOptions;

    const selectedDataSpaceOption: DataSpaceOption = {
      label:
        queryBuilderState.dataSpace.title ?? queryBuilderState.dataSpace.name,
      value: {
        groupId: project?.groupId,
        artifactId: project?.artifactId,
        versionId: project?.versionId,
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

    const openDataSpaceAdvancedSearch = (): void => {
      if (repo.isAdvancedDataSpaceSearchEnabled && depotRepo) {
        depotRepo.showAdvancedSearchPanel(queryBuilderState.dataSpace);
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
      stringify: (option: { value: Runtime }): string =>
        guaranteeType(option.value, RuntimePointer).packageableRuntime.value
          .path,
    });

    // class
    const classes = resolveUsableDataSpaceClasses(
      queryBuilderState.dataSpace,
      queryBuilderState.executionContext.mapping.value,
      queryBuilderState.graphManagerState,
    );

    useEffect(() => {
      flowResult(queryBuilderState.dataSpaceRepo.loadDataSpaces()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    const copyDataSpaceLinkToClipboard = (): void => {
      const nonNullableProject = guaranteeNonNullable(
        project,
        'Unable to copy data space query set up link to clipboard because project is null',
      );
      const dataSpace = queryBuilderState.dataSpace;
      const executionContext = queryBuilderState.executionContext;
      const runtimePath =
        queryBuilderState.executionContextState.runtimeValue instanceof
        RuntimePointer
          ? queryBuilderState.executionContextState.runtimeValue
              .packageableRuntime.value.path
          : undefined;
      const route =
        applicationStore.navigationService.navigator.generateAddress(
          generateDataSpaceQueryCreatorRoute(
            nonNullableProject.groupId,
            nonNullableProject.artifactId,
            nonNullableProject.versionId,
            dataSpace.path,
            executionContext.name,
            runtimePath,
            queryBuilderState.class?.path,
          ),
        );

      navigator.clipboard
        .writeText(route)
        .catch(() =>
          applicationStore.notificationService.notifyError(
            'Error copying data space query set up link to clipboard',
          ),
        );

      applicationStore.notificationService.notifySuccess(
        'Copied data space query set up link to clipboard',
      );
    };

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              title="copy data space query set up link to clipboard"
              onClick={copyDataSpaceLinkToClipboard}
              disabled={queryBuilderState.dataSpace === undefined}
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
              className="btn--sm query-builder__setup__config-group__item__label"
              title="data space"
              htmlFor="query-builder__setup__data-space-selector"
            >
              Data Space
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__data-space-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              options={dataSpaceOptions}
              isLoading={
                queryBuilderState.dataSpaceRepo.loadDataSpacesState.isInProgress
              }
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
            {depotRepo && (
              <>
                <button
                  tabIndex={-1}
                  className="query-builder__setup__data-space-searcher__btn btn--dark"
                  onClick={openDataSpaceAdvancedSearch}
                  title="Open advanced search for data space..."
                >
                  <SearchIcon />
                </button>
                {depotRepo.advancedSearchState && (
                  <DataSpaceAdvancedSearchModal
                    searchState={depotRepo.advancedSearchState}
                    onClose={() => depotRepo.hideAdvancedSearchPanel()}
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
                onChange={onExecutionContextOptionChange}
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
