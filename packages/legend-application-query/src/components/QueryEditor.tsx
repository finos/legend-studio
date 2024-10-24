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
  Dialog,
  PanelLoadingIndicator,
  BlankPanelContent,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuIcon,
  MenuContentDivider,
  MenuContentItemIcon,
  CheckIcon,
  MenuContentItemLabel,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalFooterButton,
  ExclamationTriangleIcon,
  PanelListItem,
  clsx,
  ModalHeaderActions,
  TimesIcon,
  Panel,
  PanelFullContent,
  CustomSelectorInput,
  PencilIcon,
  MoonIcon,
  SunIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type MappingQueryCreatorPathParams,
  type ExistingQueryEditorPathParams,
  type ServiceQueryCreatorPathParams,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_ROUTE_PATTERN_TOKEN,
  generateQuerySetupRoute,
  generateExistingQueryEditorRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { ExistingQueryEditorStore } from '../stores/QueryEditorStore.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';
import { DataSpaceQuerySetupState } from './../stores/data-space/DataSpaceQuerySetupState.js';
import {
  LEGEND_APPLICATION_COLOR_THEME,
  ReleaseLogManager,
  ReleaseNotesManager,
  useApplicationStore,
} from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import {
  MappingQueryCreatorStoreProvider,
  ExistingQueryEditorStoreProvider,
  ServiceQueryCreatorStoreProvider,
  useQueryEditorStore,
} from './QueryEditorStoreProvider.js';
import { flowResult } from 'mobx';
import {
  QueryBuilder,
  QueryBuilderNavigationBlocker,
  QueryLoaderDialog,
  QueryBuilderDiffViewPanel,
  type QueryBuilderState,
} from '@finos/legend-query-builder';

import { generateGAVCoordinates } from '@finos/legend-storage';
import {
  type Query,
  QueryDataSpaceExecutionContext,
  QueryExplicitExecutionContext,
} from '@finos/legend-graph';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import { buildVersionOption, type VersionOption } from './QuerySetup.js';
import { QueryEditorExistingQueryVersionRevertModal } from './QueryEdtiorExistingQueryVersionRevertModal.js';
import {
  debounce,
  compareSemVerVersions,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { LegendQueryInfo } from './LegendQueryAppInfo.js';
import { QueryEditorDataspaceInfoModal } from './data-space/DataSpaceInfo.js';
import { DataSpaceQueryBuilderState } from '@finos/legend-extension-dsl-data-space/application';

const CreateQueryDialog = observer(() => {
  const editorStore = useQueryEditorStore();
  const createQueryState = editorStore.queryCreatorState;
  const close = (): void => createQueryState.close();
  const applicationStore = useApplicationStore();
  const create = (): void => {
    flowResult(createQueryState.createQuery()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const isExistingQueryName = createQueryState.editorStore.existingQueryName;
  const isEmptyName = !createQueryState.queryName;
  // name
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debouncedLoadQueries = useMemo(
    () =>
      debounce((input: string): void => {
        flowResult(
          createQueryState.editorStore.searchExistingQueryName(input),
        ).catch(applicationStore.alertUnhandledError);
      }, 500),
    [applicationStore, createQueryState.editorStore],
  );
  const setFocus = (): void => {
    nameInputRef.current?.focus();
  };

  const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    createQueryState.setQueryName(event.target.value);
  };

  useEffect(() => {
    setTimeout(() => setFocus(), 1);
  }, []);

  useEffect(() => {
    const searchText = createQueryState.queryName;
    debouncedLoadQueries.cancel();
    debouncedLoadQueries(searchText);
  }, [
    createQueryState.queryName,
    debouncedLoadQueries,
    createQueryState.editorStore.queryLoaderState.queries,
  ]);
  return (
    <Dialog
      open={createQueryState.showCreateModal}
      onClose={close}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper: 'editor-modal__content',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="query-export"
      >
        <ModalHeader title="Create New Query" />
        <ModalBody>
          <PanelLoadingIndicator
            isLoading={createQueryState.createQueryState.isInProgress}
          />
          <PanelListItem>
            <div className="input--with-validation">
              <input
                ref={nameInputRef}
                className={clsx('input input--dark', {
                  'input--caution': isExistingQueryName,
                })}
                spellCheck={false}
                value={createQueryState.queryName}
                onChange={changeName}
                title="New Query Name"
              />
              {isExistingQueryName && (
                <div
                  className="input--with-validation__caution"
                  title={`Query named '${isExistingQueryName}' already exists`}
                >
                  <ExclamationTriangleIcon className="input--with-validation__caution__indicator" />
                </div>
              )}
            </div>
          </PanelListItem>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Create Query"
            title="Create new query"
            disabled={
              createQueryState.editorStore.isPerformingBlockingAction ||
              Boolean(isExistingQueryName) ||
              isEmptyName
            }
            onClick={create}
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

const SaveQueryDialog = observer(
  (props: { existingEditorStore: ExistingQueryEditorStore }) => {
    const { existingEditorStore } = props;
    const updateState = existingEditorStore.updateState;
    const applicationStore = existingEditorStore.applicationStore;

    const saveQuery = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        flowResult(
          existingEditorStore.updateState.updateQuery(undefined, undefined),
        ).catch(applicationStore.alertUnhandledError);
      },
    );
    const close = (): void => updateState.closeSaveModal();

    return (
      <Dialog
        open={updateState.saveModal}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className={clsx('editor-modal query-builder-text-mode__modal')}
        >
          <ModalHeader>
            <ModalTitle title="Save Existing Query" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={close}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody>
            <PanelLoadingIndicator
              isLoading={updateState.updateQueryState.isInProgress}
            />
            {updateState.updateDiffState && (
              <QueryBuilderDiffViewPanel
                diffViewState={updateState.updateDiffState}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Save"
              title="Save (Will Overwrite Existing Query)"
              disabled={Boolean(existingEditorStore.isPerformingBlockingAction)}
              onClick={saveQuery}
            />
            <ModalFooterButton text="Close" onClick={close} type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryEditorExistingQueryHeader = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    existingEditorStore: ExistingQueryEditorStore;
  }) => {
    const { existingEditorStore } = props;
    const updateState = existingEditorStore.updateState;
    const isRenaming = updateState.queryRenamer;
    const applicationStore = existingEditorStore.applicationStore;
    const renameRef = useRef<HTMLInputElement>(null);
    const [queryRenameName, setQueryRenameName] = useState<string>(
      existingEditorStore.lightQuery.name,
    );

    const enableRename = (): void => {
      setQueryRenameName(existingEditorStore.lightQuery.name);
      existingEditorStore.updateState.setQueryRenamer(true);
    };
    const renameQuery = (val: string): void => {
      if (queryRenameName !== existingEditorStore.lightQuery.name) {
        flowResult(updateState.updateQuery(val, undefined)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const changeQueryName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setQueryRenameName(event.target.value);

    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(existingEditorStore.searchExistingQueryName(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore.alertUnhandledError, existingEditorStore],
    );

    useEffect(() => {
      if (isRenaming) {
        existingEditorStore.setExistingQueryName(undefined);
      }
      const searchText = queryRenameName;
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(searchText);
    }, [
      queryRenameName,
      debouncedLoadQueries,
      isRenaming,
      existingEditorStore,
    ]);

    const isExistingQueryName =
      existingEditorStore.existingQueryName &&
      queryRenameName !== existingEditorStore.lightQuery.name;

    return (
      <>
        {isRenaming ? (
          <div className="query-editor__header__content__main query-editor__header__content__title">
            <PanelListItem>
              <div className="input--with-validation">
                <input
                  ref={renameRef}
                  className={clsx(
                    'input input--dark query-editor__rename__input',
                    {
                      'input--caution': isExistingQueryName,
                    },
                  )}
                  onChange={changeQueryName}
                  onKeyDown={(event) => {
                    if (event.code === 'Enter') {
                      event.stopPropagation();
                      updateState.setQueryRenamer(false);
                      existingEditorStore.setExistingQueryName(undefined);
                      renameQuery(queryRenameName);
                    } else if (event.code === 'Escape') {
                      event.stopPropagation();
                      updateState.setQueryRenamer(false);
                      existingEditorStore.setExistingQueryName(undefined);
                    }
                  }}
                  value={queryRenameName}
                />
                {isExistingQueryName && (
                  <div
                    className="input--with-validation__caution"
                    title={`Query with name '${queryRenameName}' already exists`}
                  >
                    <ExclamationTriangleIcon className="input--with-validation__caution__indicator" />
                  </div>
                )}
              </div>
            </PanelListItem>
          </div>
        ) : (
          <div
            onDoubleClick={enableRename}
            className="query-editor__header__content__main query-editor__header__content__title"
            title="Double-click to rename query"
          >
            <div className="query-editor__header__content__title__text">
              {existingEditorStore.lightQuery.name}
            </div>
            <button
              className="query-editor__header__conten__title__btn panel__content__form__section__list__item__edit-btn"
              onClick={enableRename}
            >
              <PencilIcon />
            </button>
          </div>
        )}
        {existingEditorStore.updateState.saveModal && (
          <SaveQueryDialog existingEditorStore={existingEditorStore} />
        )}
      </>
    );
  },
);

const QueryEditorExistingQueryInfoModal = observer(
  (props: { existingEditorStore: ExistingQueryEditorStore; query: Query }) => {
    const { existingEditorStore, query } = props;
    const updateState = existingEditorStore.updateState;
    const applicationStore = existingEditorStore.applicationStore;
    const versionOptions = [
      LATEST_VERSION_ALIAS,
      ...updateState.projectVersions,
    ]
      .slice()
      .sort((v1, v2) => compareSemVerVersions(v2, v1))
      .map(buildVersionOption);
    const executionContext = query.executionContext;
    const updateQueryVersionId = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        flowResult(
          existingEditorStore.updateState.updateQuery(
            undefined,
            updateState.queryVersionId,
          ),
        )
          .then(() =>
            updateState.editorStore.applicationStore.navigationService.navigator.goToLocation(
              generateExistingQueryEditorRoute(query.id),
            ),
          )
          .catch(applicationStore.alertUnhandledError);
      },
    );
    const selectedVersionOption = updateState.queryVersionId
      ? buildVersionOption(updateState.queryVersionId)
      : buildVersionOption(query.versionId);
    const onVersionOptionChange = (option: VersionOption | null) => {
      if (option?.value && option.value !== updateState.queryVersionId) {
        updateState.setQueryVersionId(option.value);
      }
    };
    const closeModal = (): void => {
      updateState.setQueryVersionId(query.versionId);
      updateState.setShowQueryInfo(false);
    };
    useEffect(() => {
      flowResult(
        updateState.fetchProjectVersions(query.groupId, query.artifactId),
      ).catch(applicationStore.alertUnhandledError);
    }, [applicationStore, query.artifactId, query.groupId, updateState]);

    return (
      <Dialog
        open={updateState.showQueryInfo}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="search-modal"
        >
          <ModalTitle title="Query Info" />
          <Panel>
            <PanelFullContent>
              <div className="query-preview__field">
                <div className="query-preview__field__label">Project</div>
                <div className="query-preview__field__value">
                  {generateGAVCoordinates(
                    query.groupId,
                    query.artifactId,
                    undefined,
                  )}
                </div>
              </div>
              {executionContext instanceof QueryExplicitExecutionContext && (
                <>
                  <div className="query-preview__field">
                    <div className="query-preview__field__label">Mapping</div>
                    <div className="query-preview__field__value">
                      {executionContext.mapping.value.name}
                    </div>
                  </div>
                  <div className="query-preview__field">
                    <div className="query-preview__field__label">Runtime</div>
                    <div className="query-preview__field__value">
                      {executionContext.runtime.value.name}
                    </div>
                  </div>
                </>
              )}
              {executionContext instanceof QueryDataSpaceExecutionContext && (
                <>
                  <div className="query-preview__field">
                    <div className="query-preview__field__label">DataSpace</div>
                    <div className="query-preview__field__value">
                      {executionContext.dataSpacePath}
                    </div>
                  </div>
                  {executionContext.executionKey && (
                    <div className="query-preview__field">
                      <div className="query-preview__field__label">
                        Exec Key
                      </div>
                      <div className="query-preview__field__value">
                        {executionContext.executionKey}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="query-preview__field">
                <div className="query-preview__field__label">Version</div>
                <div className="query-preview__field__input">
                  <CustomSelectorInput
                    className="query-setup__wizard__selector"
                    options={versionOptions}
                    isLoading={
                      updateState.fetchProjectVersionState.isInProgress
                    }
                    onChange={onVersionOptionChange}
                    value={selectedVersionOption}
                    placeholder={
                      updateState.fetchProjectVersionState.isInProgress
                        ? 'Fetching project versions'
                        : 'Choose a version'
                    }
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </div>
              </div>
              {query.owner && (
                <div className="query-preview__field">
                  <div className="query-preview__field__label">Owner</div>
                  <div className="query-preview__field__value">
                    {query.owner}
                  </div>
                </div>
              )}
            </PanelFullContent>
          </Panel>
          <div className="query-preview__field__actions">
            <div className="query-preview__field__warning">
              {updateState.queryVersionId &&
                updateState.queryVersionId !== query.versionId && (
                  <>
                    <div className="query-preview__field__warning__icon">
                      <ExclamationTriangleIcon />
                    </div>
                    <div className="query-preview__field__warning__label">
                      Update action will reload query
                    </div>
                  </>
                )}
            </div>
            <div className="search-modal__actions">
              <ModalFooterButton
                text="Update"
                disabled={
                  !updateState.queryVersionId ||
                  updateState.queryVersionId === query.versionId
                }
                onClick={updateQueryVersionId}
              />
              <ModalFooterButton
                text="Close"
                onClick={closeModal}
                type="secondary"
              />
            </div>
          </div>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useQueryEditorStore();
  const isLoadingEditor = !editorStore.initState.hasCompleted;
  const isExistingQuery = editorStore instanceof ExistingQueryEditorStore;

  // documentation
  const appDocUrl = applicationStore.documentationService.url;
  const docLinks = applicationStore.documentationService.links;
  const goToDocumentation = (): void => {
    if (appDocUrl) {
      applicationStore.navigationService.navigator.visitAddress(appDocUrl);
    }
  };
  const goToDocLink = (url: string): void => {
    applicationStore.navigationService.navigator.visitAddress(url);
  };
  // go to setup page
  const goToQuerySetup = (): void =>
    applicationStore.navigationService.navigator.visitAddress(
      applicationStore.navigationService.navigator.generateAddress(
        generateQuerySetupRoute(),
      ),
    );
  // settings
  // NOTE: this is temporary until we find a better home for these settings in query builder
  const engineConfig =
    editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
  const toggleEngineClientRequestPayloadCompression = (): void =>
    engineConfig.setUseClientRequestPayloadCompression(
      !engineConfig.useClientRequestPayloadCompression,
    );

  const toggleEnableMinialGraphForDataSpaceLoadingPerformance = (): void => {
    editorStore.setEnableMinialGraphForDataSpaceLoadingPerformance(
      !editorStore.enableMinialGraphForDataSpaceLoadingPerformance,
    );
  };

  const TEMPORARY__toggleLightDarkMode = (): void => {
    applicationStore.layoutService.setColorTheme(
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        ? LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK
        : LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
      { persist: true },
    );
  };

  //open legend ai query chat
  const openQueryChat = (): void => {
    if (!editorStore.queryBuilderState?.isQueryChatOpened) {
      LegendQueryTelemetryHelper.logEvent_QueryChatOpened(
        applicationStore.telemetryService,
      );
      editorStore.queryBuilderState?.setIsQueryChatOpened(true);
    }
  };

  useEffect(() => {
    flowResult(editorStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
    applicationStore.releaseNotesService.updateViewedVersion();
  }, [
    editorStore,
    applicationStore,
    editorStore.enableMinialGraphForDataSpaceLoadingPerformance,
  ]);

  return (
    <div className="query-editor">
      <div className="query-editor__logo-header">
        <div className="query-editor__logo-header__combo">
          <div className="query-editor__logo-header__combo__menu">
            <ControlledDropdownMenu
              className="query-editor__logo-header__combo__menu-item"
              menuProps={{
                anchorOrigin: { vertical: 'top', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem onClick={goToQuerySetup}>
                    Back to query setup
                  </MenuContentItem>
                  <MenuContentItem
                    disabled={!appDocUrl}
                    onClick={goToDocumentation}
                  >
                    Documentation
                  </MenuContentItem>
                  {docLinks?.map((entry) => (
                    <MenuContentItem
                      key={entry.key}
                      onClick={(): void => goToDocLink(entry.url)}
                    >
                      {entry.label}
                    </MenuContentItem>
                  ))}
                  <MenuContentDivider />
                  <MenuContentItem disabled={true}>Settings</MenuContentItem>
                  <MenuContentItem
                    onClick={toggleEngineClientRequestPayloadCompression}
                  >
                    <MenuContentItemIcon>
                      {engineConfig.useClientRequestPayloadCompression ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Compress request payload
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={
                      toggleEnableMinialGraphForDataSpaceLoadingPerformance
                    }
                  >
                    <MenuContentItemIcon>
                      {editorStore.enableMinialGraphForDataSpaceLoadingPerformance ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Enable minimal graph
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MenuIcon />
            </ControlledDropdownMenu>
          </div>
          <div className="query-editor__logo-header__combo__name">
            Legend Query
          </div>
        </div>
        <div className="query-editor__header__action__content">
          {!isLoadingEditor &&
            !editorStore.queryBuilderState?.config
              ?.TEMPORARY__disableQueryBuilderChat &&
            (editorStore.queryBuilderState instanceof
              DataSpaceQueryBuilderState ||
              editorStore.queryBuilderState instanceof
                DataSpaceQuerySetupState) &&
            editorStore.queryBuilderState.canBuildQuery && (
              <button
                title="Open Query Chat."
                onClick={() => openQueryChat()}
                className="query-editor__header__action query-editor__header__action__theme-toggler"
              >
                <div
                  className={
                    applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                      ? 'query-editor__header__action__chat__label--light'
                      : 'query-editor__header__action__chat__label--dark'
                  }
                >
                  Legend AI
                </div>
              </button>
            )}
          <button
            title="Toggle light/dark mode"
            onClick={TEMPORARY__toggleLightDarkMode}
            className="query-editor__header__action query-editor__header__action__theme-toggler"
          >
            {applicationStore.layoutService
              .TEMPORARY__isLightColorThemeEnabled ? (
              <>
                <SunIcon className="query-editor__header__action__icon--bulb--light" />
              </>
            ) : (
              <>
                <MoonIcon className="query-editor__header__action__icon--bulb--dark" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="query-editor__content">
        <PanelLoadingIndicator isLoading={isLoadingEditor} />
        {!isLoadingEditor && editorStore.queryBuilderState && (
          <>
            <QueryBuilderNavigationBlocker
              queryBuilderState={editorStore.queryBuilderState}
            />
            <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
          </>
        )}
        {isLoadingEditor && (
          <BlankPanelContent>
            {editorStore.initState.message ??
              editorStore.graphManagerState.systemBuildState.message ??
              editorStore.graphManagerState.dependenciesBuildState.message ??
              editorStore.graphManagerState.generationsBuildState.message ??
              editorStore.graphManagerState.graphBuildState.message}
          </BlankPanelContent>
        )}
        {!isLoadingEditor &&
          !editorStore.queryBuilderState &&
          editorStore instanceof ExistingQueryEditorStore && (
            <QueryEditorExistingQueryVersionRevertModal
              existingEditorStore={editorStore}
            />
          )}
      </div>
      {editorStore.queryLoaderState.isQueryLoaderDialogOpen && (
        <QueryLoaderDialog
          queryLoaderState={editorStore.queryLoaderState}
          title="Select a Query to Load"
        />
      )}
      {editorStore.canPersistToSavedQuery &&
        editorStore.queryCreatorState.showCreateModal && <CreateQueryDialog />}
      {editorStore.showAppInfo && (
        <LegendQueryInfo
          open={editorStore.showAppInfo}
          closeModal={() => editorStore.setShowAppInfo(false)}
        />
      )}
      {editorStore.showDataspaceInfo &&
        editorStore.queryBuilderState instanceof DataSpaceQueryBuilderState && (
          <QueryEditorDataspaceInfoModal
            editorStore={editorStore}
            dataspace={editorStore.queryBuilderState.dataSpace}
            executionContext={editorStore.queryBuilderState.executionContext}
            open={editorStore.showDataspaceInfo}
            closeModal={() => editorStore.setShowDataspaceInfo(false)}
          />
        )}
      {isExistingQuery &&
        editorStore.updateState.showQueryInfo &&
        editorStore.query && (
          <QueryEditorExistingQueryInfoModal
            existingEditorStore={editorStore}
            query={editorStore.query}
          />
        )}
      <ReleaseLogManager />
      <ReleaseNotesManager />
    </div>
  );
});

const EXISTING_QUERY_PARAM_SUFFIX = 'p:';

const processQueryParams = (
  urlQuery: Record<string, string | undefined>,
): Record<string, string> | undefined => {
  const queryParamEntries = Array.from(Object.entries(urlQuery));
  if (queryParamEntries.length) {
    const paramValues: Record<string, string> = {};
    queryParamEntries.forEach(([key, queryValue]) => {
      if (queryValue && key.startsWith(EXISTING_QUERY_PARAM_SUFFIX)) {
        paramValues[key.slice(EXISTING_QUERY_PARAM_SUFFIX.length)] = queryValue;
      }
    });
    return Object.values(paramValues).length === 0 ? undefined : paramValues;
  }

  return undefined;
};

export const ExistingQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const params = useParams<ExistingQueryEditorPathParams>();
  const queryId = guaranteeNonNullable(
    params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID],
  );
  const queryParams =
    applicationStore.navigationService.navigator.getCurrentLocationParameters();
  const processed = processQueryParams(queryParams);
  useEffect(() => {
    // clear params
    if (processed && Object.keys(processed).length) {
      applicationStore.navigationService.navigator.updateCurrentLocation(
        generateExistingQueryEditorRoute(queryId),
      );
    }
  }, [applicationStore, queryId, processed]);

  return (
    <ExistingQueryEditorStoreProvider queryId={queryId} params={processed}>
      <QueryEditor />
    </ExistingQueryEditorStoreProvider>
  );
});

export const ServiceQueryCreator = observer(() => {
  const applicationStore = useApplicationStore();
  const parameters = useParams<ServiceQueryCreatorPathParams>();
  const gav = guaranteeNonNullable(
    parameters[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV],
  );
  const servicePath = guaranteeNonNullable(
    parameters[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH],
  );
  const executionKey =
    applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
      LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY,
    );

  return (
    <ServiceQueryCreatorStoreProvider
      gav={gav}
      servicePath={servicePath}
      executionKey={executionKey}
    >
      <QueryEditor />
    </ServiceQueryCreatorStoreProvider>
  );
});

export const MappingQueryCreator = observer(() => {
  const params = useParams<MappingQueryCreatorPathParams>();
  const gav = guaranteeNonNullable(
    params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV],
  );
  const mappingPath = guaranteeNonNullable(
    params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH],
  );
  const runtimePath = guaranteeNonNullable(
    params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH],
  );

  return (
    <MappingQueryCreatorStoreProvider
      gav={gav}
      mappingPath={mappingPath}
      runtimePath={runtimePath}
    >
      <QueryEditor />
    </MappingQueryCreatorStoreProvider>
  );
});
