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

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import { useSDLCServerClient } from '@finos/legend-server-sdlc';
import {
  type ProjectOption,
  ActivityBarMenu,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
  buildProjectOption,
  getProjectOptionLabelFormatter,
} from '@finos/legend-application-studio';
import { QueryProductionizerStore } from '../../stores/studio/QueryProductionizerStore.js';
import { useDepotServerClient } from '@finos/legend-server-depot';
import type { QueryProductionizerPathParams } from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import { flowResult } from 'mobx';
import {
  type QueryOption,
  buildQueryOption,
} from '@finos/legend-query-builder';
import {
  CheckSquareIcon,
  clsx,
  CustomSelectorInput,
  Dialog,
  EyeIcon,
  FunctionIcon,
  GitBranchIcon,
  Modal,
  ModalTitle,
  Panel,
  PanelFullContent,
  PanelLoadingIndicator,
  RepoIcon,
  SquareIcon,
} from '@finos/legend-art';
import { type QueryInfo, useGraphManagerState } from '@finos/legend-graph';
import { generateGAVCoordinates } from '@finos/legend-storage';
import {
  DocumentationLink,
  EDITOR_LANGUAGE,
  TextInputEditor,
  useParams,
} from '@finos/legend-application';
import { DSL_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../stores/studio/DSL_Service_LegendStudioDocumentation.js';

const QueryProductionizerStoreContext = createContext<
  QueryProductionizerStore | undefined
>(undefined);

const QueryProductionizerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcServerClient = useSDLCServerClient();
  const depotServerClient = useDepotServerClient();
  const graphManagerState = useGraphManagerState();
  const store = useLocalObservable(
    () =>
      new QueryProductionizerStore(
        applicationStore,
        sdlcServerClient,
        depotServerClient,
        graphManagerState,
      ),
  );
  return (
    <QueryProductionizerStoreContext.Provider value={store}>
      {children}
    </QueryProductionizerStoreContext.Provider>
  );
};

const useQueryProductionizerStore = (): QueryProductionizerStore =>
  guaranteeNonNullable(
    useContext(QueryProductionizerStoreContext),
    `Can't find query productionizer store in context`,
  );

const withQueryProductionizerStore = (WrappedComponent: React.FC): React.FC =>
  function WithQueryProductionizerStore() {
    return (
      <QueryProductionizerStoreProvider>
        <WrappedComponent />
      </QueryProductionizerStoreProvider>
    );
  };

const QueryPreviewModal = observer((props: { queryInfo: QueryInfo }) => {
  const { queryInfo } = props;
  const productionizerStore = useQueryProductionizerStore();

  // life-cycles
  const onClose = (): void =>
    productionizerStore.setShowQueryPreviewModal(false);

  return (
    <Dialog
      open={productionizerStore.showQueryPreviewModal}
      onClose={onClose}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <Modal darkMode={true} className="search-modal">
        <ModalTitle title="Query Preview" />
        <Panel>
          <PanelFullContent>
            <div className="query-preview__field">
              <div className="query-preview__field__label">Project</div>
              <div className="query-preview__field__value">
                {generateGAVCoordinates(
                  queryInfo.groupId,
                  queryInfo.artifactId,
                  queryInfo.versionId,
                )}
              </div>
            </div>
            <div className="query-preview__field">
              <div className="query-preview__field__label">Mapping</div>
              <div className="query-preview__field__value">
                {queryInfo.mapping}
              </div>
            </div>
            <div className="query-preview__field">
              <div className="query-preview__field__label">Runtime</div>
              <div className="query-preview__field__value">
                {queryInfo.runtime}
              </div>
            </div>
            <div className="query-preview__code">
              <TextInputEditor
                inputValue={queryInfo.content}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
                hideGutter={true}
              />
            </div>
          </PanelFullContent>
        </Panel>
        <div className="search-modal__actions">
          <button className="btn btn--dark" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    </Dialog>
  );
});

const QueryProductionizerContent = observer(() => {
  const productionizerStore = useQueryProductionizerStore();
  const applicationStore = useLegendStudioApplicationStore();

  // queries
  const queryOptions = productionizerStore.queries.map(buildQueryOption);
  const selectedQueryOption = productionizerStore.currentQuery
    ? buildQueryOption(productionizerStore.currentQuery)
    : null;
  const onQueryOptionChange = (option: QueryOption | null): void => {
    if (option) {
      flowResult(productionizerStore.changeQuery(option.value)).catch(
        applicationStore.alertUnhandledError,
      );
    } else {
      productionizerStore.resetCurrentQuery();
    }
  };
  const previewCurrentQuery = (): void => {
    if (productionizerStore.currentQuery) {
      productionizerStore.setShowQueryPreviewModal(true);
    }
  };
  const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => (
    <div
      className="query-productionizer__query-option"
      title={`${option.label} - ${generateGAVCoordinates(
        option.value.groupId,
        option.value.artifactId,
        option.value.versionId,
      )}`}
    >
      <div className="query-productionizer__query-option__label">
        {option.label}
      </div>
      <div className="query-productionizer__query-option__gav">
        {option.value.groupId && option.value.artifactId
          ? generateGAVCoordinates(
              option.value.groupId,
              option.value.artifactId,
              option.value.versionId,
            )
          : null}
      </div>
      {option.value.id === productionizerStore.currentQuery?.id && (
        <>
          <button
            className="query-productionizer__query-option__preview-btn"
            tabIndex={-1}
            onClick={previewCurrentQuery}
            title="Preview query"
          >
            <EyeIcon />
          </button>
        </>
      )}
    </div>
  );

  // query search text
  const [querySearchText, setQuerySearchText] = useState('');
  const debouncedLoadServices = useMemo(
    () =>
      debounce((input: string): void => {
        flowResult(productionizerStore.loadQueries(input)).catch(
          applicationStore.alertUnhandledError,
        );
      }, 500),
    [applicationStore, productionizerStore],
  );
  const onServiceSearchTextChange = (value: string): void => {
    if (value !== querySearchText) {
      setQuerySearchText(value);
      debouncedLoadServices.cancel();
      debouncedLoadServices(value);
    }
  };

  // projects
  const projectOptions = productionizerStore.projects.map(buildProjectOption);
  const selectedProjectOption = productionizerStore.currentProject
    ? buildProjectOption(productionizerStore.currentProject)
    : null;
  const onProjectOptionChange = (option: ProjectOption | null): void => {
    if (option) {
      flowResult(productionizerStore.changeProject(option.value)).catch(
        applicationStore.alertUnhandledError,
      );
    } else {
      productionizerStore.resetCurrentProject();
    }
  };

  // project search text
  const [projectSearchText, setProjectSearchText] = useState('');
  const debouncedLoadProjects = useMemo(
    () =>
      debounce((input: string): void => {
        flowResult(productionizerStore.loadProjects(input)).catch(
          applicationStore.alertUnhandledError,
        );
      }, 500),
    [applicationStore, productionizerStore],
  );
  const onProjectSearchTextChange = (value: string): void => {
    if (value !== projectSearchText) {
      setProjectSearchText(value);
      debouncedLoadProjects.cancel();
      debouncedLoadProjects(value);
    }
  };

  // project configuration
  const toggleIsAutoConfigurationEnabled = (): void =>
    productionizerStore.setIsAutoConfigurationEnabled(
      !productionizerStore.isAutoConfigurationEnabled,
    );

  // workspace name
  const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => productionizerStore.setWorkspaceName(event.target.value);

  // service
  const onChangeServicePath: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => productionizerStore.setServicePath(event.target.value);

  const onChangeServicePattern: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => productionizerStore.setServicePattern(event.target.value);

  // actions
  const productionizeQuery = (): void => {
    productionizerStore
      .productionizeQuery()
      .catch(applicationStore.alertUnhandledError);
  };

  useEffect(() => {
    flowResult(productionizerStore.loadQueries('')).catch(
      applicationStore.alertUnhandledError,
    );
  }, [productionizerStore, applicationStore]);

  return (
    <div className="app__page">
      <div className="query-productionizer">
        <div className="query-productionizer__body">
          <div className="activity-bar">
            <ActivityBarMenu />
          </div>
          <div
            className="query-productionizer__content"
            data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
          >
            <div className="query-productionizer__content__main">
              <div className="query-productionizer__title">
                Productionize Query
                <DocumentationLink
                  className="query-productionizer__title__documentation"
                  documentationKey={
                    DSL_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_PRODUCTIONIZE_QUERY
                  }
                />
              </div>
              <div className="query-productionizer__group query-productionizer__group--workspace">
                <div className="query-productionizer__group__header">
                  workspace
                </div>
                <div className="query-productionizer__group__content">
                  <div className="query-productionizer__input">
                    <div
                      className="query-productionizer__input__icon"
                      title="query"
                    >
                      <FunctionIcon className="query-productionizer__input__icon--query" />
                    </div>
                    <CustomSelectorInput
                      className="query-productionizer__input__selector"
                      options={queryOptions}
                      isLoading={
                        productionizerStore.loadQueriesState.isInProgress
                      }
                      onInputChange={onServiceSearchTextChange}
                      inputValue={querySearchText}
                      value={selectedQueryOption}
                      onChange={onQueryOptionChange}
                      placeholder="Search for query..."
                      darkMode={true}
                      isClearable={true}
                      escapeClearsValue={true}
                      formatOptionLabel={formatQueryOptionLabel}
                    />
                    {productionizerStore.showQueryPreviewModal &&
                      productionizerStore.currentQueryInfo && (
                        <QueryPreviewModal
                          queryInfo={productionizerStore.currentQueryInfo}
                        />
                      )}
                  </div>
                  <div className="query-productionizer__input">
                    <div
                      className="query-productionizer__input__icon"
                      title="project"
                    >
                      <RepoIcon className="query-productionizer__input__icon--project" />
                    </div>
                    <CustomSelectorInput
                      className="query-productionizer__input__selector"
                      options={projectOptions}
                      disabled={
                        !productionizerStore.currentQuery ||
                        productionizerStore.loadProjectsState.isInProgress
                      }
                      isLoading={
                        productionizerStore.loadProjectsState.isInProgress
                      }
                      onInputChange={onProjectSearchTextChange}
                      inputValue={projectSearchText}
                      value={selectedProjectOption}
                      onChange={onProjectOptionChange}
                      placeholder="Search for project..."
                      darkMode={true}
                      isClearable={true}
                      escapeClearsValue={true}
                      formatOptionLabel={getProjectOptionLabelFormatter(
                        applicationStore,
                      )}
                    />
                  </div>
                  <div className="query-productionizer__input">
                    <div
                      className="query-productionizer__input__icon"
                      title="workspace"
                    >
                      <GitBranchIcon className="query-productionizer__input__icon--workspce" />
                    </div>
                    <div className="input-group query-productionizer__input__input">
                      <input
                        className={clsx(
                          'input input--dark input-group__input',
                          {
                            'input-group__input--error':
                              !productionizerStore.isWorkspaceNameValid,
                          },
                        )}
                        spellCheck={false}
                        value={productionizerStore.workspaceName}
                        placeholder="Enter a name for your workspace"
                        onChange={changeWorkspaceName}
                      />
                      {!productionizerStore.isWorkspaceNameValid && (
                        <div className="input-group__error-message">
                          Workspace already existed
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="query-productionizer__auto-configuration">
                    <div
                      className="query-productionizer__auto-configuration__toggler"
                      onClick={toggleIsAutoConfigurationEnabled}
                    >
                      <div className="panel__content__form__section__toggler">
                        <button
                          className={clsx(
                            'panel__content__form__section__toggler__btn',
                            {
                              'panel__content__form__section__toggler__btn--toggled':
                                productionizerStore.isAutoConfigurationEnabled,
                            },
                          )}
                          tabIndex={-1}
                        >
                          {productionizerStore.isAutoConfigurationEnabled ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="panel__content__form__section__toggler__prompt">
                          Auto-configure this workspace: we will attempt to
                          setup your workspace to have the sufficient and
                          appropriate metadata (dependencies, models, mappings,
                          runtimes, etc.) to work well with the specfied query
                        </div>
                      </div>
                    </div>
                    <div className="query-productionizer__auto-configuration__hint">
                      <DocumentationLink
                        documentationKey={
                          DSL_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHEN_TO_ENABLE_AUTO_CONFIGURATION_FOR_QUERY_PRODUCTIONIZATION
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="query-productionizer__group query-productionizer__group--service">
                <div className="query-productionizer__group__header">
                  service
                </div>
                <div className="query-productionizer__group__content">
                  <div className="query-productionizer__input">
                    <div className="query-productionizer__input__label">
                      Path
                    </div>
                    <div className="input-group query-productionizer__input__input">
                      <input
                        className={clsx(
                          'input input--dark input-group__input',
                          {
                            'input-group__input--error':
                              !productionizerStore.isServicePathValid,
                          },
                        )}
                        spellCheck={false}
                        placeholder="Enter the full path for your service (e.g. model::MyQueryService)"
                        value={productionizerStore.servicePath}
                        onChange={onChangeServicePath}
                      />
                      {!productionizerStore.isServicePathValid && (
                        <div className="input-group__error-message">
                          Invalid full path
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="query-productionizer__input">
                    <div className="query-productionizer__input__label">
                      URL
                    </div>
                    <div className="input-group query-productionizer__input__input">
                      <input
                        className={clsx(
                          'input input--dark input-group__input',
                          {
                            'input-group__input--error': Boolean(
                              !productionizerStore.isServiceUrlPatternValid,
                            ),
                          },
                        )}
                        spellCheck={false}
                        placeholder="/my-service-url"
                        value={productionizerStore.servicePattern}
                        onChange={onChangeServicePattern}
                      />
                      {!productionizerStore.isServiceUrlPatternValid && (
                        <div className="input-group__error-message">
                          URL pattern is not valid
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="query-productionizer__actions">
                <button
                  className="query-productionizer__next-btn btn--dark"
                  onClick={productionizeQuery}
                  disabled={
                    productionizerStore.productionizeState.isInProgress ||
                    !productionizerStore.currentQuery ||
                    !productionizerStore.currentQueryInfo ||
                    !productionizerStore.currentProject ||
                    !productionizerStore.workspaceName ||
                    !productionizerStore.servicePath ||
                    !productionizerStore.servicePattern ||
                    !productionizerStore.isWorkspaceNameValid ||
                    !productionizerStore.isServicePathValid ||
                    !productionizerStore.isServiceUrlPatternValid
                  }
                >
                  Productionize Query
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
          className="editor__status-bar"
        />
      </div>
    </div>
  );
});

export const QueryProductionizer = withQueryProductionizerStore(
  observer(() => {
    const params = useParams<QueryProductionizerPathParams>();
    const { queryId } = params;
    const productionizerStore = useQueryProductionizerStore();

    useEffect(() => {
      productionizerStore.initialize(queryId);
    }, [productionizerStore, queryId]);

    return (
      <div className="app__page">
        {!productionizerStore.initState.hasSucceeded && (
          <div className="app__page">
            <PanelLoadingIndicator isLoading={true} />
          </div>
        )}
        {productionizerStore.initState.hasSucceeded && (
          <QueryProductionizerContent />
        )}
      </div>
    );
  }),
);
