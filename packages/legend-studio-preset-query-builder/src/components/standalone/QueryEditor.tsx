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

import { RuntimePointer, useApplicationStore } from '@finos/legend-studio';
import {
  ArrowLeftIcon,
  PanelLoadingIndicator,
} from '@finos/legend-studio-components';
import { getQueryParameters } from '@finos/legend-studio-shared';
import { Dialog } from '@material-ui/core';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams } from 'react-router';
import type {
  CreateQueryPathParams,
  ExistingQueryPathParams,
  ServiceQueryPathParams,
  ServiceQueryQueryParams,
} from '../../stores/LegendQueryRouter';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../stores/LegendQueryRouter';
import { generateCreateQueryRoute } from '../../stores/LegendQueryRouter';
import type { QueryExportState } from '../../stores/QueryStore';
import { CreateQueryInfoState, useQueryStore } from '../../stores/QueryStore';
import { QueryBuilder } from '../QueryBuilder';

const QueryExportInner = observer(
  (props: { queryExportState: QueryExportState }) => {
    const { queryExportState } = props;
    const applicationStore = useApplicationStore();

    const allowSave = queryExportState.allowSave;
    const save = applicationStore.guaranteeSafeAction(() =>
      flowResult(queryExportState.saveQuery()),
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
            isLoading={queryExportState.saveQueryState.isInProgress}
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
          <button
            className="btn modal__footer__close-btn btn--dark"
            disabled={!allowSave}
            onClick={save}
          >
            Save
          </button>
        </div>
      </>
    );
  },
);

const QueryExport = observer(() => {
  const queryStore = useQueryStore();
  const queryExportState = queryStore.queryExportState;
  const close = (): void => queryStore.setQueryExportState(undefined);

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
  const queryStore = useQueryStore();
  const applicationStore = useApplicationStore();
  const backToMainMenu = (): void =>
    applicationStore.historyApiClient.push(LEGEND_QUERY_ROUTE_PATTERN.SETUP);

  return (
    <div className="query-editor__header">
      <button
        className="query-editor__header__back-btn"
        onClick={backToMainMenu}
        title="Back to Main Menu"
      >
        <ArrowLeftIcon />
      </button>
    </div>
  );
});

const QueryEditorInner = observer(() => {
  const queryStore = useQueryStore();
  const isLoadingEditor =
    !queryStore.editorStore.graphState.graph.buildState.hasCompleted ||
    !queryStore.editorInitState.hasCompleted;
  return (
    <div className="query-editor">
      <QueryExport />
      <QueryEditorHeader />
      <div className="query-editor__content">
        <PanelLoadingIndicator isLoading={isLoadingEditor} />
        {!isLoadingEditor && (
          <QueryBuilder queryBuilderState={queryStore.queryBuilderState} />
        )}
      </div>
    </div>
  );
});

const QueryEditor: React.FC<{}> = () => (
  <DndProvider backend={HTML5Backend}>
    <QueryEditorInner />
  </DndProvider>
);

export const ExistingQueryLoader = observer(() => {
  const queryStore = useQueryStore();
  const params = useParams<ExistingQueryPathParams>();

  useEffect(() => {
    queryStore.setupExistingQueryInfoState(params);
  }, [queryStore, params]);

  return <QueryEditor />;
});

export const ServiceQueryLoader = observer(() => {
  const applicationStore = useApplicationStore();
  const queryStore = useQueryStore();
  const params = useParams<ServiceQueryPathParams>();
  const queryParams = getQueryParameters<ServiceQueryQueryParams>(
    applicationStore.historyApiClient.location.search,
  );

  useEffect(() => {
    queryStore.setupServiceQueryInfoState(params, queryParams.key);
  }, [queryStore, params, queryParams]);

  return <QueryEditor />;
});

export const CreateQueryLoader = observer(() => {
  const applicationStore = useApplicationStore();
  const queryStore = useQueryStore();
  const params = useParams<CreateQueryPathParams>();
  const currentMapping = queryStore.queryBuilderState.querySetupState.mapping;
  const currentRuntime =
    queryStore.queryBuilderState.querySetupState.runtime instanceof
    RuntimePointer
      ? queryStore.queryBuilderState.querySetupState.runtime.packageableRuntime
          .value
      : undefined;

  useEffect(() => {
    queryStore.setupCreateQueryInfoState(params);
  }, [queryStore, params]);

  // TODO: this will make the route change as the users select another mapping and runtime
  useEffect(() => {
    if (queryStore.queryInfoState instanceof CreateQueryInfoState) {
      if (
        currentMapping &&
        currentRuntime &&
        (queryStore.queryInfoState.mapping !== currentMapping ||
          queryStore.queryInfoState.runtime !== currentRuntime)
      ) {
        applicationStore.historyApiClient.push(
          generateCreateQueryRoute(
            queryStore.queryInfoState.projectMetadata.projectId,
            queryStore.queryInfoState.versionId,
            currentMapping.path,
            currentRuntime.path,
          ),
        );
      }
    }
  }, [applicationStore, queryStore, currentMapping, currentRuntime]);

  return <QueryEditor />;
});
