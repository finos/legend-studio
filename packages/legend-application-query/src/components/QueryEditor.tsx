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
  ArrowLeftIcon,
  ExternalLinkSquareIcon,
  PanelLoadingIndicator,
  RobotIcon,
  SaveIcon,
  BlankPanelContent,
  clsx,
  EmptyLightBulbIcon,
  LightBulbIcon,
} from '@finos/legend-art';
import { getQueryParameters } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams } from 'react-router';
import {
  type CreateQueryPathParams,
  type ExistingQueryEditorPathParams,
  type ServiceQueryEditorPathParams,
  type ServiceQueryEditorQueryParams,
  LEGEND_QUERY_ROUTE_PATTERN,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_PATH_PARAM_TOKEN,
  generateStudioProjectViewUrl,
} from '../stores/LegendQueryRouter.js';
import {
  type QueryEditorStore,
  CreateQueryEditorStore,
  ExistingQueryEditorStore,
  QueryExportState,
  ServiceQueryEditorStore,
} from '../stores/QueryEditorStore.js';
import { QueryBuilder } from './QueryBuilder.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  CreateQueryEditorStoreProvider,
  ExistingQueryEditorStoreProvider,
  ServiceQueryEditorStoreProvider,
  useQueryEditorStore,
} from './QueryEditorStoreProvider.js';
import {
  extractElementNameFromPath,
  type RawLambda,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';

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
  } else if (editorStore instanceof CreateQueryEditorStore) {
    return (
      <div className="query-editor__header__label query-editor__header__label--create-query">
        New Query
      </div>
    );
  } else if (editorStore instanceof ServiceQueryEditorStore) {
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

const QueryEditorHeaderContent = observer(() => {
  const editorStore = useQueryEditorStore();
  const applicationStore = useLegendQueryApplicationStore();
  const viewQueryProject = (): void => {
    const { groupId, artifactId, versionId } = editorStore.getProjectInfo();
    applicationStore.navigator.openNewWindow(
      generateStudioProjectViewUrl(
        applicationStore.config.studioUrl,
        groupId,
        artifactId,
        versionId,
        undefined,
      ),
    );
  };
  const toggleLightDarkTheme = (): void =>
    applicationStore.TEMPORARY__setIsLightThemeEnabled(
      !applicationStore.TEMPORARY__isLightThemeEnabled,
    );
  const saveQuery = (): void => {
    editorStore.queryBuilderState
      .saveQuery(async (lambda: RawLambda) => {
        editorStore.setExportState(
          new QueryExportState(
            editorStore,
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
          className="query-editor__header__action query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          title="View project"
          onClick={viewQueryProject}
        >
          <ExternalLinkSquareIcon />
        </button>
        <button
          className="query-editor__header__action query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          title="Toggle Light/Dark Theme"
          onClick={toggleLightDarkTheme}
        >
          {applicationStore.TEMPORARY__isLightThemeEnabled ? (
            <EmptyLightBulbIcon />
          ) : (
            <LightBulbIcon />
          )}
        </button>
        <button
          className="query-editor__header__action btn--dark"
          tabIndex={-1}
          onClick={saveQuery}
        >
          <div className="query-editor__header__action__icon">
            <SaveIcon />
            <QueryExport />
          </div>
          <div className="query-editor__header__action__label">Save</div>
        </button>
      </div>
    </div>
  );
});

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
    <DndProvider backend={HTML5Backend}>
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
          {!isLoadingEditor && <QueryEditorHeaderContent />}
        </div>
        <div className="query-editor__content">
          <PanelLoadingIndicator isLoading={isLoadingEditor} />
          {!isLoadingEditor && (
            <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
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
        </div>
      </div>
    </DndProvider>
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

export const ServiceQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const params = useParams<ServiceQueryEditorPathParams>();
  const gav = params[LEGEND_QUERY_PATH_PARAM_TOKEN.GAV];
  const servicePath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH];
  const executionKey = getQueryParameters<ServiceQueryEditorQueryParams>(
    applicationStore.navigator.getCurrentLocation(),
    true,
  )[LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY];

  return (
    <ServiceQueryEditorStoreProvider
      gav={gav}
      servicePath={servicePath}
      executionKey={executionKey}
    >
      <QueryEditor />
    </ServiceQueryEditorStoreProvider>
  );
});

export const CreateQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const params = useParams<CreateQueryPathParams>();
  const gav = params[LEGEND_QUERY_PATH_PARAM_TOKEN.GAV];
  const mappingPath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH];
  const runtimePath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH];
  const classPath = getQueryParameters<ServiceQueryEditorQueryParams>(
    applicationStore.navigator.getCurrentLocation(),
    true,
  )[LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY];

  return (
    <CreateQueryEditorStoreProvider
      gav={gav}
      mappingPath={mappingPath}
      runtimePath={runtimePath}
      classPath={classPath}
    >
      <QueryEditor />
    </CreateQueryEditorStoreProvider>
  );
});
