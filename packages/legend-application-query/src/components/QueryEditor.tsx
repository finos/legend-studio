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
  ArrowLeftIcon,
  ExternalLinkSquareIcon,
  PanelLoadingIndicator,
  RobotIcon,
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
} from '@finos/legend-art';
import { debounce, getQueryParameters } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  type MappingQueryCreatorPathParams,
  type ExistingQueryEditorPathParams,
  type ServiceQueryCreatorPathParams,
  type ServiceQueryCreatorQueryParams,
  LEGEND_QUERY_ROUTE_PATTERN,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_PATH_PARAM_TOKEN,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  generateExistingQueryEditorRoute,
} from '../stores/LegendQueryRouter.js';
import {
  type QueryEditorStore,
  MappingQueryCreatorStore,
  ExistingQueryEditorStore,
  QueryExportState,
  ServiceQueryCreatorStore,
} from '../stores/QueryEditorStore.js';
import {
  type ApplicationStore,
  useApplicationStore,
} from '@finos/legend-application';
import {
  MappingQueryCreatorStoreProvider,
  ExistingQueryEditorStoreProvider,
  ServiceQueryCreatorStoreProvider,
  useQueryEditorStore,
} from './QueryEditorStoreProvider.js';
import {
  type RawLambda,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import type { LegendQueryApplicationConfig } from '../application/LegendQueryApplicationConfig.js';
import {
  QueryBuilder,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';

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
        <div className="modal__body">
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
        </div>
        <div className="modal__footer">
          {allowSave && (
            <button
              className="btn modal__footer__close-btn btn--dark"
              onClick={save}
            >
              Save
            </button>
          )}
          <button
            className="btn modal__footer__close-btn btn--dark"
            // TODO?: we should probably annotate here why,
            // when we disable this action
            disabled={!allowCreate}
            onClick={create}
          >
            Create
          </button>
        </div>
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
      <div className="modal modal--dark query-export">
        <div className="modal__header">
          <div className="modal__title">Save Query</div>
        </div>
        {exportState && <QueryExportDialogContent exportState={exportState} />}
      </div>
    </Dialog>
  );
});

const renderQueryEditorHeaderLabel = (
  editorStore: QueryEditorStore,
): React.ReactNode => {
  if (editorStore instanceof ExistingQueryEditorStore) {
    return (
      <div className="query-editor__header__label query-editor__header__label--existing-query">
        {editorStore.query.name}
      </div>
    );
  } else if (editorStore instanceof MappingQueryCreatorStore) {
    return (
      <div className="query-editor__header__label query-editor__header__label--create-query">
        New Query
      </div>
    );
  } else if (editorStore instanceof ServiceQueryCreatorStore) {
    return (
      <div className="query-editor__header__label query-editor__header__label--service-query">
        <RobotIcon className="query-editor__header__label__icon" />
        {extractElementNameFromPath(editorStore.servicePath)}
        {editorStore.executionKey && (
          <div className="query-editor__header__label__tag">
            {editorStore.executionKey}
          </div>
        )}
      </div>
    );
  }
  const extraQueryEditorHeaderLabelers = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraQueryEditorHeaderLabelers?.() ?? []);
  for (const labeler of extraQueryEditorHeaderLabelers) {
    const label = labeler(editorStore);
    if (label) {
      return label;
    }
  }
  return null;
};

const QueryLoader = observer(
  (props: {
    editorStore: QueryEditorStore;
    applicationStore: ApplicationStore<
      LegendQueryApplicationConfig,
      LegendQueryPluginManager
    >;
  }) => {
    const { editorStore, applicationStore } = props;
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
        editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
        applicationStore.navigator.jumpTo(
          applicationStore.navigator.generateLocation(
            generateExistingQueryEditorRoute(selectedQueryID),
          ),
        );
      }
    };

    // life-cycle
    const close = (): void => {
      editorStore.queryLoaderState.setIsQueryLoaderOpen(false);
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
        <div className="modal modal--dark search-modal">
          <div className="modal__title">Load Query</div>
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
        </div>
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
    const viewQueryProject = (): void => {
      const { groupId, artifactId, versionId } = editorStore.getProjectInfo();
      applicationStore.navigator.openNewWindow(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
          applicationStore.config.studioUrl,
          groupId,
          artifactId,
          versionId,
          undefined,
        ),
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
        <div className="query-editor__header__content__main">
          {renderQueryEditorHeaderLabel(editorStore)}
        </div>
        <div className="query-editor__header__actions">
          <button
            className="query-editor__header__action btn--dark"
            tabIndex={-1}
            onClick={openQueryLoader}
            title="Load query"
          >
            <ManageSearchIcon className="query-editor__header__action__icon--loader" />
          </button>
          {editorStore.queryLoaderState.isQueryLoaderOpen && (
            <QueryLoader
              editorStore={editorStore}
              applicationStore={applicationStore}
            />
          )}
          <button
            className="query-editor__header__action btn--dark"
            tabIndex={-1}
            title="View project"
            onClick={viewQueryProject}
          >
            <ExternalLinkSquareIcon />
          </button>
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
  const backToMainMenu = (): void =>
    applicationStore.navigator.goTo(LEGEND_QUERY_ROUTE_PATTERN.SETUP);

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
        <button
          className="query-editor__header__back-btn btn--dark"
          onClick={backToMainMenu}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        {!isLoadingEditor && editorStore.queryBuilderState && (
          <QueryEditorHeaderContent
            queryBuilderState={editorStore.queryBuilderState}
          />
        )}
      </div>
      <div className="query-editor__content">
        <PanelLoadingIndicator isLoading={isLoadingEditor} />
        {!isLoadingEditor && editorStore.queryBuilderState && (
          <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
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
  const executionKey = getQueryParameters<ServiceQueryCreatorQueryParams>(
    applicationStore.navigator.getCurrentLocation(),
    true,
  )[LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY];

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
