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

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../stores/EditorStore';
import { CORE_TEST_ID } from '../../../const';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';
import { MdModeEdit } from 'react-icons/md';
import { GoSync } from 'react-icons/go';
import { Link } from 'react-router-dom';
import { VERSION_TYPE } from '../../../models/sdlc/models/version/CreateVersionCommand';
import {
  clsx,
  PanelLoadingIndicator,
  ContextMenu,
} from '@finos/legend-studio-components';
import { PROJECT_OVERVIEW_ACTIVITY_MODE } from '../../../stores/sidebar-state/ProjectOverviewState';
import type { Workspace } from '../../../models/sdlc/models/workspace/Workspace';
import {
  generateEditorRoute,
  generateViewVersionRoute,
  generateReviewRoute,
} from '../../../stores/Router';
import { useApplicationStore } from '../../../stores/ApplicationStore';

const WorkspaceViewerContextMenu = observer<
  {
    workspace: Workspace;
  },
  HTMLDivElement
>(
  (props, ref) => {
    const { workspace } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const deleteWorkspace = applicationStore.guaranteeSafeAction(() =>
      editorStore.projectOverviewState.deleteWorkspace(workspace.workspaceId),
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
  },
  { forwardRef: true },
);

const WorkspaceViewer = observer((props: { workspace: Workspace }) => {
  const { workspace } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const isActive =
    editorStore.sdlcState.currentWorkspaceId === workspace.workspaceId;
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
      <Link
        className={clsx(
          'side-bar__panel__item project-overview__item__link',
          {
            'project-overview__item__link--selected-from-context-menu':
              isSelectedFromContextMenu && !isActive,
          },
          { 'project-overview__item__link--active': isActive },
        )}
        rel="noopener noreferrer"
        target="_blank"
        to={generateEditorRoute(
          applicationStore.config.sdlcServerKey,
          workspace.projectId,
          workspace.workspaceId,
        )}
        title={'Go to workspace detail'}
      >
        <div className="project-overview__item__link__content">
          <span className="project-overview__item__link__content__name">
            {workspace.workspaceId}
          </span>
        </div>
      </Link>
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
    projectOverviewState
      .fetchProjectWorkspaces()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, projectOverviewState]);

  return (
    <div className="panel side-bar__panel project-overview__panel project-overview__workspaces">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">
            {PROJECT_OVERVIEW_ACTIVITY_MODE.WORKSPACES}
          </div>
        </div>
        <div
          className="side-bar__panel__header__changes-count"
          data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
        >
          {workspaces.length}
        </div>
      </div>
      <div className="panel__content project-overview__panel__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div
          data-testid={CORE_TEST_ID.PANEL_CONTENT_LIST}
          className="panel__content__list"
        >
          {workspaces.map((workspace) => (
            <WorkspaceViewer
              key={workspace.workspaceId}
              workspace={workspace}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const ReleaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const projectOverviewState = editorStore.projectOverviewState;
  const sdlcState = editorStore.sdlcState;
  const commitedReviews =
    projectOverviewState.committedReviewsBetweenMostRecentVersionAndProjectLatest;
  const isDispatchingAction =
    projectOverviewState.isFetchingLatestVersion ||
    projectOverviewState.isFetchingCurrentProjectRevision ||
    projectOverviewState.isCreatingVersion;
  const { latestProjectVersion, currentProjectRevision } = projectOverviewState;
  const revisionInput = projectOverviewState.releaseVersion;
  const createMajorRelease = applicationStore.guaranteeSafeAction(() =>
    projectOverviewState.createVersion(VERSION_TYPE.MAJOR),
  );
  const createMinorRelease = applicationStore.guaranteeSafeAction(() =>
    projectOverviewState.createVersion(VERSION_TYPE.MINOR),
  );
  const createPatchRelease = applicationStore.guaranteeSafeAction(() =>
    projectOverviewState.createVersion(VERSION_TYPE.PATCH),
  );
  const changeNotes: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
    revisionInput.setNotes(event.target.value);
  const isCurrentProjectVersionLatest =
    Boolean(latestProjectVersion) &&
    latestProjectVersion?.revisionId === currentProjectRevision?.id;
  const notFetchedLatestVersionAndCurrentRevision =
    latestProjectVersion === undefined || currentProjectRevision === undefined;

  // since this can be affected by other users, we refresh it more proactively
  useEffect(() => {
    projectOverviewState
      .fetchLatestProjectVersion()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, projectOverviewState]);

  if (!sdlcState.isCurrentProjectInProduction) {
    return (
      <div className="panel__content project-overview__release--empty">
        Release is only supported for PROD projects
      </div>
    );
  }
  return (
    <div className="panel side-bar__panel project-overview__panel project-overview__release">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">
            {PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE}
          </div>
        </div>
      </div>
      <div className="panel__content project-overview__release__panel__content project-overview__release__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="project-overview__release__editor">
          <textarea
            className="project-overview__release__editor__input input--dark"
            spellCheck={false}
            disabled={isCurrentProjectVersionLatest || isDispatchingAction}
            value={revisionInput.notes}
            onChange={changeNotes}
            placeholder={'Release notes'}
          />
          <div className="project-overview__release__editor__actions">
            <button
              className="project-overview__release__editor__action btn--dark btn--caution"
              onClick={createMajorRelease}
              disabled={isCurrentProjectVersionLatest || isDispatchingAction}
              title={
                'Create a major release which comes with backward-incompatible features'
              }
            >
              MAJOR
            </button>
            <button
              className="project-overview__release__editor__action btn--dark"
              onClick={createMinorRelease}
              disabled={isCurrentProjectVersionLatest || isDispatchingAction}
              title={
                'Create a minor release which comes with backward-compatible features'
              }
            >
              MINOR
            </button>
            <button
              className="project-overview__release__editor__action btn--dark"
              onClick={createPatchRelease}
              disabled={isCurrentProjectVersionLatest || isDispatchingAction}
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
              <div className="panel__content">
                {latestProjectVersion && (
                  <div className="project-overview__release__info__current-version">
                    <Link
                      className="project-overview__release__info__current-version__link"
                      rel="noopener noreferrer"
                      target="_blank"
                      to={generateViewVersionRoute(
                        applicationStore.config.sdlcServerKey,
                        latestProjectVersion.projectId,
                        latestProjectVersion.id.id,
                      )}
                    >
                      <div className="project-overview__release__info__current-version__link__content">
                        <span className="project-overview__release__info__current-version__link__content__name">
                          {latestProjectVersion.id.id}
                        </span>
                        <span className="project-overview__release__info__current-version__link__content__info">
                          {latestProjectVersion.notes}
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
                {!latestProjectVersion && (
                  <div className="project-overview__release__info__current-version">
                    <span className="project-overview__release__info__current-version__no-version">
                      This project has no release
                    </span>
                  </div>
                )}
              </div>
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
                    <FaInfoCircle />
                  </div>
                </div>
                <div
                  className="side-bar__panel__header__changes-count"
                  data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
                >
                  {commitedReviews.length}
                </div>
              </div>
              <div className="panel__content">
                {commitedReviews.map((review) => (
                  <Link
                    key={review.id}
                    className="side-bar__panel__item workspace-updater__review__link"
                    rel="noopener noreferrer"
                    target="_blank"
                    to={generateReviewRoute(
                      applicationStore.config.sdlcServerKey,
                      review.projectId,
                      review.id,
                    )}
                    title={'See review detail'}
                  >
                    <div className="workspace-updater__review">
                      <span className="workspace-updater__review__name">
                        {review.title}
                      </span>
                      <span className="workspace-updater__review__info">
                        {review.author.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const VersionsViewer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const versions = editorStore.sdlcState.projectVersions;
  const isDispatchingAction = editorStore.sdlcState.isFetchingProjectVersions;

  // since this can be affected by other users, we refresh it more proactively
  useEffect(() => {
    editorStore.sdlcState
      .fetchProjectVersions()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, editorStore]);

  return (
    <div className="panel side-bar__panel project-overview__panel project-overview__versions">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">
            {PROJECT_OVERVIEW_ACTIVITY_MODE.VERSIONS}
          </div>
        </div>
        <div
          className="side-bar__panel__header__changes-count"
          data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
        >
          {versions.length}
        </div>
      </div>
      <div className="panel__content project-overview__panel__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel__content__list">
          {versions.map((version) => (
            <Link
              key={version.id.id}
              className="side-bar__panel__item project-overview__item__link"
              rel="noopener noreferrer"
              target="_blank"
              to={generateViewVersionRoute(
                applicationStore.config.sdlcServerKey,
                version.projectId,
                version.id.id,
              )}
              title={'See version detail'}
            >
              <div className="project-overview__item__link__content">
                <span className="project-overview__item__link__content__name">
                  {version.id.id}
                </span>
                <span className="project-overview__item__link__content__info">
                  {version.notes}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

const OverviewViewer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const projectOverviewState = editorStore.projectOverviewState;
  const sdlcState = editorStore.sdlcState;
  const initialName = sdlcState.currentProject?.name ?? '';
  const initialDescription = sdlcState.currentProject?.description ?? '';
  const initialTags = sdlcState.currentProject?.tags ?? [];
  const isDispatchingAction = projectOverviewState.isUpdatingProject;
  const [projectIdentifier, setProjectIdentifier] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [itemValue, setItemValue] = useState<string>('');
  const [tagsArray, setTagsArray] = useState<Array<string>>(initialTags);
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    setDescription(event.target.value);
  };
  const changeProjectIdentifier: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setProjectIdentifier(event.target.value);
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
  const handleUpdate = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ): void => {
    event.preventDefault();
    projectOverviewState
      .updateProject(projectIdentifier, description, tagsArray)
      .catch(applicationStore.alertIllegalUnhandledError);
  };

  return (
    <div className="panel side-bar__panel project-overview__panel project-overview__overview">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">
            {PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW}
          </div>
        </div>
        <button
          className="panel__header__action side-bar__header__action local-changes__sync-btn"
          onClick={handleUpdate}
          tabIndex={-1}
          title="Update project"
        >
          <GoSync />
        </button>
      </div>
      <div className="panel__content project-overview__panel__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Name
            </div>
            <div className="panel__content__form__section__header__prompt">
              Name used for the project
            </div>
            <input
              className="panel__content__form__section__input"
              title="Project Name"
              spellCheck={false}
              value={projectIdentifier}
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
              title="PROJECT DESCRIPTION"
              spellCheck={false}
              value={description}
              onChange={changeDescription}
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
              data-testid={CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}
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
        </div>
      </div>
    </div>
  );
});
interface ProjectOverviewActivityDisplay {
  mode: PROJECT_OVERVIEW_ACTIVITY_MODE;
  title: string;
}

export const ProjectOverviewActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const projectOverviewState = editorStore.projectOverviewState;
  const changeActivity =
    (activity: PROJECT_OVERVIEW_ACTIVITY_MODE): (() => void) =>
    (): void =>
      projectOverviewState.setActivityMode(activity);
  const activities: ProjectOverviewActivityDisplay[] = [
    { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW, title: 'Overview' },
    editorStore.sdlcState.isCurrentProjectInProduction && {
      mode: PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE,
      title: 'Release',
    },
    { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.VERSIONS, title: 'Versions' },
    { mode: PROJECT_OVERVIEW_ACTIVITY_MODE.WORKSPACES, title: 'Workspaces' },
  ].filter((activity): activity is ProjectOverviewActivityDisplay =>
    Boolean(activity),
  );

  return (
    <div
      data-testid={CORE_TEST_ID.PROJECT_OVERVIEW__ACTIVITY_BAR}
      className="project-overview__activity-bar"
    >
      <div className="project-overview__activity-bar__items">
        {activities.map((activity) => (
          <div
            key={activity.mode}
            className={clsx('project-overview__activity-bar__item', {
              'project-overview__activity-bar__item--active':
                activity.mode === projectOverviewState.activityMode,
            })}
            onClick={changeActivity(activity.mode)}
            tabIndex={-1}
            title={activity.title}
          >
            <div className="project-overview__activity-bar__item-mode">
              {activity.mode}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const ProjectOverview = observer(() => {
  const editorStore = useEditorStore();
  const projectOverviewState = editorStore.projectOverviewState;
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

  // we do not support release for non-prod projects
  useEffect(() => {
    if (
      projectOverviewState.activityMode ===
        PROJECT_OVERVIEW_ACTIVITY_MODE.RELEASE &&
      !editorStore.sdlcState.isCurrentProjectInProduction
    ) {
      projectOverviewState.setActivityMode(
        PROJECT_OVERVIEW_ACTIVITY_MODE.OVERVIEW,
      );
    }
  }, [
    projectOverviewState.activityMode,
    editorStore.sdlcState.isCurrentProjectInProduction,
    projectOverviewState,
  ]);

  return (
    <div className="panel project-overview">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            PROJECT
          </div>
        </div>
      </div>
      <div className="panel__content side-bar__content project-overview__content">
        <ProjectOverviewActivityBar />
        {renderOverview()}
      </div>
    </div>
  );
});
