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
  ModalFooterButton,
  ManageSearchIcon,
  LightBulbIcon,
  EmptyLightBulbIcon,
  SaveCurrIcon,
  SaveAsIcon,
  ExclamationTriangleIcon,
  PanelListItem,
  Button,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import {
  type MappingQueryCreatorPathParams,
  type ExistingQueryEditorPathParams,
  type ServiceQueryCreatorPathParams,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_ROUTE_PATTERN_TOKEN,
  generateQuerySetupRoute,
} from '../__lib__/LegendQueryNavigation.js';
import {
  QuerySaveAsState,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
  QuerySaveState,
  QueryRenameState,
} from '../stores/QueryEditorStore.js';
import {
  LEGEND_APPLICATION_COLOR_THEME,
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
import { useLegendQueryApplicationStore } from './LegendQueryFrameworkProvider.js';
import {
  QueryBuilder,
  QueryBuilderNavigationBlocker,
  QueryLoaderDialog,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { QUERY_DOCUMENTATION_KEY } from '../application/LegendQueryDocumentation.js';
import { debounce } from '@finos/legend-shared';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';

const QuerySaveAsDialogContent = observer(
  (props: { saveAsState: QuerySaveAsState }) => {
    const { saveAsState } = props;
    const applicationStore = useApplicationStore();
    const create = (): void => {
      flowResult(saveAsState.createQuery(true)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const isExistingQueryName = saveAsState.editorStore.existingQueryName;

    // name
    const nameInputRef = useRef<HTMLInputElement>(null);

    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(
            saveAsState.editorStore.searchExistingQueryName(input),
          ).catch(applicationStore.alertUnhandledError);
        }, 500),
      [applicationStore, saveAsState.editorStore],
    );

    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      saveAsState.setQueryName(event.target.value);
    };

    useEffect(() => {
      nameInputRef.current?.focus();
    }, []);

    useEffect(() => {
      const searchText = saveAsState.queryName;
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(searchText);
    }, [
      saveAsState.queryName,
      debouncedLoadQueries,
      saveAsState.editorStore.queryLoaderState.queries,
    ]);

    return (
      <>
        <ModalBody>
          <PanelLoadingIndicator
            isLoading={saveAsState.createQueryState.isInProgress}
          />
          <PanelListItem>
            <div className="input--with-validation">
              <input
                ref={nameInputRef}
                className={clsx('input input--dark', {
                  'input--caution': isExistingQueryName,
                })}
                spellCheck={false}
                value={saveAsState.queryName}
                onChange={changeName}
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
            title={
              !saveAsState.allowPersist
                ? `Cannot create new query`
                : 'Create new query'
            }
            onClick={create}
          />
        </ModalFooter>
      </>
    );
  },
);

const QuerySaveDialog = observer(() => {
  const editorStore = useQueryEditorStore();
  const saveAsState = editorStore.saveAsState;
  const close = (): void => editorStore.setSaveAsState(undefined);

  return (
    <Dialog
      open={Boolean(saveAsState)}
      onClose={close}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper: 'editor-modal__content',
      }}
    >
      <Modal darkMode={true} className="query-export">
        <ModalHeader title="Create New Query" />
        {saveAsState && <QuerySaveAsDialogContent saveAsState={saveAsState} />}
      </Modal>
    </Dialog>
  );
});

const QueryEditorHeaderContent = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useQueryEditorStore();
    const renameState = editorStore.renameState;
    const applicationStore = useLegendQueryApplicationStore();

    // actions
    const openQueryLoader = (): void => {
      editorStore.queryLoaderState.setQueryLoaderDialogOpen(true);
    };
    const viewProject = (): void => {
      LegendQueryTelemetryHelper.logEvent_QueryViewProjectLaunched(
        editorStore.applicationStore.telemetryService,
      );
      const { groupId, artifactId, versionId } = editorStore.getProjectInfo();
      createViewProjectHandler(applicationStore)(
        groupId,
        artifactId,
        versionId,
        undefined,
      );
    };
    const viewSDLCProject = (): void => {
      LegendQueryTelemetryHelper.logEvent_QueryViewSdlcProjectLaunched(
        editorStore.applicationStore.telemetryService,
      );
      const { groupId, artifactId } = editorStore.getProjectInfo();
      createViewSDLCProjectHandler(
        applicationStore,
        editorStore.depotServerClient,
      )(groupId, artifactId, undefined).catch(
        applicationStore.alertUnhandledError,
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

    const renameRef = useRef<HTMLInputElement>(null);

    const updateQuery = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        try {
          const lambda = queryBuilderState.buildQuery();
          editorStore.setRenameState(
            new QueryRenameState(
              editorStore,
              queryBuilderState,
              lambda,
              await editorStore.getPersistConfiguration(lambda, {
                update: true,
              }),
            ),
          );
          renameRef.current?.select();
        } catch {
          // do nothing
        }
      },
    );

    const saveQuery = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        try {
          const lambda = queryBuilderState.buildQuery();
          editorStore.setSaveState(
            new QuerySaveState(
              editorStore,
              queryBuilderState,
              lambda,
              await editorStore.getPersistConfiguration(lambda, {
                update: true,
              }),
            ),
          );
          await flowResult(editorStore.saveState?.saveQuery()).catch(
            applicationStore.alertUnhandledError,
          );
        } catch {
          // do nothing
        }
      },
    );

    const saveAsQuery = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        try {
          const lambda = queryBuilderState.buildQuery();
          editorStore.setSaveAsState(
            new QuerySaveAsState(
              editorStore,
              queryBuilderState,
              lambda,
              await editorStore.getPersistConfiguration(lambda, {
                update: true,
              }),
            ),
          );
        } catch {
          // do nothing
        }
      },
    );

    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();

    const queryDocEntry = applicationStore.documentationService.getDocEntry(
      QUERY_DOCUMENTATION_KEY.TUTORIAL_QUERY_BUILDER,
    );

    const openQueryTutorial = (): void => {
      if (queryDocEntry?.url) {
        applicationStore.navigationService.navigator.visitAddress(
          queryDocEntry.url,
        );
      }
    };

    const renameQuery = (): void => {
      if (renameState) {
        flowResult(renameState.renameQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const changeQueryName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => renameState?.setQueryName(event.target.value);

    const onEnter: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.code === 'Enter') {
        renameQuery();
      }
    };

    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(
            renameState?.editorStore.searchExistingQueryName(input),
          ).catch(applicationStore.alertUnhandledError);
        }, 500),
      [applicationStore, renameState?.editorStore],
    );

    useEffect(() => {
      if (renameState && renameState.queryName !== editorStore.title) {
        const searchText = renameState.queryName;
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(searchText);
      }
    }, [
      renameState,
      debouncedLoadQueries,
      editorStore.title,
      renameState?.queryName,
    ]);

    const isExistingQueryName = renameState?.editorStore.existingQueryName;

    const extraHelpMenuContentItems = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraQueryEditorHelpMenuActionConfigurations?.() ?? [],
      )
      .map((item) => (
        <MenuContentItem
          key={item.key}
          title={item.title ?? ''}
          onClick={item.onClick}
        >
          {item.icon && <MenuContentItemIcon>{item.icon}</MenuContentItemIcon>}
          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
            {item.label}
          </MenuContentItemLabel>
        </MenuContentItem>
      ));

    return (
      <div className="query-editor__header__content">
        {renameState ? (
          <div className="query-editor__header__content__main query-editor__header__content__title">
            <PanelListItem>
              <div className="input--with-validation">
                <input
                  title="Query title rename"
                  ref={renameRef}
                  className={clsx('input input--dark', {
                    'input--caution': isExistingQueryName,
                  })}
                  onChange={changeQueryName}
                  onKeyDown={onEnter}
                  value={renameState.queryName}
                  placeholder="Search"
                />
                {isExistingQueryName && (
                  <div
                    className="input--with-validation__caution"
                    title={`Query with name '${isExistingQueryName}' already exists`}
                  >
                    <ExclamationTriangleIcon className="input--with-validation__caution__indicator" />
                  </div>
                )}
              </div>
              <button
                className={clsx('input__btn', {
                  'btn--icon__caution': isExistingQueryName,
                })}
                onClick={renameQuery}
                title="Rename Query"
              >
                <CheckIcon />
              </button>
            </PanelListItem>
          </div>
        ) : (
          <div
            className="query-editor__header__content__main query-editor__header__content__title"
            title="Query title"
          >
            {editorStore.title}
          </div>
        )}

        <div className="query-editor__header__actions">
          {applicationStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                plugin.getExtraQueryEditorActionConfigurations?.(editorStore) ??
                [],
            )
            .map((actionConfig) => (
              <Fragment key={actionConfig.key}>
                {actionConfig.renderer(editorStore, queryBuilderState)}
              </Fragment>
            ))}

          <Button
            className="query-editor__header__action btn--dark"
            onClick={openQueryLoader}
            title="Load query..."
          >
            <ManageSearchIcon className="query-editor__header__action__icon--load" />
            <div className="query-editor__header__action__label">
              Load Query
            </div>
          </Button>

          <Button
            className="query-editor__header__action btn--dark"
            disabled={
              editorStore.isSaveActionDisabled ||
              !editorStore.title ||
              Boolean(editorStore.saveState?.saveQueryState.isInProgress)
            }
            onClick={saveQuery}
            title="Save query"
          >
            <SaveCurrIcon />
            <div className="query-editor__header__action__label">Save</div>
          </Button>
          <Button
            className="query-editor__header__action btn--dark"
            disabled={
              editorStore.isSaveActionDisabled ||
              Boolean(editorStore.saveAsState?.createQueryState.isInProgress)
            }
            onClick={saveAsQuery}
            title="Save as new query"
          >
            <SaveAsIcon />
            <div className="query-editor__header__action__label">
              Save As...
            </div>
          </Button>

          <DropdownMenu
            className="query-editor__header__action btn--dark"
            disabled={editorStore.isViewProjectActionDisabled}
            content={
              <MenuContent>
                {extraHelpMenuContentItems}
                {queryDocEntry && (
                  <MenuContentItem onClick={openQueryTutorial}>
                    <MenuContentItemIcon>{null}</MenuContentItemIcon>
                    <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                      Open Documentation
                    </MenuContentItemLabel>
                  </MenuContentItem>
                )}

                <MenuContentItem onClick={toggleAssistant}>
                  <MenuContentItemIcon>
                    {!applicationStore.assistantService.isHidden ? (
                      <CheckIcon />
                    ) : null}
                  </MenuContentItemIcon>
                  <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                    Show Virtual Assistant
                  </MenuContentItemLabel>
                </MenuContentItem>
              </MenuContent>
            }
          >
            <div
              className="query-editor__header__action__label"
              title="See more options"
            >
              Help...
            </div>
            <CaretDownIcon className="query-editor__header__action__dropdown-trigger" />
          </DropdownMenu>
          {editorStore.queryLoaderState.isQueryLoaderDialogOpen && (
            <QueryLoaderDialog
              queryLoaderState={editorStore.queryLoaderState}
              title="Load query"
            />
          )}
          <button
            title="Toggle light/dark mode"
            onClick={TEMPORARY__toggleLightDarkMode}
            className="query-editor__header__action"
          >
            {applicationStore.layoutService
              .TEMPORARY__isLightColorThemeEnabled ? (
              <>
                <LightBulbIcon className="query-editor__header__action__icon--bulb--light" />
              </>
            ) : (
              <>
                <EmptyLightBulbIcon className="query-editor__header__action__icon--bulb--dark" />
              </>
            )}
          </button>

          <DropdownMenu
            className="query-editor__header__action btn--medium"
            disabled={editorStore.isViewProjectActionDisabled}
            content={
              <MenuContent>
                <MenuContentItem
                  className="query-editor__header__action__options"
                  disabled={editorStore.isViewProjectActionDisabled}
                  onClick={viewProject}
                >
                  Go to Project
                </MenuContentItem>
                <MenuContentItem
                  className="query-editor__header__action__options"
                  disabled={editorStore.isViewProjectActionDisabled}
                  onClick={viewSDLCProject}
                >
                  Go to SDLC project
                </MenuContentItem>
                <MenuContentItem
                  className="query-editor__header__action__options"
                  onClick={updateQuery}
                  disabled={!editorStore.title}
                >
                  Rename Query
                </MenuContentItem>
              </MenuContent>
            }
          >
            <div
              className="query-editor__header__action__label"
              title="See more options"
            >
              More Actions...
            </div>
            <CaretDownIcon className="query-editor__header__action__dropdown-trigger" />
          </DropdownMenu>

          {editorStore.saveAsState && <QuerySaveDialog />}
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
      applicationStore.navigationService.navigator.visitAddress(appDocUrl);
    }
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

  useEffect(() => {
    flowResult(editorStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [editorStore, applicationStore]);

  return (
    <div className="query-editor">
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
                <MenuContentItem onClick={goToQuerySetup}>
                  Back to query setup
                </MenuContentItem>
                <MenuContentItem
                  disabled={!appDocUrl}
                  onClick={goToDocumentation}
                >
                  See Documentation
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
  const queryId = params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID];

  return (
    <ExistingQueryEditorStoreProvider queryId={queryId}>
      <QueryEditor />
    </ExistingQueryEditorStoreProvider>
  );
});

export const ServiceQueryCreator = observer(() => {
  const applicationStore = useApplicationStore();
  const parameters = useParams<ServiceQueryCreatorPathParams>();
  const gav = parameters[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV];
  const servicePath = parameters[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH];
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
  const gav = params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV];
  const mappingPath = params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH];
  const runtimePath = params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH];

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
