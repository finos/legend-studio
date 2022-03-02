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

import { useState, useEffect, useRef } from 'react';
import { ProjectSelector } from './ProjectSelector';
import { WorkspaceSelector } from './WorkspaceSelector';
import { observer } from 'mobx-react-lite';
import {
  type SelectComponent,
  clsx,
  Dialog,
  SquareIcon,
  TimesIcon,
  compareLabelFn,
  CustomSelectorInput,
  PanelLoadingIndicator,
  CheckSquareIcon,
  PencilIcon,
} from '@finos/legend-art';
import type { ProjectOption } from '../../stores/SetupStore';
import { SetupStoreProvider, useSetupStore } from './SetupStoreProvider';
import { useParams } from 'react-router';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID';
import { isNumber } from '@finos/legend-shared';
import {
  type SetupPathParams,
  generateEditorRoute,
} from '../../stores/LegendStudioRouter';
import { LegendStudioAppHeaderMenu } from '../editor/header/LegendStudioAppHeaderMenu';
import { flowResult } from 'mobx';
import { ProjectType, WorkspaceType } from '@finos/legend-server-sdlc';
import {
  useApplicationStore,
  AppHeader,
  DocumentationLink,
} from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../stores/LegendStudioDocumentationKey';

const CreateProjectModal = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const importProjectSuccessReport = setupStore.importProjectSuccessReport;
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const defaultType = applicationStore.config.options
    .TEMPORARY__useSDLCProductionProjectsOnly
    ? ProjectType.PRODUCTION
    : ProjectType.PROTOTYPE;
  const [projectType, setProjectType] = useState<ProjectType>(defaultType);
  const currentOption = { label: projectType, value: projectType };
  const onSelectionChange = (
    val: { label: ProjectType; value: ProjectType } | null,
  ): void => {
    if (val?.value) {
      setProjectType(val.value);
    }
  };
  const options = Object.values(ProjectType).map((option) => ({
    value: option,
    label: option,
  }));
  const [projectIdentifier, setProjectIdentifier] = useState('');
  const [groupId, setGroupId] = useState('');
  const [artifactId, setArtifactId] = useState('');
  const [description, setDescription] = useState('');
  const [itemValue, setItemValue] = useState<string>('');
  const [tagsArray, setTagsArray] = useState<Array<string>>([]);
  const dispatchingActions =
    setupStore.createOrImportProjectState.isInProgress ||
    setupStore.createWorkspaceState.isInProgress;
  const closeModal = (): void => {
    setupStore.setShowCreateProjectModal(false);
    setupStore.setImportProjectSuccessReport(undefined);
  };
  const createProject = applicationStore.guaranteeSafeAction(() =>
    flowResult(
      setupStore.createProject(
        projectIdentifier,
        description,
        groupId,
        artifactId,
        tagsArray,
      ),
    ),
  );
  const importProject = applicationStore.guaranteeSafeAction(() =>
    flowResult(
      setupStore.importProject(projectIdentifier, groupId, artifactId),
    ),
  );
  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    if (importProjectSuccessReport) {
      applicationStore.navigator.openNewWindow(
        importProjectSuccessReport.reviewUrl,
      );
    } else {
      if (projectIdentifier && groupId && artifactId) {
        if (projectType === ProjectType.PROTOTYPE) {
          createProject().catch(applicationStore.alertIllegalUnhandledError);
        } else {
          importProject().catch(applicationStore.alertIllegalUnhandledError);
        }
      }
    }
  };
  const handleEnter = (): void => {
    setProjectIdentifier('');
    projectNameInputRef.current?.focus();
  };
  const modalTitle =
    projectType === ProjectType.PROTOTYPE ? 'Create Project' : 'Import Project';
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    setDescription(event.target.value);
  };
  const changeGroupId: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setGroupId(event.target.value);
  };
  const changeProjectIdentifier: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setProjectIdentifier(event.target.value);
  const changeArtifactId: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    setArtifactId(event.target.value);
  };
  const disableSubmit =
    (dispatchingActions || !projectIdentifier || !artifactId || !groupId) &&
    !importProjectSuccessReport;
  const submitLabel = importProjectSuccessReport
    ? 'Review'
    : projectType === ProjectType.PROTOTYPE
    ? 'Create'
    : 'Import';

  // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
  const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
  const showAddItemInput = (): void => setShowEditInput(true);
  const showEditItemInput =
    (value: string, idx: number): (() => void) =>
    (): void => {
      setItemValue(value);
      setShowEditInput(idx);
    };
  const hideAddOrEditItemInput = (): void => {
    setShowEditInput(false);
    setItemValue('');
  };
  const changeItemInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setItemValue(event.target.value);
  const addValue = (): void => {
    if (itemValue && !tagsArray.includes(itemValue)) {
      setTagsArray([...tagsArray, itemValue]);
    }
    hideAddOrEditItemInput();
  };
  const updateValue =
    (idx: number): (() => void) =>
    (): void => {
      if (itemValue && !tagsArray.includes(itemValue)) {
        tagsArray[idx] = itemValue;
        setTagsArray(tagsArray);
        hideAddOrEditItemInput();
      }
    };
  const deleteValue =
    (idx: number): (() => void) =>
    (): void => {
      const tags = [...tagsArray];
      tags.splice(idx, 1);
      setTagsArray(tags);
      // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
      if (isNumber(showEditInput) && showEditInput > idx) {
        setShowEditInput(showEditInput - 1);
      }
    };

  return (
    <Dialog
      open={setupStore.showCreateProjectModal}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark setup-create__modal">
        <div className="setup-create__modal__heading">
          <div className="setup-create__modal__heading__label">
            {modalTitle}
            <DocumentationLink
              className="setup__doc__create-project"
              documentationKey={LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_PROJECT}
            />
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={setupStore.createOrImportProjectState.isInProgress}
          />
          <div className="setup-create__form">
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label setup-create__modal__project__type">
                  Project Type
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Any project intended for use in production must be a
                  production project. Prototype projects should only be used as
                  playgrounds or proofs-of-concept.
                </div>
                {applicationStore.config.options
                  .TEMPORARY__useSDLCProductionProjectsOnly ||
                Boolean(importProjectSuccessReport) ? (
                  <input
                    className="panel__content__form__section__input"
                    spellCheck={false}
                    value={projectType}
                    disabled={true}
                    onChange={changeProjectIdentifier}
                  />
                ) : (
                  <CustomSelectorInput
                    options={options}
                    onChange={onSelectionChange}
                    value={currentOption}
                    darkMode={true}
                  />
                )}
              </div>
            </div>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  {projectType === ProjectType.PROTOTYPE
                    ? 'Project Name'
                    : 'Import Project ID'}
                </div>
                {projectType === ProjectType.PRODUCTION && (
                  <div className="panel__content__form__section__header__prompt">
                    The ID of the project in the underlying version-control
                    system
                  </div>
                )}
                <input
                  className="panel__content__form__section__input"
                  spellCheck={false}
                  placeholder={
                    projectType === ProjectType.PROTOTYPE ? 'MyProject' : '1234'
                  }
                  value={projectIdentifier}
                  disabled={Boolean(importProjectSuccessReport)}
                  onChange={changeProjectIdentifier}
                />
              </div>
            </div>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Description
                </div>
                <textarea
                  className="panel__content__form__section__textarea"
                  spellCheck={false}
                  value={description}
                  onChange={changeDescription}
                />
              </div>
            </div>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Group ID
                </div>
                <div className="panel__content__form__section__header__prompt">
                  The domain for artifacts generated as part of the project
                  build pipeline and published to an artifact repository
                </div>
                <input
                  className="panel__content__form__section__input"
                  spellCheck={false}
                  placeholder="org.finos.legend.*"
                  value={groupId}
                  disabled={Boolean(importProjectSuccessReport)}
                  onChange={changeGroupId}
                />
              </div>
            </div>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Artifact ID
                </div>
                <div className="panel__content__form__section__header__prompt">
                  The identifier (within the domain specified by group ID) for
                  artifacts generated as part of the project build pipeline and
                  published to an artifact repository
                </div>
                <input
                  className="panel__content__form__section__input"
                  placeholder="my-project"
                  spellCheck={false}
                  value={artifactId}
                  disabled={Boolean(importProjectSuccessReport)}
                  onChange={changeArtifactId}
                />
              </div>
            </div>
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Tags
                </div>
                <div className="panel__content__form__section__header__prompt">
                  List of annotations to categorize projects
                </div>
                <div className="panel__content__form__section__list"></div>
                <div
                  className="panel__content__form__section__list__items"
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
                  }
                >
                  {tagsArray.map((value, idx) => (
                    // NOTE: since the value must be unique, we will use it as the key
                    <div
                      key={value}
                      className={
                        showEditInput === idx
                          ? 'panel__content__form__section__list__new-item'
                          : 'panel__content__form__section__list__item'
                      }
                    >
                      {showEditInput === idx ? (
                        <>
                          <input
                            className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                            spellCheck={false}
                            value={itemValue}
                            onChange={changeItemInputValue}
                          />
                          <div className="panel__content__form__section__list__new-item__actions">
                            <button
                              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                              disabled={tagsArray.includes(itemValue)}
                              onClick={updateValue(idx)}
                              tabIndex={-1}
                            >
                              Save
                            </button>
                            <button
                              className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                              onClick={hideAddOrEditItemInput}
                              tabIndex={-1}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="panel__content__form__section__list__item__value">
                            {value}
                          </div>
                          <div className="panel__content__form__section__list__item__actions">
                            <button
                              className="panel__content__form__section__list__item__edit-btn"
                              onClick={showEditItemInput(value, idx)}
                              tabIndex={-1}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              className="panel__content__form__section__list__item__remove-btn"
                              onClick={deleteValue(idx)}
                              tabIndex={-1}
                            >
                              <TimesIcon />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* ADD NEW VALUE */}
                  {showEditInput === true && (
                    <div className="panel__content__form__section__list__new-item">
                      <input
                        className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                        spellCheck={false}
                        value={itemValue}
                        onChange={changeItemInputValue}
                      />
                      <div className="panel__content__form__section__list__new-item__actions">
                        <button
                          className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                          disabled={tagsArray.includes(itemValue)}
                          onClick={addValue}
                          tabIndex={-1}
                        >
                          Save
                        </button>
                        <button
                          className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                          onClick={hideAddOrEditItemInput}
                          tabIndex={-1}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {showEditInput !== true && (
                  <div className="panel__content__form__section__list__new-item__add">
                    <button
                      className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                      onClick={showAddItemInput}
                      tabIndex={-1}
                    >
                      Add Value
                    </button>
                  </div>
                )}
              </div>
              {Boolean(importProjectSuccessReport) && (
                <div className="setup-create__modal__success">
                  <div className="setup-create__modal__success__label">
                    <span className="setup-create__modal__success__label__text">
                      The SDLC server has successfully registered your project.
                      To complete the import, please commit the following
                    </span>
                    <a
                      className="setup-create__modal__success__label__link"
                      href={importProjectSuccessReport?.reviewUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      review.
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            disabled={disableSubmit}
            className="btn btn--dark setup-create__modal__submit-btn u-pull-right"
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </Dialog>
  );
});

const CreateWorkspaceModal = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();
  const {
    loadProjectsState,
    createOrImportProjectState,
    createWorkspaceState,
    showCreateWorkspaceModal,
  } = setupStore;
  const isFetchingProjects = loadProjectsState.isInProgress;
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceNameInputRef = useRef<HTMLInputElement>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(
    setupStore.currentProjectId,
  );
  const [workspaceName, setWorkspaceName] = useState('');
  const [isGroupWorkspace, setIsGroupWorkspace] = useState<boolean>(false);
  const workspaceType = isGroupWorkspace
    ? WorkspaceType.GROUP
    : WorkspaceType.USER;
  const projectOptions = setupStore.projectOptions.sort(compareLabelFn);
  const selectedOption =
    projectOptions.find((option) => option.value === currentProjectId) ?? null;
  const dispatchingActions =
    createWorkspaceState.isInProgress ||
    createOrImportProjectState.isInProgress;
  const onSelectionChange = (val: ProjectOption | null): void => {
    if (
      (val !== null || selectedOption !== null) &&
      (!val || !selectedOption || val.value !== selectedOption.value)
    ) {
      setCurrentProjectId(val?.value);
      workspaceNameInputRef.current?.focus();
    }
  };
  const projectSelectorPlaceholder = isFetchingProjects
    ? 'Loading projects'
    : loadProjectsState.hasFailed
    ? 'Error fetching projects'
    : projectOptions.length
    ? 'Choose an existing project'
    : 'You have no projects, please create or acquire access for at least one';

  const closeModal = (): void => {
    setupStore.setShowCreateWorkspaceModal(false);
  };
  const createWorkspace = (): void => {
    if (currentProjectId && workspaceName) {
      flowResult(
        setupStore.createWorkspace(
          currentProjectId,
          workspaceName,
          workspaceType,
        ),
      ).catch(applicationStore.alertIllegalUnhandledError);
    }
  };
  const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setWorkspaceName(event.target.value);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    createWorkspace();
  };
  const handleEnter = (): void => {
    if (currentProjectId) {
      workspaceNameInputRef.current?.focus();
    } else {
      projectSelectorRef.current?.focus();
    }
  };
  const toggleGroupWorkspace = (
    event: React.FormEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    setIsGroupWorkspace(!isGroupWorkspace);
  };

  return (
    <Dialog
      open={showCreateWorkspaceModal}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark setup-create__modal">
        <div className="modal__title">
          Create Workspace
          <DocumentationLink
            className="setup__doc__create-workspace"
            documentationKey={LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_WORKSPACE}
          />
        </div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={setupStore.createWorkspaceState.isInProgress}
          />
          <div className="setup-create__form setup-create__form__workspace">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Project Name
              </div>
              <CustomSelectorInput
                className="setup-selector__input setup__workspace__selector"
                ref={projectSelectorRef}
                options={projectOptions}
                disabled={
                  dispatchingActions ||
                  isFetchingProjects ||
                  !projectOptions.length
                }
                isLoading={isFetchingProjects}
                onChange={onSelectionChange}
                value={selectedOption}
                placeholder={projectSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Workspace Name
              </div>
              <input
                className="setup-create__form__workspace-name__input"
                ref={workspaceNameInputRef}
                spellCheck={false}
                disabled={dispatchingActions}
                placeholder={'MyWorkspace'}
                value={workspaceName}
                onChange={changeWorkspaceName}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Group Workspace
              </div>
              <div className="panel__content__form__section__toggler">
                <button
                  onClick={toggleGroupWorkspace}
                  type="button" // prevent this toggler being activated on form submission
                  className={clsx(
                    'panel__content__form__section__toggler__btn',
                    {
                      'panel__content__form__section__toggler__btn--toggled':
                        isGroupWorkspace,
                    },
                  )}
                  tabIndex={-1}
                >
                  {isGroupWorkspace ? <CheckSquareIcon /> : <SquareIcon />}
                </button>
                <div className="panel__content__form__section__toggler__prompt">
                  Group workspaces can be edited by all users in the
                  corresponding project.
                </div>
              </div>
            </div>
          </div>
          <button
            disabled={dispatchingActions || !workspaceName || !currentProjectId}
            className="btn btn--dark u-pull-right"
          >
            Create
          </button>
        </form>
      </div>
    </Dialog>
  );
});

const SetupSelection = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const config = applicationStore.config;
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceSelectorRef = useRef<SelectComponent>(null);
  const proceedButtonRef = useRef<HTMLButtonElement>(null);
  const isCreatingWorkspace = setupStore.createWorkspaceState.isInProgress;
  const isCreatingOrImportingProject =
    setupStore.createOrImportProjectState.isInProgress;
  const disableProceedButton =
    !setupStore.currentProjectId ||
    !setupStore.currentWorkspaceCompositeId ||
    isCreatingWorkspace ||
    isCreatingOrImportingProject;
  const onProjectChange = (focusNext: boolean): void =>
    focusNext
      ? workspaceSelectorRef.current?.focus()
      : projectSelectorRef.current?.focus();
  const onWorkspaceChange = (focusNext: boolean): void =>
    focusNext
      ? proceedButtonRef.current?.focus()
      : workspaceSelectorRef.current?.focus();
  const handleCreateProjectModal = (): void =>
    setupStore.setShowCreateProjectModal(true);
  const handleCreateWorkspaceModal = (): void =>
    setupStore.setShowCreateWorkspaceModal(true);
  const handleProceed = (): void => {
    if (
      setupStore.currentProjectId &&
      setupStore.currentProject &&
      setupStore.currentWorkspaceCompositeId &&
      setupStore.currentWorkspace
    ) {
      applicationStore.navigator.goTo(
        generateEditorRoute(
          applicationStore.config.currentSDLCServerOption,
          setupStore.currentProjectId,
          setupStore.currentWorkspace.workspaceId,
          setupStore.currentWorkspace.workspaceType,
        ),
      );
    }
  };

  useEffect(() => {
    if (!disableProceedButton) {
      proceedButtonRef.current?.focus();
    }
  }, [disableProceedButton]);

  return (
    <div className="app__page">
      <AppHeader>
        <LegendStudioAppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="setup">
          <div
            className="setup__content"
            data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
          >
            <div className="setup__title">
              Setup Workspace
              <DocumentationLink
                className="setup__doc__setup-workspace"
                documentationKey={
                  LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_WORKSPACE
                }
              />
            </div>
            <div>
              <ProjectSelector
                ref={projectSelectorRef}
                onChange={onProjectChange}
                create={handleCreateProjectModal}
              />
              <WorkspaceSelector
                ref={workspaceSelectorRef}
                onChange={onWorkspaceChange}
                create={handleCreateWorkspaceModal}
              />
              <button
                ref={proceedButtonRef}
                className="setup__next-btn btn--dark u-pull-right"
                onClick={handleProceed}
                disabled={disableProceedButton}
              >
                Edit Workspace
              </button>
            </div>
            {config.options.TEMPORARY__useSDLCProductionProjectsOnly && (
              <div className="setup__view-project-btn__error">
                <div className="setup__view-project-btn__error__label">
                  <span className="setup__view-project-btn__error__label__text">
                    Prototype projects are temporary unavailable due to issues
                    with UAT environment. Please create and use Production
                    projects instead
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* We do this to reset the initial state of the modals */}
          {setupStore.showCreateProjectModal && <CreateProjectModal />}
          {setupStore.showCreateWorkspaceModal && <CreateWorkspaceModal />}
        </div>
      </div>
    </div>
  );
});

export const SetupInner = observer(() => {
  const params = useParams<SetupPathParams>();
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();
  useEffect(() => {
    setupStore.setCurrentProjectId(params.projectId);
    setupStore.init(params.workspaceId, params.groupWorkspaceId);
  }, [setupStore, params]);

  useEffect(() => {
    flowResult(setupStore.fetchProjects()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
    if (setupStore.currentProjectId) {
      flowResult(setupStore.fetchWorkspaces(setupStore.currentProjectId)).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }
  }, [applicationStore, setupStore]);

  return <SetupSelection />;
});

export const Setup: React.FC = () => (
  <SetupStoreProvider>
    <SetupInner />
  </SetupStoreProvider>
);
