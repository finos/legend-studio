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

import { forwardRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
import {
  clsx,
  AssistantIcon,
  CustomSelectorInput,
  ExternalLinkIcon,
  ShareIcon,
  Dialog,
  PanelLoadingIndicator,
  PencilIcon,
  SyncIcon,
  TimesIcon,
  InfoCircleIcon,
  PanelContent,
  Modal,
  ModalBody,
  ModalFooter,
  ContextMenu,
  UserIcon,
  UsersIcon,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelForm,
  Button,
  Panel,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import {
  type SetupPathParams,
  generateEditorRoute,
  LEGEND_STUDIO_PATH_PARAM_TOKEN,
  generateViewProjectRoute,
  generateViewVersionRoute,
  generateReviewRoute,
} from '../../../stores/LegendStudioRouter.js';
import { flowResult } from 'mobx';
import {
  useApplicationNavigationContext,
  useApplicationStore,
  useParams,
} from '@finos/legend-application';
import { ActivityBarMenu } from '../ActivityBar.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../stores/LegendStudioApplicationNavigationContext.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioBaseStoreProvider.js';
import {
  NewVersionType,
  type Version,
  type Workspace,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import { PROJECT_OVERVIEW_ACTIVITY_MODE } from '../../../stores/sidebar-state/ProjectOverviewState.js';
import { EditorStoreProvider, useEditorStore } from '../EditorStoreProvider.js';
import type { EditorStore } from '../../../stores/EditorStore.js';

interface ProjectOverviewActivityDisplay {
  mode: PROJECT_OVERVIEW_ACTIVITY_MODE;
  title: string;
}

const withEditorStore = (WrappedComponent: React.FC): React.FC =>
  function WithEditorStore() {
    return (
      <EditorStoreProvider>
        <WrappedComponent />
      </EditorStoreProvider>
    );
  };

const ShareProjectModal = observer(
  (props: {
    editorStore: EditorStore;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { editorStore, open, closeModal } = props;
    const applicationStore = useLegendStudioApplicationStore();
    const versions = editorStore.sdlcState.projectVersions;
    const isDispatchingAction = editorStore.sdlcState.isFetchingProjectVersions;
    const isFetchingProject = editorStore.sdlcState.isFetchingProject;
    const [selectedVersion, setSelectedVersion] = useState<
      Version | undefined
    >();
    const projectId = editorStore.sdlcState.activeProject.projectId;
    const projectLink = selectedVersion
      ? applicationStore.navigator.generateAddress(
          generateViewVersionRoute(projectId, selectedVersion.id.id),
        )
      : applicationStore.navigator.generateAddress(
          generateViewProjectRoute(projectId),
        );
    const copyProjectElementLink = (): void => {
      applicationStore
        .copyTextToClipboard(projectLink)
        .then(() =>
          applicationStore.notifySuccess(
            'Copied project element link to clipboard',
          ),
        )
        .catch(applicationStore.alertUnhandledError)
        .finally(() => closeModal());
    };
    const renderOptions = versions.map((version) => ({
      label: version.id.id,
      value: version,
    }));
    const onSelectionChange = (
      val: { label: string; value: Version } | null,
    ): void => setSelectedVersion(val?.value);

    return (
      <Dialog onClose={closeModal} open={open}>
        <Modal darkMode={true} className="modal--no-padding">
          <PanelLoadingIndicator isLoading={isDispatchingAction} />
          <ModalBody>
            <div className="project-overview__share-project__modal__info-entry">
              <div className="project-overview__share-project__modal__info-entry__title">
                Version:
              </div>
              <div className="project-overview__share-project__modal__info-entry__value">
                {versions.length > 0 ? (
                  <div className="project-overview__share-project__modal__select">
                    <CustomSelectorInput
                      className="setup-selector__input"
                      options={renderOptions}
                      disabled={isDispatchingAction || !versions.length}
                      onChange={onSelectionChange}
                      value={
                        selectedVersion
                          ? {
                              label: selectedVersion.id.id,
                              value: selectedVersion,
                            }
                          : null
                      }
                      darkMode={true}
                    />
                  </div>
                ) : (
                  'Project has only one version'
                )}
              </div>
            </div>
            <div className="project-overview__share-project__modal__info-entry">
              <div className="project-overview__share-project__modal__info-entry__title">
                Link:
              </div>
              <div className="project-overview__share-project__modal__info-entry__value">
                <a href={projectLink} target="_blank" rel="noopener noreferrer">
                  {projectLink}
                </a>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              className="btn--wide btn--dark"
              disabled={isFetchingProject}
              onClick={copyProjectElementLink}
            >
              Copy Link
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const ProjectOverviewActivityBar = observer(
  (props: { editorStore: EditorStore }) => {
    const { editorStore } = props;
    const projectOverviewState = editorStore.projectOverviewState;

    const changeActivity =
      (activity: PROJECT_OVERVIEW_ACTIVITY_MODE): (() => void) =>
      (): void =>
        projectOverviewState.setActivityMode(activity);
    const activities: ProjectOverviewActivityDisplay[] = [
      { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW, title: 'Overview' },
      {
        mode: PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE,
        title: 'Release',
      },
      { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.VERSIONS, title: 'Versions' },
      { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.WORKSPACES, title: 'Workspaces' },
    ].filter((activity): activity is ProjectOverviewActivityDisplay =>
      Boolean(activity),
    );

    return (
      <>
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.PROJECT_OVERVIEW__ACTIVITY_BAR}
          className="panel__header"
        >
          <div className="project-configuration-editor__tabs">
            {activities.map((activity) => (
              <button
                key={activity.mode}
                className={clsx('project-configuration-editor__tab', {
                  'project-configuration-editor__tab--active':
                    activity.mode === projectOverviewState.activityMode,
                })}
                onClick={changeActivity(activity.mode)}
                tabIndex={-1}
                title={activity.title}
              >
                {activity.mode}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  },
);

const WorkspaceViewerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      workspace: Workspace;
    }
  >(function WorkspaceViewerContextMenu(props, ref) {
    const { workspace } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const deleteWorkspace = applicationStore.guardUnhandledError(() =>
      flowResult(editorStore.projectOverviewState.deleteWorkspace(workspace)),
    );

    return (
      <div ref={ref} className="project-overview__context-menu">
        <div
          className="project-overview__context-menu__item"
          onClick={deleteWorkspace}
        >
          Delete
        </div>
      </div>
    );
  }),
);

const WorkspaceViewer = observer((props: { workspace: Workspace }) => {
  const { workspace } = props;
  const applicationStore = useApplicationStore();
  const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
    useState(false);
  const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
  const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
  return (
    <ContextMenu
      content={<WorkspaceViewerContextMenu workspace={workspace} />}
      menuProps={{ elevation: 7 }}
      onOpen={onContextMenuOpen}
      onClose={onContextMenuClose}
    >
      <button
        className={clsx('side-bar__panel__item project-overview__item__link', {
          'project-overview__item__link--selected-from-context-menu':
            isSelectedFromContextMenu,
        })}
        tabIndex={-1}
        onClick={(): void =>
          applicationStore.navigator.visitAddress(
            applicationStore.navigator.generateAddress(
              generateEditorRoute(
                workspace.projectId,
                workspace.workspaceId,
                workspace.workspaceType,
              ),
            ),
          )
        }
        title="See workspace"
      >
        <div className="project-overview__item__link__content project-overview__workspace__viewer">
          <div className="project-overview__workspace__viewer-icon">
            {workspace.workspaceType === WorkspaceType.GROUP ? (
              <UsersIcon />
            ) : (
              <UserIcon />
            )}
          </div>
          <div className="project-overview__item__link__content__name">
            {workspace.workspaceId}
          </div>
        </div>
      </button>
    </ContextMenu>
  );
});

const WorkspacesViewer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const projectOverviewState = editorStore.projectOverviewState;

  const workspaces = projectOverviewState.projectWorkspaces;
  const isDispatchingAction =
    projectOverviewState.isDeletingWorkspace ||
    projectOverviewState.isFetchingProjectWorkspaces;

  // since this can be affected by other users, we refresh it more proactively
  useEffect(() => {
    flowResult(projectOverviewState.fetchProjectWorkspaces()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, projectOverviewState]);

  return (
    <Panel className="project-overview__panel">
      <PanelHeader content={PROJECT_OVERVIEW_ACTIVITY_MODE.WORKSPACES}>
        <div
          className="side-bar__panel__header__changes-count"
          data-testid={
            LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
          }
        >
          {workspaces.length}
        </div>
      </PanelHeader>

      <div className=" project-overview__poanel__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_LIST}
          className="panel__content__list"
        >
          {workspaces.map((workspace) => (
            <WorkspaceViewer
              key={`${workspace.workspaceType}.${workspace.workspaceId}`}
              workspace={workspace}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
});

const ReleaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const projectOverviewState = editorStore.projectOverviewState;
  const commitedReviews =
    projectOverviewState.committedReviewsBetweenMostRecentVersionAndProjectLatest;
  const isDispatchingAction =
    projectOverviewState.isFetchingLatestVersion ||
    projectOverviewState.isFetchingCurrentProjectRevision ||
    projectOverviewState.isCreatingVersion;
  const { latestProjectVersion, currentProjectRevision } = projectOverviewState;
  const revisionInput = projectOverviewState.releaseVersion;
  const createMajorRelease = applicationStore.guardUnhandledError(() =>
    flowResult(projectOverviewState.createVersion(NewVersionType.MAJOR)),
  );
  const createMinorRelease = applicationStore.guardUnhandledError(() =>
    flowResult(projectOverviewState.createVersion(NewVersionType.MINOR)),
  );
  const createPatchRelease = applicationStore.guardUnhandledError(() =>
    flowResult(projectOverviewState.createVersion(NewVersionType.PATCH)),
  );
  const changeNotes: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
    revisionInput.setNotes(event.target.value);
  const notFetchedLatestVersionAndCurrentRevision =
    latestProjectVersion === undefined || currentProjectRevision === undefined;
  const isCurrentProjectVersionLatest =
    Boolean(latestProjectVersion) &&
    latestProjectVersion?.revisionId === currentProjectRevision?.id;
  const canCreateVersion =
    !isCurrentProjectVersionLatest &&
    !isDispatchingAction &&
    editorStore.sdlcServerClient.features.canCreateVersion;

  // since this can be affected by other users, we refresh it more proactively
  useEffect(() => {
    flowResult(projectOverviewState.fetchLatestProjectVersion()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, projectOverviewState]);

  return (
    <Panel className="project-overview__panel">
      <PanelHeader content={PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE} />
      <div className=" project-overview__release__panel__content project-overview__release__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="project-overview__release__editor">
          <textarea
            className="project-overview__release__editor__input input--dark"
            spellCheck={false}
            disabled={!canCreateVersion}
            value={revisionInput.notes}
            onChange={changeNotes}
            placeholder="Release notes"
          />
          <div className="project-overview__release__editor__actions">
            <button
              className="project-overview__release__editor__action btn--dark btn--caution"
              onClick={createMajorRelease}
              disabled={!canCreateVersion}
              title={
                'Create a major release which comes with backward-incompatible features'
              }
            >
              MAJOR
            </button>
            <button
              className="project-overview__release__editor__action btn--dark"
              onClick={createMinorRelease}
              disabled={!canCreateVersion}
              title={
                'Create a minor release which comes with backward-compatible features'
              }
            >
              MINOR
            </button>
            <button
              className="project-overview__release__editor__action btn--dark"
              onClick={createPatchRelease}
              disabled={!canCreateVersion}
              title={
                'Create a patch release which comes with backward-compatible bug fixes'
              }
            >
              PATCH
            </button>
          </div>
        </div>
        {!notFetchedLatestVersionAndCurrentRevision && (
          <div className="project-overview__release__info">
            <div className="panel project-overview__release__info__current-version__container">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    LATEST RELEASE
                  </div>
                </div>
              </div>
              <PanelContent>
                {latestProjectVersion && (
                  <div className="project-overview__release__info__current-version">
                    <button
                      className="project-overview__release__info__current-version__link"
                      tabIndex={-1}
                      onClick={(): void =>
                        applicationStore.navigator.visitAddress(
                          applicationStore.navigator.generateAddress(
                            generateViewVersionRoute(
                              latestProjectVersion.projectId,
                              latestProjectVersion.id.id,
                            ),
                          ),
                        )
                      }
                      title="See version"
                    >
                      <div className="project-overview__release__info__current-version__link__content">
                        <span className="project-overview__release__info__current-version__link__content__name">
                          {latestProjectVersion.id.id}
                        </span>
                        <span className="project-overview__release__info__current-version__link__content__info">
                          {latestProjectVersion.notes}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
                {!latestProjectVersion && (
                  <div className="project-overview__release__info__current-version">
                    <span className="project-overview__release__info__current-version__no-version">
                      This project has no release
                    </span>
                  </div>
                )}
              </PanelContent>
            </div>
            <div className="panel project-overview__release__info__reviews">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    COMMITTED REVIEWS
                  </div>
                  <div
                    className="side-bar__panel__title__info"
                    title="All committed reviews in the project since the latest release"
                  >
                    <InfoCircleIcon />
                  </div>
                </div>
                <div
                  className="side-bar__panel__header__changes-count"
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
                  }
                >
                  {commitedReviews.length}
                </div>
              </div>
              <PanelContent>
                {commitedReviews.map((review) => (
                  <button
                    key={review.id}
                    className="side-bar__panel__item workspace-updater__review__link"
                    tabIndex={-1}
                    onClick={(): void =>
                      applicationStore.navigator.visitAddress(
                        applicationStore.navigator.generateAddress(
                          generateReviewRoute(review.projectId, review.id),
                        ),
                      )
                    }
                    title="See review"
                  >
                    <div className="workspace-updater__review">
                      <span className="workspace-updater__review__name">
                        {review.title}
                      </span>
                      <span className="workspace-updater__review__info">
                        {review.author.name}
                      </span>
                    </div>
                  </button>
                ))}
              </PanelContent>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
});

const VersionsViewer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const versions = editorStore.sdlcState.projectVersions;
  const isDispatchingAction = editorStore.sdlcState.isFetchingProjectVersions;

  // since this can be affected by other users, we refresh it more proactively
  useEffect(() => {
    flowResult(editorStore.sdlcState.fetchProjectVersions()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, editorStore]);

  return (
    <Panel className="project-overview__panel">
      <PanelHeader content={PROJECT_OVERVIEW_ACTIVITY_MODE.VERSIONS}>
        <div
          className="side-bar__panel__header__changes-count"
          data-testid={
            LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
          }
        >
          {versions.length}
        </div>
      </PanelHeader>
      <div>
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel__content__list">
          {versions.map((version) => (
            <button
              key={version.id.id}
              className="side-bar__panel__item project-overview__item__link"
              tabIndex={-1}
              onClick={(): void =>
                applicationStore.navigator.visitAddress(
                  applicationStore.navigator.generateAddress(
                    generateViewVersionRoute(version.projectId, version.id.id),
                  ),
                )
              }
              title="See version"
            >
              <div className="project-overview__item__link__content">
                <span className="project-overview__item__link__content__name">
                  {version.id.id}
                </span>
                <span className="project-overview__item__link__content__info">
                  {version.notes}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
});

const OverviewViewer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();

  const projectOverviewState = editorStore.projectOverviewState;

  const params = useParams<SetupPathParams>();

  const projectId = params[LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID] ?? '';

  const sdlcState = editorStore.sdlcState;
  const initialName = sdlcState.currentProject?.name ?? '';
  const initialDescription = sdlcState.currentProject?.description ?? '';

  const initialTags = sdlcState.currentProject?.tags ?? [];
  const isDispatchingAction = projectOverviewState.isUpdatingProject;
  const [projectIdentifier, setProjectIdentifier] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const [itemValue, setItemValue] = useState<string>('');
  const [tagsArray, setTagsArray] = useState<Array<string>>(initialTags);

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
      if (typeof showEditInput === 'number' && showEditInput > idx) {
        setShowEditInput(showEditInput - 1);
      }
    };

  const handleUpdate = (): void => {
    flowResult(
      projectOverviewState.updateProject(
        projectIdentifier,
        description,
        tagsArray,
      ),
    ).catch(applicationStore.alertUnhandledError);
  };

  useEffect(() => {
    flowResult(
      editorStore.sdlcState.fetchCurrentProject(projectId, {
        suppressNotification: true,
      }),
    )
      .then(() => {
        if (editorStore.sdlcState.currentProject) {
          setDescription(editorStore.sdlcState.currentProject.description);
          setProjectIdentifier(editorStore.sdlcState.currentProject.name);
        }
      })
      .catch(applicationStore.alertUnhandledError);
  }, [editorStore, projectId, applicationStore, projectOverviewState]);

  return (
    <Panel className="project-overview__panel">
      <div className="">
        <PanelHeader content={PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW}>
          <Button
            className="panel__header__action side-bar__header__action local-changes__sync-btn"
            onClick={handleUpdate}
            title="Update project"
            tabIndex={-1}
          >
            <SyncIcon />
          </Button>
        </PanelHeader>
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <PanelForm>
          <PanelFormTextField
            name="Project Name"
            value={projectIdentifier}
            isReadOnly={false}
            update={(value: string | undefined): void => {
              setProjectIdentifier(value ?? '');
            }}
          />
          <PanelFormTextField
            name="Description"
            prompt="Description of the project"
            value={description}
            isReadOnly={false}
            update={(value: string | undefined): void => {
              setDescription(value ?? '');
            }}
          />
          <PanelFormSection>
            <div>
              <div className="panel__content__form__section__header__label">
                Tags
              </div>
              <div className="panel__content__form__section__header__prompt">
                List of annotations to categorize projects
              </div>
              <div className="panel__content__form__section__list">
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
                        title="TAG INPUT"
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
                    <Button
                      className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                      onClick={showAddItemInput}
                    >
                      Add Value
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </PanelFormSection>
        </PanelForm>
      </div>
    </Panel>
  );
});

export const ProjectOverview = withEditorStore(
  observer(() => {
    const params = useParams<SetupPathParams>();
    const projectId = params[LEGEND_STUDIO_PATH_PARAM_TOKEN.PROJECT_ID] ?? '';
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();

    const [openShareModal, setOpenShareModal] = useState(false);
    const showShareModal = (): void => setOpenShareModal(true);
    const hideShareModal = (): void => setOpenShareModal(false);
    const projectOverviewState = editorStore.projectOverviewState;

    useEffect(() => {
      if (projectId && editorStore.sdlcState.currentProject === undefined) {
        flowResult(
          editorStore.sdlcState.fetchCurrentProject(projectId, {
            suppressNotification: true,
          }),
        ).catch(applicationStore.alertUnhandledError);
      } else {
        flowResult(projectOverviewState.fetchProjectWorkspaces()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    }, [
      editorStore.sdlcState,
      projectId,
      applicationStore,
      projectOverviewState,
    ]);

    const openProjectWebUrl = (): void =>
      applicationStore.navigator.visitAddress(
        editorStore.sdlcState.activeProject.webUrl,
      );

    const renderOverview = (): React.ReactNode => {
      switch (projectOverviewState.activityMode) {
        case PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW:
          return <OverviewViewer />;
        case PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE:
          return <ReleaseEditor />;
        case PROJECT_OVERVIEW_ACTIVITY_MODE.VERSIONS:
          return <VersionsViewer />;
        case PROJECT_OVERVIEW_ACTIVITY_MODE.WORKSPACES:
          return <WorkspacesViewer />;
        default:
          return null;
      }
    };

    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SETUP,
    );

    return (
      <div className="app__page">
        <div className="project-overview">
          <div className="project-overview__body">
            <div className="activity-bar">
              <ActivityBarMenu />
            </div>
            <div className="project-overview__container">
              <div className="panel project-overview">
                <PanelHeader
                  title="Project"
                  content={editorStore.sdlcState.currentProject?.name ?? ''}
                >
                  <PanelHeaderActions>
                    <PanelHeaderActionItem
                      disabled={!editorStore.sdlcState.currentProject}
                      className="side-bar__header__action"
                      title="Share..."
                      onClick={showShareModal}
                    >
                      <ShareIcon />
                    </PanelHeaderActionItem>
                    <PanelHeaderActionItem
                      disabled={!editorStore.sdlcState.currentProject}
                      className="side-bar__header__action"
                      title="Go to project in underlying VCS system"
                      onClick={openProjectWebUrl}
                    >
                      <ExternalLinkIcon />
                    </PanelHeaderActionItem>
                  </PanelHeaderActions>
                </PanelHeader>
                <ProjectOverviewActivityBar editorStore={editorStore} />
                {renderOverview()}
                {editorStore.sdlcState.currentProject && (
                  <ShareProjectModal
                    editorStore={editorStore}
                    open={openShareModal}
                    closeModal={hideShareModal}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="editor__status-bar">
            <div className="editor__status-bar__left"></div>
            <div className="editor__status-bar__right">
              <button
                className={clsx(
                  'editor__status-bar__action editor__status-bar__action__toggler',
                  {
                    'editor__status-bar__action__toggler--active':
                      !applicationStore.assistantService.isHidden,
                  },
                )}
                onClick={toggleAssistant}
                tabIndex={-1}
                title="Toggle assistant"
              >
                <AssistantIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
