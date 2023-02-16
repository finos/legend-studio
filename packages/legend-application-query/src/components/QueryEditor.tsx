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
  type SelectComponent,
  Dialog,
  ExternalLinkSquareIcon,
  PanelLoadingIndicator,
  SaveIcon,
  BlankPanelContent,
  clsx,
  EmptyLightBulbIcon,
  LightBulbIcon,
  SearchIcon,
  TimesIcon,
  CheckSquareIcon,
  SquareIcon,
  ManageSearchIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
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
} from '@finos/legend-art';
import {
  debounce,
  getQueryParameters,
  getQueryParameterValue,
  sanitizeURL,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  type MappingQueryCreatorPathParams,
  type ExistingQueryEditorPathParams,
  type ServiceQueryCreatorPathParams,
  type ServiceQueryCreatorQueryParams,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_PATH_PARAM_TOKEN,
  generateExistingQueryEditorRoute,
  generateQuerySetupRoute,
} from '../stores/LegendQueryRouter.js';
import {
  type QueryEditorStore,
  ExistingQueryEditorStore,
  QueryExportState,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '../stores/QueryEditorStore.js';
import { useApplicationStore, useParams } from '@finos/legend-application';
import {
  MappingQueryCreatorStoreProvider,
  ExistingQueryEditorStoreProvider,
  ServiceQueryCreatorStoreProvider,
  useQueryEditorStore,
} from './QueryEditorStoreProvider.js';
import type { RawLambda } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import {
  QueryBuilder,
  QueryBuilderNavigationBlocker,
  type QueryBuilderState,
} from '@finos/legend-query-builder';

const QueryExportDialogContent = observer(
  (props: { exportState: QueryExportState }) => {
    const { exportState } = props;
    const applicationStore = useApplicationStore();
    const allowCreate = exportState.allowPersist;
    const allowSave = exportState.allowPersist && exportState.allowUpdate;
    const create = applicationStore.guardUnhandledError(() =>
      exportState.persistQuery(true),
    );
    const save = applicationStore.guardUnhandledError(() =>
      exportState.persistQuery(false),
    );

    // name
    const nameInputRef = useRef<HTMLInputElement>(null);
    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      exportState.setQueryName(event.target.value);

    useEffect(() => {
      nameInputRef.current?.focus();
    }, []);

    return (
      <>
        <ModalBody>
          <PanelLoadingIndicator
            isLoading={exportState.persistQueryState.isInProgress}
          />
          <input
            ref={nameInputRef}
            className="input input--dark"
            spellCheck={false}
            value={exportState.queryName}
            onChange={changeName}
          />
        </ModalBody>
        <ModalFooter>
          {allowSave && <ModalFooterButton text="Save" onClick={save} />}
          <button
            className="btn modal__footer__close-btn btn--dark"
            // TODO?: we should probably annotate here why,
            // when we disable this action
            disabled={!allowCreate}
            onClick={create}
          >
            Create
          </button>
        </ModalFooter>
      </>
    );
  },
);

const QueryExport = observer(() => {
  const editorStore = useQueryEditorStore();
  const exportState = editorStore.exportState;
  const close = (): void => editorStore.setExportState(undefined);

  return (
    <Dialog
      open={Boolean(exportState)}
      onClose={close}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper: 'editor-modal__content',
      }}
    >
      <Modal darkMode={true} className="query-export">
        <ModalHeader title="save query" />
        {exportState && <QueryExportDialogContent exportState={exportState} />}
      </Modal>
    </Dialog>
  );
});

const QueryLoader = observer(
  (props: {
    editorStore: QueryEditorStore;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { editorStore, queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const queryFinderRef = useRef<SelectComponent>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedQueryID, setSelectedQueryID] = useState('');
    const [isMineOnly, setIsMineOnly] = useState(false);
    const [searchText, setSearchText] = useState('');

    // search text
    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(editorStore.queryLoaderState.loadQueries(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, editorStore.queryLoaderState],
    );
    const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (event.target.value !== searchText) {
        setSearchText(event.target.value);
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(event.target.value);
      }
    };
    const clearQuerySearching = (): void => {
      setSearchText('');
      debouncedLoadQueries.cancel();
      debouncedLoadQueries('');
    };
    const toggleShowCurrentUserQueriesOnly = (): void => {
      editorStore.queryLoaderState.setShowCurrentUserQueriesOnly(
        !editorStore.queryLoaderState.showCurrentUserQueriesOnly,
      );
      setIsMineOnly(!isMineOnly);
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(searchText);
    };

    useEffect(() => {
      flowResult(editorStore.queryLoaderState.loadQueries('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, editorStore.queryLoaderState]);

    // actions
    const loadQuery = (): void => {
      if (selectedQueryID) {
        queryBuilderState.changeDetectionState.alertUnsavedChanges(() => {
          editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
          applicationStore.navigator.goToLocation(
            generateExistingQueryEditorRoute(selectedQueryID),
            { ignoreBlocking: true },
          );
        });
      }
    };

    // life-cycle
    const close = (): void => {
      editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
      editorStore.queryLoaderState.reset();
    };
    const onEnter = (): void => queryFinderRef.current?.focus();

    return (
      <Dialog
        open={editorStore.queryLoaderState.isQueryLoaderOpen}
        onClose={close}
        TransitionProps={{
          onEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Load Query" />
          <div className="query-editor__query-loader__filter-section">
            <div className="query-editor__query-loader__filter-section__section__toggler">
              <button
                className={clsx(
                  'query-editor__query-loader__filter-section__section__toggler__btn',
                  {
                    'query-editor__query-loader__filter-section__section__toggler__btn--toggled':
                      isMineOnly,
                  },
                )}
                onClick={toggleShowCurrentUserQueriesOnly}
                tabIndex={-1}
              >
                {isMineOnly ? <CheckSquareIcon /> : <SquareIcon />}
              </button>
              <div
                className="query-editor__query-loader__filter-section__section__toggler__prompt"
                onClick={toggleShowCurrentUserQueriesOnly}
              >
                Mine Only
              </div>
            </div>
          </div>
          <div className="query-editor__query-loader__search-section">
            <div className="query-editor__query-loader__search-section__input__container">
              <input
                ref={searchInputRef}
                className={clsx(
                  'query-editor__query-loader__search-section__input input--dark',
                  {
                    'query-editor__query-loader__search-section__input--searching':
                      searchText,
                  },
                )}
                onChange={onSearchTextChange}
                value={searchText}
                placeholder="Search a query by name"
              />
              {!searchText ? (
                <div className="query-editor__query-loader__search-section__input__search__icon">
                  <SearchIcon />
                </div>
              ) : (
                <>
                  <button
                    className="query-editor__query-loader__search-section__input__clear-btn"
                    tabIndex={-1}
                    onClick={clearQuerySearching}
                    title="Clear"
                  >
                    <TimesIcon />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="query-editor__query-loader__body">
            {editorStore.queryLoaderState.loadQueriesState.hasCompleted && (
              <>
                {editorStore.queryLoaderState.queries.length > 0 && (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="table__cell--left">Name</th>
                          <th className="table__cell--left">Author</th>
                          <th className="table__cell--left">Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editorStore.queryLoaderState.queries.map((query) => (
                          <tr
                            key={query.id}
                            className={clsx(
                              'query-editor__query-loader__body__table__row',
                              {
                                'query-editor__query-loader__body__table__row--selected':
                                  selectedQueryID === query.id,
                              },
                            )}
                            onClick={(event) => setSelectedQueryID(query.id)}
                          >
                            <td className="table__cell--left">{query.name}</td>
                            <td className="table__cell--left">
                              {query.owner ?? 'anonymous'}
                            </td>
                            <td className="table__cell--left">
                              {query.versionId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {editorStore.queryLoaderState.queries.length === 0 && (
                  <BlankPanelContent>No query available</BlankPanelContent>
                )}
              </>
            )}
            {!editorStore.queryLoaderState.loadQueriesState.hasCompleted && (
              <>
                <PanelLoadingIndicator
                  isLoading={
                    !editorStore.queryLoaderState.loadQueriesState.hasCompleted
                  }
                />
                <BlankPanelContent>Loading queries...</BlankPanelContent>
              </>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              onClick={loadQuery}
              disabled={selectedQueryID === ''}
            >
              Load Query
            </button>
            <button className="btn btn--dark" onClick={close}>
              Close
            </button>
          </div>
        </Modal>
      </Dialog>
    );
  },
);

const QueryEditorHeaderContent = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useQueryEditorStore();
    const applicationStore = useLegendQueryApplicationStore();

    // actions
    const openQueryLoader = (): void => {
      editorStore.queryLoaderState.setIsQueryLoaderOpen(true);
    };
    const viewProject = (): void => {
      const { groupId, artifactId, versionId } = editorStore.getProjectInfo();
      createViewProjectHandler(applicationStore)(
        groupId,
        artifactId,
        versionId,
        undefined,
      );
    };
    const viewSDLCProject = (): void => {
      const { groupId, artifactId } = editorStore.getProjectInfo();
      createViewSDLCProjectHandler(
        applicationStore,
        editorStore.depotServerClient,
      )(groupId, artifactId, undefined).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const toggleLightDarkMode = (): void =>
      applicationStore.TEMPORARY__setIsLightThemeEnabled(
        !applicationStore.TEMPORARY__isLightThemeEnabled,
      );
    const saveQuery = (): void => {
      queryBuilderState
        .saveQuery(async (lambda: RawLambda) => {
          editorStore.setExportState(
            new QueryExportState(
              editorStore,
              queryBuilderState,
              lambda,
              await editorStore.getExportConfiguration(lambda),
            ),
          );
        })
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="query-editor__header__content">
        <div className="query-editor__header__content__main" />
        <div className="query-editor__header__actions">
          {editorStore instanceof ExistingQueryEditorStore &&
            applicationStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                (plugin) =>
                  plugin.getExtraExistingQueryActionRendererConfiguration?.() ??
                  [],
              )
              .map((actionConfig) => (
                <Fragment key={actionConfig.key}>
                  {actionConfig.renderer(editorStore, queryBuilderState)}
                </Fragment>
              ))}
          <button
            className="query-editor__header__action btn--dark"
            tabIndex={-1}
            onClick={openQueryLoader}
            title="Load query..."
          >
            <ManageSearchIcon className="query-editor__header__action__icon--loader" />
          </button>
          {editorStore.queryLoaderState.isQueryLoaderOpen && (
            <QueryLoader
              editorStore={editorStore}
              queryBuilderState={queryBuilderState}
            />
          )}
          <div className="query-editor__header__action query-editor__header__action__view-project">
            <button
              className="query-editor__header__action__view-project__btn btn--dark"
              disabled={editorStore.isViewProjectActionDisabled}
              tabIndex={-1}
              title="View project"
              onClick={viewProject}
            >
              <ExternalLinkSquareIcon />
            </button>
            <DropdownMenu
              className="query-editor__header__action__view-project__dropdown-trigger btn--dark"
              disabled={editorStore.isViewProjectActionDisabled}
              content={
                <MenuContent>
                  <MenuContentItem
                    disabled={editorStore.isViewProjectActionDisabled}
                    onClick={viewSDLCProject}
                  >
                    View SDLC project
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <CaretDownIcon />
            </DropdownMenu>
          </div>
          {applicationStore.config.options.TEMPORARY__enableThemeSwitcher && (
            <button
              className="query-editor__header__action btn--dark"
              tabIndex={-1}
              title="Toggle light/dark mode"
              onClick={toggleLightDarkMode}
            >
              {applicationStore.TEMPORARY__isLightThemeEnabled ? (
                <EmptyLightBulbIcon />
              ) : (
                <LightBulbIcon />
              )}
            </button>
          )}
          <button
            className="query-editor__header__action btn--dark"
            tabIndex={-1}
            disabled={editorStore.isSaveActionDisabled}
            onClick={saveQuery}
            title="Save query"
          >
            <SaveIcon />
          </button>
          {editorStore.exportState && <QueryExport />}
        </div>
      </div>
    );
  },
);

export const QueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useQueryEditorStore();
  const isLoadingEditor = !editorStore.initState.hasCompleted;

  // documentation
  const appDocUrl = applicationStore.documentationService.url;
  const goToDocumentation = (): void => {
    if (appDocUrl) {
      applicationStore.navigator.visitAddress(appDocUrl);
    }
  };
  // go to setup page
  const goToQuerySetup = (): void =>
    applicationStore.navigator.visitAddress(
      applicationStore.navigator.generateAddress(generateQuerySetupRoute()),
    );
  // settings
  // NOTE: this is temporary until we find a better home for these settings in query builder
  const engineConfig =
    editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
  const toggleEngineClientRequestPayloadCompression = (): void =>
    engineConfig.setUseClientRequestPayloadCompression(
      !engineConfig.useClientRequestPayloadCompression,
    );

  useEffect(() => {
    flowResult(editorStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [editorStore, applicationStore]);

  useEffect(() => {
    document.body.classList.toggle(
      'light-theme',
      applicationStore.TEMPORARY__isLightThemeEnabled,
    );
  }, [applicationStore.TEMPORARY__isLightThemeEnabled]);

  return (
    <div
      className={clsx([
        'query-editor ',
        {
          'query-editor--light':
            applicationStore.TEMPORARY__isLightThemeEnabled,
        },
      ])}
    >
      <div className="query-editor__header">
        <div className="query-editor__header__menu">
          <DropdownMenu
            className="query-editor__header__menu-item"
            menuProps={{
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              elevation: 7,
            }}
            content={
              <MenuContent>
                {/* <MenuContentItem onClick={openHelp}>Help...</MenuContentItem> */}
                <MenuContentItem
                  disabled={!appDocUrl}
                  onClick={goToDocumentation}
                >
                  See Documentation
                </MenuContentItem>
                <MenuContentItem onClick={goToQuerySetup}>
                  Back to query setup
                </MenuContentItem>
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
              </MenuContent>
            }
          >
            <MenuIcon />
          </DropdownMenu>
        </div>
        {!isLoadingEditor && editorStore.queryBuilderState && (
          <QueryEditorHeaderContent
            queryBuilderState={editorStore.queryBuilderState}
          />
        )}
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
        {(isLoadingEditor || !editorStore.queryBuilderState) && (
          <BlankPanelContent>
            {editorStore.initState.message ??
              editorStore.graphManagerState.systemBuildState.message ??
              editorStore.graphManagerState.dependenciesBuildState.message ??
              editorStore.graphManagerState.generationsBuildState.message ??
              editorStore.graphManagerState.graphBuildState.message}
          </BlankPanelContent>
        )}
      </div>
    </div>
  );
});

export const ExistingQueryEditor = observer(() => {
  const params = useParams<ExistingQueryEditorPathParams>();
  const queryId = params[LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID];

  return (
    <ExistingQueryEditorStoreProvider queryId={queryId}>
      <QueryEditor />
    </ExistingQueryEditorStoreProvider>
  );
});

export const ServiceQueryCreator = observer(() => {
  const applicationStore = useApplicationStore();
  const params = useParams<ServiceQueryCreatorPathParams>();
  const gav = params[LEGEND_QUERY_PATH_PARAM_TOKEN.GAV];
  const servicePath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH];
  const executionKey = getQueryParameterValue(
    getQueryParameters<ServiceQueryCreatorQueryParams>(
      sanitizeURL(applicationStore.navigator.getCurrentAddress()),
      true,
    ),
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
  const gav = params[LEGEND_QUERY_PATH_PARAM_TOKEN.GAV];
  const mappingPath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH];
  const runtimePath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH];

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
