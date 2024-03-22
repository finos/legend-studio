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
  FilterIcon,
  PanelHeader,
  BasePopover,
  TagIcon,
  ClickAwayListener,
  ShareIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataSpaceQueryBuilderState,
  resolveUsableDataSpaceClasses,
} from '../../stores/query/DataSpaceQueryBuilderState.js';
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
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  DataSpace,
  DataSpaceExecutableTemplate,
  type DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DataSpaceIcon } from '../DSL_DataSpace_Icon.js';
import { DataSpaceAdvancedSearchModal } from './DataSpaceAdvancedSearchModal.js';
import type { EditorStore } from '@finos/legend-application-studio';
import { generateDataSpaceTemplateQueryViewerRoute } from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';

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
    <div className="query-builder__setup__data-space__option__path">
      {option.value.path}
    </div>
    <div className="query-builder__setup__data-space__option__gav">
      {option.value.groupId &&
        option.value.artifactId &&
        option.value.versionId && (
          <>
            {generateGAVCoordinates(
              option.value.groupId,
              option.value.artifactId,
              option.value.versionId,
            )}
          </>
        )}
    </div>
  </div>
);

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
        groupId: queryBuilderState.projectInfo?.groupId,
        artifactId: queryBuilderState.projectInfo?.artifactId,
        versionId: queryBuilderState.projectInfo?.versionId,
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
    const classes = resolveUsableDataSpaceClasses(
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

const DataSpaceTemplateQueryDialog = observer(
  (props: {
    triggerElement: HTMLElement | null;
    queryBuilderState: DataSpaceQueryBuilderState;
    templateQueries: DataSpaceExecutableTemplate[];
  }) => {
    const { triggerElement, queryBuilderState, templateQueries } = props;
    const applicationStore = useApplicationStore();
    const handleClose = (): void => {
      queryBuilderState.setTemplateQueryDialogOpen(false);
    };
    const loadQuery = (template: DataSpaceExecutableTemplate): void => {
      const executionContext =
        queryBuilderState.dataSpace.executionContexts.find(
          (c) => c.name === template.executionContextKey,
        );
      if (
        executionContext &&
        executionContext.hashCode !==
          queryBuilderState.executionContext.hashCode
      ) {
        queryBuilderState.setExecutionContext(executionContext);
        queryBuilderState.propagateExecutionContextChange(executionContext);
        queryBuilderState.initializeWithQuery(template.query);
        queryBuilderState.onExecutionContextChange?.(executionContext);
      } else {
        queryBuilderState.initializeWithQuery(template.query);
      }
      handleClose();
    };

    const shareTemplateQuery = (
      template: DataSpaceExecutableTemplate,
    ): void => {
      if (queryBuilderState.projectInfo?.groupId) {
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            generateDataSpaceTemplateQueryViewerRoute(
              queryBuilderState.projectInfo.groupId,
              queryBuilderState.projectInfo.artifactId,
              queryBuilderState.projectInfo.versionId,
              queryBuilderState.dataSpace.path,
              template.title,
            ),
          ),
        );
      }
    };

    return (
      <ClickAwayListener onClickAway={handleClose}>
        <div>
          <BasePopover
            open={queryBuilderState.isTemplateQueryDialogOpen}
            PaperProps={{
              classes: {
                root: '"query-builder__data-space__template-query-panel__container__root',
              },
            }}
            className="query-builder__data-space__template-query-panel__container"
            onClose={handleClose}
            anchorEl={triggerElement}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <div className="query-builder__data-space__template-query-panel">
              <div className="query-builder__data-space__template-query-panel__header">
                Curated Template Queries
              </div>
              {templateQueries.map((query) => (
                <div
                  key={query.title}
                  className="query-builder__data-space__template-query-panel__query"
                >
                  <TagIcon className="query-builder__data-space__template-query-panel__query__icon" />
                  <button
                    className="query-builder__data-space__template-query-panel__query__entry"
                    title="click to load template query"
                    onClick={() => loadQuery(query)}
                  >
                    <div className="query-builder__data-space__template-query-panel__query__entry__content">
                      <div className="query-builder__data-space__template-query-panel__query__entry__content__title">
                        {query.title}
                      </div>
                      {query.description && (
                        <div className="query-builder__data-space__template-query-panel__query__entry__content__description">
                          {query.description}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    className="query-builder__data-space__template-query-panel__query__share"
                    title="Share..."
                    onClick={() => shareTemplateQuery(query)}
                  >
                    <ShareIcon />
                    <div className="query-builder__data-space__template-query-panel__query__share__label">
                      Share
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </BasePopover>
        </div>
      </ClickAwayListener>
    );
  },
);

const DataSpaceQueryBuilderTemplateQueryPanel = observer(
  (props: { queryBuilderState: DataSpaceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const templateQueryButtonRef = useRef<HTMLButtonElement>(null);
    const templateQueries = queryBuilderState.dataSpace.executables?.filter(
      (e) => e instanceof DataSpaceExecutableTemplate,
    ) as DataSpaceExecutableTemplate[];

    const showTemplateQueries = (): void => {
      queryBuilderState.setTemplateQueryDialogOpen(true);
    };

    return (
      <PanelHeader className="query-builder__data-space__template-query">
        <div className="query-builder__data-space__template-query__title">
          <FilterIcon />
        </div>
        <button
          className="query-builder__data-space__template-query__btn"
          ref={templateQueryButtonRef}
          disabled={templateQueries.length <= 0}
          onClick={showTemplateQueries}
        >
          Template ( {templateQueries.length} )
        </button>
        {queryBuilderState.isTemplateQueryDialogOpen && (
          <DataSpaceTemplateQueryDialog
            triggerElement={templateQueryButtonRef.current}
            queryBuilderState={queryBuilderState}
            templateQueries={templateQueries}
          />
        )}
      </PanelHeader>
    );
  },
);

export const renderDataSpaceQueryBuilderTemplateQueryPanelContent = (
  queryBuilderState: DataSpaceQueryBuilderState,
): React.ReactNode => (
  <DataSpaceQueryBuilderTemplateQueryPanel
    queryBuilderState={queryBuilderState}
  />
);

export const queryDataSpace = async (
  dataSpace: DataSpace,
  editorStore: EditorStore,
): Promise<void> => {
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: () => {
        const sourceInfo = Object.assign(
          {},
          editorStore.editorMode.getSourceInfo(),
          {
            dataSpace: dataSpace.path,
          },
        );
        const queryBuilderState = new DataSpaceQueryBuilderState(
          editorStore.applicationStore,
          editorStore.graphManagerState,
          editorStore.depotServerClient,
          dataSpace,
          dataSpace.defaultExecutionContext,
          (dataSpaceInfo: DataSpaceInfo) => {
            queryBuilderState.dataSpace = guaranteeType(
              queryBuilderState.graphManagerState.graph.getElement(
                dataSpaceInfo.path,
              ),
              DataSpace,
            );
            queryBuilderState.setExecutionContext(
              queryBuilderState.dataSpace.defaultExecutionContext,
            );
            queryBuilderState.propagateExecutionContextChange(
              queryBuilderState.dataSpace.defaultExecutionContext,
            );
          },
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          editorStore.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        queryBuilderState.setExecutionContext(
          dataSpace.defaultExecutionContext,
        );
        queryBuilderState.propagateExecutionContextChange(
          dataSpace.defaultExecutionContext,
        );
        return queryBuilderState;
      },
      actionConfigs: [],
      disableCompile: true,
    }),
  );
};
