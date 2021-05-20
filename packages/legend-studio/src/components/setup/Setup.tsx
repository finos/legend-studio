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
import { FaTimes } from 'react-icons/fa';
import { ProjectSelector } from './ProjectSelector';
import { WorkspaceSelector } from './WorkspaceSelector';
import { observer } from 'mobx-react-lite';
import type { SelectComponent } from '@finos/legend-studio-components';
import {
  CustomSelectorInput,
  PanelLoadingIndicator,
} from '@finos/legend-studio-components';
import { SetupStoreProvider, useSetupStore } from '../../stores/SetupStore';
import { useParams } from 'react-router';
import { CORE_TEST_ID } from '../../const';
import { NotificationSnackbar } from '../shared/NotificationSnackbar';
import Dialog from '@material-ui/core/Dialog';
import type { ProjectSelectOption } from '../../models/sdlc/models/project/Project';
import { ProjectType } from '../../models/sdlc/models/project/Project';
import { isNumber, ACTION_STATE } from '@finos/legend-studio-shared';
import { MdModeEdit } from 'react-icons/md';
import type { SetupRouteParams } from '../../stores/Router';
import {
  generateEditorRoute,
  generateViewProjectRoute,
} from '../../stores/Router';
import { AppHeader } from '../shared/AppHeader';
import { AppHeaderMenu } from '../editor/header/AppHeaderMenu';
import { useApplicationStore } from '../../stores/ApplicationStore';

const CreateProjectModal = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();
  const config = applicationStore.config;
  const importProjectSuccessReport = setupStore.importProjectSuccessReport;
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const defaultType = config.options.TEMPORARY__useSDLCProductionProjectsOnly
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
    setupStore.createOrImportProjectState === ACTION_STATE.IN_PROGRESS ||
    setupStore.createWorkspaceState === ACTION_STATE.IN_PROGRESS;
  const closeModal = (): void => {
    setupStore.setCreateProjectModal(false);
    setupStore.setImportProjectSuccessReport(undefined);
  };
  const createProject = applicationStore.guaranteeSafeAction(() =>
    setupStore.createProject(
      projectIdentifier,
      description,
      groupId,
      artifactId,
      tagsArray,
    ),
  );
  const importProject = applicationStore.guaranteeSafeAction(() =>
    setupStore.importProject(projectIdentifier, groupId, artifactId),
  );
  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    if (importProjectSuccessReport) {
      window.open(importProjectSuccessReport.reviewUrl, '_blank');
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
      onEnter={handleEnter}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark setup-create__modal">
        <div className="setup-create__modal__heading">
          <div className="setup-create__modal__heading__label">
            {modalTitle}
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={
              setupStore.createOrImportProjectState === ACTION_STATE.IN_PROGRESS
            }
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
                {config.options.TEMPORARY__useSDLCProductionProjectsOnly ||
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
                  {projectType === ProjectType.PROTOTYPE ? 'Name' : 'ID'}
                </div>
                <div className="panel__content__form__section__header__prompt">
                  {projectType === ProjectType.PROTOTYPE
                    ? 'Name used for prototype project'
                    : 'The supplied ID need not be the same as what the final project id will be; it need only be sufficient to identify the project in the underlying system. '}
                </div>
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
                <div className="panel__content__form__section__header__prompt">
                  Description of the project
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
                    CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
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
                              <MdModeEdit />
                            </button>
                            <button
                              className="panel__content__form__section__list__item__remove-btn"
                              onClick={deleteValue(idx)}
                              tabIndex={-1}
                            >
                              <FaTimes />
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
  const isFetchingProjects = loadProjectsState === ACTION_STATE.IN_PROGRESS;
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceNameInputRef = useRef<HTMLInputElement>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(
    setupStore.currentProjectId,
  );
  const [workspaceName, setWorkspaceName] = useState('');
  const projectOptions = setupStore.projectOptions;
  const selectedOption =
    projectOptions.find((option) => option.value === currentProjectId) ?? null;
  const dispatchingActions =
    createWorkspaceState === ACTION_STATE.IN_PROGRESS ||
    createOrImportProjectState === ACTION_STATE.IN_PROGRESS;
  const onSelectionChange = (val: ProjectSelectOption | null): void => {
    if (
      (val !== null || selectedOption !== null) &&
      (!val || !selectedOption || val.value !== selectedOption.value)
    ) {
      setCurrentProjectId(val?.value);
      workspaceNameInputRef.current?.focus();
    }
  };
  const projectSelectorPlaceHolder = isFetchingProjects
    ? 'Loading projects'
    : loadProjectsState === ACTION_STATE.FAILED
    ? 'Error fetching Projects'
    : projectOptions.length
    ? 'Choose an existing project'
    : 'You have no projects, please create or acquire access for at least one';

  const closeModal = (): void => {
    setupStore.setCreateWorkspaceModal(false);
  };
  const createWorkspace = (): void => {
    if (currentProjectId && workspaceName) {
      setupStore
        .createWorkspace(currentProjectId, workspaceName)
        .catch(applicationStore.alertIllegalUnhandledError);
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

  return (
    <Dialog
      open={showCreateWorkspaceModal}
      onClose={closeModal}
      onEnter={handleEnter}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark setup-create__modal">
        <div className="modal__title">Create Workspace</div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={
              setupStore.createWorkspaceState === ACTION_STATE.IN_PROGRESS
            }
          />
          <div className="setup-create__form setup-create__form__workspace">
            <CustomSelectorInput
              className="setup-selector__input"
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
              placeholder={projectSelectorPlaceHolder}
              isClearable={true}
              escapeClearsValue={true}
              darkMode={true}
            />
            <input
              className="setup-create__form__workspace-name__input"
              ref={workspaceNameInputRef}
              spellCheck={false}
              disabled={dispatchingActions}
              placeholder={'Workspace Name'}
              value={workspaceName}
              onChange={changeWorkspaceName}
              name={`Type workspace name`}
            />
          </div>
          <button
            disabled={dispatchingActions || !workspaceName || !currentProjectId}
            className="btn u-pull-right"
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
  const applicationStore = useApplicationStore();
  const config = applicationStore.config;
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceSelectorRef = useRef<SelectComponent>(null);
  const proceedButtonRef = useRef<HTMLButtonElement>(null);
  const isCreatingWorkspace =
    setupStore.createWorkspaceState === ACTION_STATE.IN_PROGRESS;
  const isCreatingOrImportingProject =
    setupStore.createOrImportProjectState === ACTION_STATE.IN_PROGRESS;
  const disableProceedButton =
    !setupStore.currentProjectId ||
    !setupStore.currentWorkspaceId ||
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
    setupStore.setCreateProjectModal(true);
  const handleCreateWorkspaceModal = (): void =>
    setupStore.setCreateWorkspaceModal(true);
  const handleProceed = (): void => {
    if (
      setupStore.currentProjectId &&
      setupStore.currentProject &&
      setupStore.currentWorkspaceId &&
      setupStore.currentWorkspace
    ) {
      applicationStore.historyApiClient.push(
        generateEditorRoute(
          applicationStore.config.sdlcServerKey,
          setupStore.currentProjectId,
          setupStore.currentWorkspaceId,
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
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="setup">
          <div
            className="setup__content"
            data-testid={CORE_TEST_ID.SETUP__CONTENT}
          >
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
                Next
              </button>
              <button
                className="setup__view-project-btn u-pull-right"
                onClick={(): void => {
                  if (setupStore.currentProjectId) {
                    applicationStore.historyApiClient.push(
                      generateViewProjectRoute(
                        applicationStore.config.sdlcServerKey,
                        setupStore.currentProjectId,
                      ),
                    );
                  }
                }}
                disabled={!setupStore.currentProjectId}
              >
                View Project
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
          <NotificationSnackbar />
        </div>
      </div>
    </div>
  );
});

export const SetupInner = observer(() => {
  const params = useParams<SetupRouteParams>();
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();

  useEffect(() => {
    setupStore.setCurrentProjectId(params.projectId);
    setupStore.setCurrentWorkspaceId(params.workspaceId);
  }, [setupStore, params]);

  useEffect(() => {
    setupStore
      .fetchProjects()
      .catch(applicationStore.alertIllegalUnhandledError);
    if (setupStore.currentProjectId) {
      setupStore
        .fetchWorkspaces(setupStore.currentProjectId)
        .catch(applicationStore.alertIllegalUnhandledError);
    }
  }, [applicationStore, setupStore]);

  return <SetupSelection />;
});

export const Setup: React.FC = () => (
  <SetupStoreProvider>
    <SetupInner />
  </SetupStoreProvider>
);
