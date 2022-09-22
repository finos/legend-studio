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

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import {
  BlankPanelContent,
  Dialog,
  ExternalLinkSquareIcon,
  Panel,
  PanelLoadingIndicator,
  PlusIcon,
  ReviewIcon,
  RobotIcon,
  SaveIcon,
} from '@finos/legend-art';
import {
  type ProjectServiceQueryUpdaterPathParams,
  type ServiceQueryUpdaterPathParams,
  DSL_SERVICE_PATH_PARAM_TOKEN,
  generateServiceQueryUpdaterRoute,
  generateProjectServiceQueryUpdaterRoute,
} from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import {
  ProjectServiceQueryUpdaterStoreProvider,
  ServiceQueryUpdaterStoreProvider,
  useServiceQueryEditorStore,
} from './ServiceQueryEditorStoreProvider.js';
import {
  type QueryBuilderState,
  QueryBuilder,
} from '@finos/legend-query-builder';
import {
  ELEMENT_PATH_DELIMITER,
  extractElementNameFromPath,
  PureExecution,
  resolvePackagePathAndElementName,
  validate_ServicePattern,
  type Service,
} from '@finos/legend-graph';
import {
  generateEditorRoute,
  pureExecution_setFunction,
  useLegendStudioApplicationStore,
} from '@finos/legend-application-studio';
import {
  guaranteeNonEmptyString,
  guaranteeType,
  uuid,
} from '@finos/legend-shared';
import { WorkspaceType } from '@finos/legend-server-sdlc';

const NewServiceModal = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    currentService: Service;
  }) => {
    const { queryBuilderState, currentService } = props;
    const editorStore = useServiceQueryEditorStore();
    const applicationStore = useApplicationStore();
    const [packagePath] = resolvePackagePathAndElementName(currentService.path);
    const servicePackagePath = guaranteeNonEmptyString(packagePath);
    const pathRef = useRef<HTMLInputElement>(null);

    // service name
    const [serviceName, setServiceName] = useState<string>('MyNewService');
    const servicePath = `${servicePackagePath}${ELEMENT_PATH_DELIMITER}${serviceName}`;
    const elementAlreadyExists =
      editorStore.graphManagerState.graph.allOwnElements
        .map((s) => s.path)
        .includes(servicePackagePath + ELEMENT_PATH_DELIMITER + serviceName);
    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setServiceName(event.target.value);

    // pattern
    const [pattern, setPattern] = useState<string>(`/${uuid()}`);
    const changePattern: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setPattern(event.target.value);
    const patternValidationResult = validate_ServicePattern(pattern);

    // actions
    const handleEnter = (): void => pathRef.current?.focus();
    const create = (): void => {
      if (!elementAlreadyExists && !patternValidationResult) {
        // update the service
        pureExecution_setFunction(
          guaranteeType(currentService.execution, PureExecution),
          queryBuilderState.buildQuery(),
        );
        const serviceEntity =
          editorStore.graphManagerState.graphManager.elementToEntity(
            currentService,
            {
              pruneSourceInformation: true,
            },
          );
        serviceEntity.path = servicePath;
        // NOTE: this does look a bit sketchy, but it's simple
        serviceEntity.content.name = serviceName;
        serviceEntity.content.pattern = pattern;

        flowResult(
          editorStore.saveWorkspace(serviceEntity, true, (): void => {
            applicationStore.navigator.jumpTo(
              generateProjectServiceQueryUpdaterRoute(
                editorStore.sdlcState.activeProject.projectId,
                editorStore.sdlcState.activeWorkspace.workspaceId,
                servicePath,
              ),
            );
          }),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      create();
    };
    const onClose = (): void => editorStore.setShowNewServiceModal(false);

    return (
      <Dialog
        open={editorStore.showNewServiceModal}
        onClose={onClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form onSubmit={onSubmit} className="modal search-modal modal--dark">
          <div className="modal__title">Create New Service</div>
          <Panel>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Service Name
                </div>
                <div className="input-group">
                  <input
                    ref={pathRef}
                    className="input input--dark input-group__input"
                    value={serviceName}
                    spellCheck={false}
                    onChange={changeName}
                    placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the service`}
                  />
                  {elementAlreadyExists && (
                    <div className="input-group__error-message">
                      Element with same path already exists
                    </div>
                  )}
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Service URL Pattern
                </div>
                <div className="input-group">
                  <input
                    className="input input--dark input-group__input"
                    value={pattern}
                    spellCheck={false}
                    onChange={changePattern}
                    placeholder="Enter as service URL pattern, e.g. /myService"
                  />
                  {patternValidationResult && (
                    <div className="input-group__error-message">
                      URL pattern is not valid
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={elementAlreadyExists}
              onClick={create}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const ServiceQueryEditorHeaderContent = observer(
  (props: { queryBuilderState: QueryBuilderState; service: Service }) => {
    const { queryBuilderState, service } = props;
    const editorStore = useServiceQueryEditorStore();
    const applicationStore = useLegendStudioApplicationStore();
    const viewProject = (): void =>
      applicationStore.navigator.openNewWindow(
        applicationStore.navigator.generateLocation(
          generateEditorRoute(
            editorStore.sdlcState.activeProject.projectId,
            editorStore.sdlcState.activeWorkspace.workspaceId,
            WorkspaceType.GROUP,
          ),
        ),
      );
    const showNewServiceModal = (): void =>
      editorStore.setShowNewServiceModal(true);
    const saveWorkspace = (): void => {
      // update the service
      pureExecution_setFunction(
        guaranteeType(service.execution, PureExecution),
        queryBuilderState.buildQuery(),
      );
      const serviceEntity =
        editorStore.graphManagerState.graphManager.elementToEntity(service, {
          pruneSourceInformation: true,
        });
      flowResult(
        editorStore.saveWorkspace(serviceEntity, false, (): void => {
          applicationStore.navigator.jumpTo(
            generateServiceQueryUpdaterRoute(
              editorStore.projectConfigurationEditorState
                .currentProjectConfiguration.groupId,
              editorStore.projectConfigurationEditorState
                .currentProjectConfiguration.artifactId,
              service.path,
              editorStore.sdlcState.activeWorkspace.workspaceId,
            ),
          );
        }),
      ).catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="service-query-editor__header__content">
        <div className="service-query-editor__header__content__main">
          <div className="service-query-editor__header__label service-query-editor__header__label--service-query">
            <RobotIcon className="service-query-editor__header__label__icon" />
            {extractElementNameFromPath(service.path)}
          </div>
        </div>

        <div className="service-query-editor__header__actions">
          <div className="service-query-editor__header__actions__divider" />
          <button
            className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
            tabIndex={-1}
            // title="View project"
            // onClick={viewProject}
          >
            <ReviewIcon />
          </button>
          <button
            className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
            tabIndex={-1}
            title="View project"
            onClick={viewProject}
          >
            <ExternalLinkSquareIcon />
          </button>
          <button
            className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
            tabIndex={-1}
            title="Create a new service"
            onClick={showNewServiceModal}
          >
            <PlusIcon />
            {editorStore.showNewServiceModal && (
              <NewServiceModal
                queryBuilderState={queryBuilderState}
                currentService={service}
              />
            )}
          </button>
          <button
            className="service-query-editor__header__action btn--dark"
            tabIndex={-1}
            // TODO: we should disable this when we have change detection for query builder
            // See https://github.com/finos/legend-studio/pull/1456
            onClick={saveWorkspace}
          >
            <div className="service-query-editor__header__action__icon">
              <SaveIcon />
            </div>
            <div className="service-query-editor__header__action__label">
              Save
            </div>
          </button>
        </div>
      </div>
    );
  },
);

export const ServiceQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useServiceQueryEditorStore();

  useEffect(() => {
    flowResult(editorStore.initializeWithServiceQuery()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [editorStore, applicationStore]);

  return (
    <div className="service-query-editor">
      <div className="service-query-editor__header">
        {editorStore.queryBuilderState && editorStore.service && (
          <ServiceQueryEditorHeaderContent
            queryBuilderState={editorStore.queryBuilderState}
            service={editorStore.service}
          />
        )}
      </div>
      <div className="service-query-editor__content">
        <PanelLoadingIndicator isLoading={editorStore.initState.isInProgress} />
        {editorStore.queryBuilderState && (
          <QueryBuilder queryBuilderState={editorStore.queryBuilderState} />
        )}
        {!editorStore.queryBuilderState && (
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

export const ServiceQueryUpdater = observer(() => {
  const params = useParams<ServiceQueryUpdaterPathParams>();
  const serviceCoordinates =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.SERVICE_COORDINATES];
  const groupWorkspaceId =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID];

  return (
    <ServiceQueryUpdaterStoreProvider
      serviceCoordinates={serviceCoordinates}
      groupWorkspaceId={groupWorkspaceId}
    >
      <ServiceQueryEditor />
    </ServiceQueryUpdaterStoreProvider>
  );
});

export const ProjectServiceQueryUpdater = observer(() => {
  const params = useParams<ProjectServiceQueryUpdaterPathParams>();
  const projectId = params[DSL_SERVICE_PATH_PARAM_TOKEN.PROJECT_ID];
  const groupWorkspaceId =
    params[DSL_SERVICE_PATH_PARAM_TOKEN.GROUP_WORKSPACE_ID];
  const servicePath = params[DSL_SERVICE_PATH_PARAM_TOKEN.SERVICE_PATH];

  return (
    <ProjectServiceQueryUpdaterStoreProvider
      projectId={projectId}
      groupWorkspaceId={groupWorkspaceId}
      servicePath={servicePath}
    >
      <ServiceQueryEditor />
    </ProjectServiceQueryUpdaterStoreProvider>
  );
});
