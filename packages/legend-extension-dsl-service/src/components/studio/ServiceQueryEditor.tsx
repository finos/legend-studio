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
import { flushSync } from 'react-dom';
import { useParams } from 'react-router';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type SelectComponent,
  BlankPanelContent,
  CustomSelectorInput,
  Dialog,
  ExternalLinkSquareIcon,
  Panel,
  PanelLoadingIndicator,
  PlusIcon,
  RobotIcon,
  RocketIcon,
  SaveIcon,
  clsx,
  CheckSquareIcon,
  SquareIcon,
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
import { QueryBuilder } from '@finos/legend-query-builder';
import {
  ELEMENT_PATH_DELIMITER,
  extractElementNameFromPath,
  resolvePackagePathAndElementName,
  validate_ServicePattern,
} from '@finos/legend-graph';
import {
  type ServiceRegistrationEnvironmentConfig,
  generateEditorRoute,
  useLegendStudioApplicationStore,
} from '@finos/legend-application-studio';
import { guaranteeNonEmptyString, uuid } from '@finos/legend-shared';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { ServiceQueryEditorReviewAction } from './ServiceQueryEditorReviewAction.js';
import { ServiceQueryEditorWorkspaceStatus } from './ServiceQueryEditorWorkspaceStatus.js';

const NewServiceModal = observer(() => {
  const editorStore = useServiceQueryEditorStore();
  const applicationStore = useApplicationStore();
  const [packagePath] = resolvePackagePathAndElementName(
    editorStore.service.path,
  );
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
      editorStore.updateServiceQuery();
      const serviceEntity =
        editorStore.graphManagerState.graphManager.elementToEntity(
          editorStore.service,
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
          applicationStore.setActionAlertInfo({
            message: `Successfully created service '${serviceName}'. Now your service can be found in workspace '${editorStore.sdlcState.activeWorkspace.workspaceId}' of project '${editorStore.sdlcState.activeProject.name}' (${editorStore.sdlcState.activeProject.projectId})`,
            prompt: `Please make sure to review the service and submit a review to officially make the service part of the project`,
            type: ActionAlertType.STANDARD,
            actions: [
              {
                label: 'Open Service',
                type: ActionAlertActionType.PROCEED,
                handler: (): void => {
                  applicationStore.navigator.jumpTo(
                    generateProjectServiceQueryUpdaterRoute(
                      editorStore.sdlcState.activeProject.projectId,
                      editorStore.sdlcState.activeWorkspace.workspaceId,
                      servicePath,
                    ),
                  );
                },
                default: true,
              },
            ],
          });
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
});

type ServiceRegistrationEnvironmentConfigOption = {
  label: string;
  value: ServiceRegistrationEnvironmentConfig;
};
const buildServiceRegistrationEnvironmentConfigOption = (
  value: ServiceRegistrationEnvironmentConfig,
): ServiceRegistrationEnvironmentConfigOption => ({
  label: value.env.toUpperCase(),
  value,
});
const formatServiceRegistrationEnvironmentConfigOptionLabel = (
  option: ServiceRegistrationEnvironmentConfigOption,
): React.ReactNode => (
  <div className="service-query-editor__registration-env-config__option">
    <div className="service-query-editor__registration-env-config__option">
      {option.label}
    </div>
    <div className="service-query-editor__registration-env-config__option__url">
      {option.value.executionUrl}
    </div>
  </div>
);

const RegisterServiceModal = observer(() => {
  const editorStore = useServiceQueryEditorStore();
  const applicationStore = useApplicationStore();
  const envConfigSelectorRef = useRef<SelectComponent>(null);

  const envConfigOptions = editorStore.serviceRegistrationEnvConfigs.map(
    buildServiceRegistrationEnvironmentConfigOption,
  );
  const selectedEnvConfigOption =
    editorStore.currentServiceRegistrationEnvConfig
      ? buildServiceRegistrationEnvironmentConfigOption(
          editorStore.currentServiceRegistrationEnvConfig,
        )
      : null;
  const onEnvConfigChange = (
    val: ServiceRegistrationEnvironmentConfigOption | null,
  ): void => {
    editorStore.setCurrentServiceRegistrationEnvConfig(val?.value);
  };

  // pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState<string>(editorStore.service.pattern);
  const [overridePattern, setOverridePattern] = useState<boolean>(false);
  const toggleOverridePattern = (): void => {
    const newVal = !overridePattern;
    flushSync(() => {
      setOverridePattern(newVal);
      setPattern(editorStore.service.pattern);
    });
    if (newVal) {
      patternRef.current?.focus();
    }
  };
  const changePattern: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (overridePattern) {
      setPattern(event.target.value);
    }
  };
  const patternValidationResult = validate_ServicePattern(pattern);

  // actions
  const handleEnter = (): void => envConfigSelectorRef.current?.focus();
  const registerService = (): void => {
    if (editorStore.currentServiceRegistrationEnvConfig) {
      flowResult(
        editorStore.registerService(overridePattern ? pattern : undefined),
      ).catch(applicationStore.alertUnhandledError);
    }
  };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    registerService();
  };
  const onClose = (): void =>
    editorStore.setShowServiceRegistrationModal(false);

  return (
    <Dialog
      open={editorStore.showServiceRegistrationModal}
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
        <div className="modal__title">Register Service</div>
        <Panel>
          <div className="panel__content__form">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Environment
              </div>
              <CustomSelectorInput
                ref={envConfigSelectorRef}
                options={envConfigOptions}
                onChange={onEnvConfigChange}
                value={selectedEnvConfigOption}
                darkMode={true}
                isClearable={true}
                escapeClearsValue={true}
                placeholder="Choose a registration environment"
                formatOptionLabel={
                  formatServiceRegistrationEnvironmentConfigOptionLabel
                }
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Service URL Pattern
              </div>
              <div className="service-query-editor__registration__pattern">
                <div className="input-group">
                  <input
                    ref={patternRef}
                    className="input input--dark input-group__input"
                    value={pattern}
                    disabled={!overridePattern}
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
                <div className="panel__content__form__section__toggler service-query-editor__registration__pattern__override">
                  <button
                    type="button" // prevent this toggler being activated on form submission
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          overridePattern,
                      },
                    )}
                    onClick={toggleOverridePattern}
                  >
                    {overridePattern ? <CheckSquareIcon /> : <SquareIcon />}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Override
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
        <div className="search-modal__actions">
          <button
            className="btn btn--dark"
            disabled={
              !editorStore.currentServiceRegistrationEnvConfig ||
              editorStore.registerServiceState.isInProgress
            }
            onClick={registerService}
          >
            Register
          </button>
        </div>
      </form>
    </Dialog>
  );
});

const ServiceQueryEditorHeaderContent = observer(() => {
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
    editorStore.updateServiceQuery();
    const serviceEntity =
      editorStore.graphManagerState.graphManager.elementToEntity(
        editorStore.service,
        {
          pruneSourceInformation: true,
        },
      );
    flowResult(
      editorStore.saveWorkspace(serviceEntity, false, (): void => {
        applicationStore.navigator.jumpTo(
          generateServiceQueryUpdaterRoute(
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.groupId,
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.artifactId,
            editorStore.service.path,
            editorStore.sdlcState.activeWorkspace.workspaceId,
          ),
        );
      }),
    ).catch(applicationStore.alertUnhandledError);
  };

  // register service
  const showServiceRegistrationModal = (): void =>
    editorStore.setShowServiceRegistrationModal(true);
  const canRegisterService = Boolean(
    editorStore.applicationStore.config.options
      .TEMPORARY__serviceRegistrationConfig.length,
  );

  return (
    <div className="service-query-editor__header__content">
      <div className="service-query-editor__header__content__main">
        <div className="service-query-editor__header__label service-query-editor__header__label--service-query">
          <RobotIcon className="service-query-editor__header__label__icon" />
          {extractElementNameFromPath(editorStore.service.path)}
        </div>
      </div>

      <div className="service-query-editor__header__actions">
        <button
          className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          disabled={!canRegisterService}
          title="Register service"
          onClick={showServiceRegistrationModal}
        >
          <RocketIcon />
        </button>
        {canRegisterService && editorStore.showServiceRegistrationModal && (
          <RegisterServiceModal />
        )}
        <div className="service-query-editor__header__actions__divider" />
        <ServiceQueryEditorWorkspaceStatus />
        <button
          className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          title="View project"
          onClick={viewProject}
        >
          <ExternalLinkSquareIcon />
        </button>
        <div className="service-query-editor__header__actions__divider" />
        <ServiceQueryEditorReviewAction />
        <button
          className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          title="Save as a new service"
          onClick={showNewServiceModal}
        >
          <PlusIcon />
        </button>
        {editorStore.showNewServiceModal && <NewServiceModal />}
        <button
          className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          // TODO: we should disable this when we have change detection for query builder
          // See https://github.com/finos/legend-studio/pull/1456
          onClick={saveWorkspace}
          title="Save workspace"
        >
          <SaveIcon />
        </button>
      </div>
    </div>
  );
});

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
        {editorStore.queryBuilderState && editorStore._service && (
          <ServiceQueryEditorHeaderContent />
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
