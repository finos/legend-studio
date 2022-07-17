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
  clsx,
  Dialog,
  ArrowLeftIcon,
  ExternalLinkSquareIcon,
  PanelLoadingIndicator,
  RobotIcon,
  SaveIcon,
  BlankPanelContent,
} from '@finos/legend-art';
import { getQueryParameters } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams } from 'react-router';
import {
  type CreateQueryPathParams,
  type ExistingQueryPathParams,
  type ServiceQueryPathParams,
  type ServiceQueryQueryParams,
  LEGEND_QUERY_ROUTE_PATTERN,
  generateCreateQueryRoute,
} from '../stores/LegendQueryRouter.js';
import {
  type QueryExportState,
  ExistingQueryInfoState,
  ServiceQueryInfoState,
  CreateQueryInfoState,
} from '../stores/QueryEditorStore.js';
import { QueryBuilder } from './QueryBuilder.js';
import { RuntimePointer } from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  QueryEditorStoreProvider,
  useQueryEditorStore,
} from './QueryEditorStoreProvider.js';

const QueryExportInner = observer(
  (props: { queryExportState: QueryExportState }) => {
    const { queryExportState } = props;
    const applicationStore = useApplicationStore();
    const allowCreate = queryExportState.allowPersist;
    const allowSave =
      queryExportState.allowPersist && queryExportState.allowUpdate;
    const create = applicationStore.guardUnhandledError(() =>
      queryExportState.persistQuery(true),
    );
    const save = applicationStore.guardUnhandledError(() =>
      queryExportState.persistQuery(false),
    );

    // name
    const nameInputRef = useRef<HTMLInputElement>(null);
    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      queryExportState.setQueryName(event.target.value);

    useEffect(() => {
      nameInputRef.current?.focus();
    }, []);

    return (
      <>
        <div className="modal__body">
          <PanelLoadingIndicator
            isLoading={queryExportState.persistQueryState.isInProgress}
          />
          <input
            ref={nameInputRef}
            className="input input--dark"
            spellCheck={false}
            value={queryExportState.queryName}
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
  const queryExportState = editorStore.queryExportState;
  const close = (): void => editorStore.setQueryExportState(undefined);

  return (
    <Dialog
      open={Boolean(queryExportState)}
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
        {queryExportState && (
          <QueryExportInner queryExportState={queryExportState} />
        )}
      </div>
    </Dialog>
  );
});

const QueryEditorHeader = observer(() => {
  const editorStore = useQueryEditorStore();
  const queryInfoState = editorStore.queryInfoState;
  const applicationStore = useApplicationStore();
  const backToMainMenu = (): void =>
    applicationStore.navigator.goTo(LEGEND_QUERY_ROUTE_PATTERN.SETUP);
  const viewQueryProject = (): void => {
    if (queryInfoState) {
      const queryProjectInfo = queryInfoState.getQueryProjectInfo();
      editorStore.viewStudioProject(
        queryProjectInfo.groupId,
        queryProjectInfo.artifactId,
        queryProjectInfo.versionId,
        undefined,
      );
    }
  };
  const saveQuery = (): void => {
    if (editorStore.onSaveQuery) {
      editorStore.queryBuilderState
        .saveQuery(editorStore.onSaveQuery)
        .catch(applicationStore.alertUnhandledError);
    }
  };

  return (
    <div className="query-editor__header">
      <button
        className="query-editor__header__back-btn btn--dark"
        onClick={backToMainMenu}
        title="Back to Main Menu"
      >
        <ArrowLeftIcon />
      </button>
      <div className="query-editor__header__content">
        <div
          className={clsx('query-editor__header__label', {
            'query-editor__header__label--existing-query':
              queryInfoState instanceof ExistingQueryInfoState,
            'query-editor__header__label--create-query':
              queryInfoState instanceof CreateQueryInfoState,
            'query-editor__header__label--service-query':
              queryInfoState instanceof ServiceQueryInfoState,
          })}
        >
          {queryInfoState instanceof CreateQueryInfoState && <>New Query</>}
          {queryInfoState instanceof ServiceQueryInfoState && (
            <>
              <RobotIcon className="query-editor__header__label__icon" />
              {queryInfoState.service.name}
            </>
          )}
          {queryInfoState instanceof ExistingQueryInfoState && (
            <>{queryInfoState.query.name}</>
          )}
        </div>
        <div className="query-editor__header__actions">
          <button
            className="query-editor__header__action query-editor__header__action--simple btn--dark"
            tabIndex={-1}
            title="View project"
            onClick={viewQueryProject}
            disabled={!queryInfoState}
          >
            <ExternalLinkSquareIcon />
          </button>
          <button
            className="query-editor__header__action btn--dark"
            tabIndex={-1}
            onClick={saveQuery}
            disabled={!editorStore.onSaveQuery}
          >
            <div className="query-editor__header__action__icon">
              <SaveIcon />
            </div>
            <div className="query-editor__header__action__label">Save</div>
          </button>
        </div>
      </div>
    </div>
  );
});

const QueryEditorInner = observer(() => {
  const editorStore = useQueryEditorStore();
  const isLoadingEditor =
    !editorStore.graphManagerState.graphBuildState.hasCompleted ||
    !editorStore.initState.hasCompleted ||
    !editorStore.editorInitState.hasCompleted;
  console.log(
    isLoadingEditor,
    editorStore.graphManagerState.graphBuildState.hasCompleted,
    editorStore.initState.hasCompleted,
    editorStore.editorInitState.hasCompleted,
  );

  return (
    <div className="query-editor">
      <QueryExport />
      <QueryEditorHeader />
      <div className="query-editor__content">
        <PanelLoadingIndicator isLoading={isLoadingEditor} />
        {!isLoadingEditor && (
          <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
        )}
        {isLoadingEditor && (
          <BlankPanelContent>
            {editorStore.buildGraphState.message ??
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

const QueryEditor: React.FC = () => (
  <DndProvider backend={HTML5Backend}>
    <QueryEditorInner />
  </DndProvider>
);

const ExistingQueryLoaderInner = observer(() => {
  const editorStore = useQueryEditorStore();
  const params = useParams<ExistingQueryPathParams>();

  useEffect(() => {
    editorStore.setupExistingQueryInfoState(params);
  }, [editorStore, params]);

  return <QueryEditor />;
});

export const ExistingQueryLoader: React.FC = () => (
  <QueryEditorStoreProvider>
    <ExistingQueryLoaderInner />
  </QueryEditorStoreProvider>
);

const ServiceQueryLoaderInner = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useQueryEditorStore();
  const params = useParams<ServiceQueryPathParams>();
  const queryParams = getQueryParameters<ServiceQueryQueryParams>(
    applicationStore.navigator.getCurrentLocation(),
    true,
  );

  useEffect(() => {
    editorStore.setupServiceQueryInfoState(params, queryParams.key);
  }, [editorStore, params, queryParams]);

  return <QueryEditor />;
});

export const ServiceQueryLoader: React.FC = () => (
  <QueryEditorStoreProvider>
    <ServiceQueryLoaderInner />
  </QueryEditorStoreProvider>
);

const CreateQueryLoaderInner = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useQueryEditorStore();
  const params = useParams<CreateQueryPathParams>();
  const currentMapping = editorStore.queryBuilderState.querySetupState.mapping;
  const currentRuntime =
    editorStore.queryBuilderState.querySetupState.runtimeValue instanceof
    RuntimePointer
      ? editorStore.queryBuilderState.querySetupState.runtimeValue
          .packageableRuntime.value
      : undefined;

  useEffect(() => {
    if (editorStore.editorInitState.isInInitialState) {
      editorStore.setupCreateQueryInfoState(params);
    }
  }, [editorStore, params]);

  // TODO: this will make the route change as the users select another mapping and runtime
  useEffect(() => {
    if (editorStore.queryInfoState instanceof CreateQueryInfoState) {
      if (
        currentMapping &&
        currentRuntime &&
        (editorStore.queryInfoState.mapping !== currentMapping ||
          editorStore.queryInfoState.runtime !== currentRuntime)
      ) {
        applicationStore.navigator.goTo(
          generateCreateQueryRoute(
            editorStore.queryInfoState.project.groupId,
            editorStore.queryInfoState.project.artifactId,
            editorStore.queryInfoState.versionId,
            currentMapping.path,
            currentRuntime.path,
            undefined,
          ),
        );
      }
    }
  }, [applicationStore, editorStore, currentMapping, currentRuntime]);

  return <QueryEditor />;
});

export const CreateQueryLoader: React.FC = () => (
  <QueryEditorStoreProvider>
    <CreateQueryLoaderInner />
  </QueryEditorStoreProvider>
);
