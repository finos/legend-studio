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

import { observer } from 'mobx-react-lite';
import { ACTIVITY_MODE } from '../../stores/EditorConfig.js';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID.js';
import {
  CheckIcon,
  clsx,
  DropdownMenu,
  RepoIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  GitPullRequestIcon,
  GitMergeIcon,
  CloudDownloadIcon,
  CogIcon,
  CodeBranchIcon,
  EmptyClockIcon,
  WrenchIcon,
  FileTrayIcon,
  MenuIcon,
  MenuContentDivider,
  FlaskIcon,
} from '@finos/legend-art';
import { useEditorStore } from './EditorStoreProvider.js';
import { forwardRef, useState } from 'react';
import { VIRTUAL_ASSISTANT_TAB } from '@finos/legend-application';
import { LegendStudioAppInfo } from '../LegendStudioAppInfo.js';
import { generateSetupRoute } from '../../stores/LegendStudioRouter.js';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';

const SettingsMenu = observer(
  forwardRef<HTMLDivElement, unknown>(function SettingsMenu(props, ref) {
    const editorStore = useEditorStore();
    const toggleDevTool = (): void => {
      editorStore.setDevTool(!editorStore.isDevToolEnabled);
    };

    return (
      <MenuContent ref={ref} className="activity-bar__setting__menu">
        <MenuContentItem onClick={toggleDevTool}>
          <MenuContentItemIcon>
            {editorStore.isDevToolEnabled ? <CheckIcon /> : null}
          </MenuContentItemIcon>
          <MenuContentItemLabel>Show Developer Tool</MenuContentItemLabel>
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

export interface ActivityDisplay {
  mode: ACTIVITY_MODE;
  title: string;
  info?: string;
  icon: React.ReactElement;
}

export const ActivityBarMenu: React.FC = () => {
  const applicationStore = useLegendStudioApplicationStore();
  const appDocUrl = applicationStore.documentationService.url;

  // menu
  const [openMenuDropdown, setOpenMenuDropdown] = useState(false);
  const showMenuDropdown = (): void => setOpenMenuDropdown(true);
  const hideMenuDropdown = (): void => setOpenMenuDropdown(false);
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);
  // documentation
  const goToDocumentation = (): void => {
    if (appDocUrl) {
      applicationStore.navigator.visitAddress(appDocUrl);
    }
  };
  // go to setup page
  const goToWorkspaceSetup = (): void =>
    applicationStore.navigator.visitAddress(
      applicationStore.navigator.generateAddress(generateSetupRoute(undefined)),
    );
  // help
  const openHelp = (): void => {
    applicationStore.assistantService.setIsHidden(false);
    applicationStore.assistantService.setIsOpen(true);
    applicationStore.assistantService.setSelectedTab(
      VIRTUAL_ASSISTANT_TAB.SEARCH,
    );
  };

  return (
    <>
      <DropdownMenu
        className={clsx('app__header__action', {
          'menu__trigger--on-menu-open': openMenuDropdown,
        })}
        onClose={hideMenuDropdown}
        menuProps={{
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          elevation: 7,
        }}
        content={
          <MenuContent className="app__header__menu">
            <MenuContentItem
              className="app__header__menu__item"
              onClick={showAppInfo}
            >
              About
            </MenuContentItem>
            <MenuContentItem
              className="app__header__menu__item"
              onClick={openHelp}
            >
              Help...
            </MenuContentItem>
            <MenuContentItem
              className="app__header__menu__item"
              disabled={!appDocUrl}
              onClick={goToDocumentation}
            >
              See Documentation
            </MenuContentItem>
            <MenuContentDivider />
            <MenuContentItem
              className="app__header__menu__item"
              onClick={goToWorkspaceSetup}
            >
              Back to workspace setup
            </MenuContentItem>
          </MenuContent>
        }
      >
        <div className="activity-bar__menu">
          <button
            className="activity-bar__menu-item"
            tabIndex={-1}
            onClick={showMenuDropdown}
            title="Menu"
          >
            <MenuIcon />
          </button>
        </div>
      </DropdownMenu>
      <LegendStudioAppInfo open={openAppInfo} closeModal={hideAppInfo} />
    </>
  );
};

export const ActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);
  // local changes
  const localChanges =
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length;
  const localChangesDisplayLabel = localChanges > 99 ? '99+' : localChanges;
  const localChangesIndicatorStatusIcon =
    editorStore.graphManagerState.graphBuildState.hasFailed ||
    editorStore.changeDetectionState.initState.hasFailed ? (
      <div />
    ) : !editorStore.changeDetectionState.initState.hasSucceeded ||
      editorStore.changeDetectionState.workspaceLocalLatestRevisionState
        .isBuildingEntityHashesIndex ||
      editorStore.localChangesState.pushChangesState.isInProgress ? (
      <div
        className="activity-bar__item__icon__indicator activity-bar__local-change-counter activity-bar__local-change-counter--waiting"
        data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
      >
        <EmptyClockIcon />
      </div>
    ) : localChanges ? (
      <div
        className="activity-bar__item__icon__indicator activity-bar__local-change-counter"
        data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
      >
        {localChangesDisplayLabel}
      </div>
    ) : (
      <div />
    );
  // conflict resolution changes
  const conflictResolutionChanges =
    editorStore.conflictResolutionState.conflicts.length +
    editorStore.conflictResolutionState.changes.length;
  const conflictResolutionConflicts =
    editorStore.conflictResolutionState.conflicts.length;
  const conflictResolutionChangesDisplayLabel =
    conflictResolutionChanges > 99 ? '99+' : conflictResolutionChanges;
  const conflictResolutionChangesIndicatorStatusIcon =
    !editorStore.isInConflictResolutionMode ? (
      <div />
    ) : !editorStore.changeDetectionState.initState.hasSucceeded ||
      editorStore.changeDetectionState.workspaceBaseRevisionState
        .isBuildingEntityHashesIndex ? (
      <div
        className="activity-bar__item__icon__indicator activity-bar__conflict-resolution-change-counter activity-bar__conflict-resolution-change-counter--waiting"
        data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
      >
        <EmptyClockIcon />
      </div>
    ) : conflictResolutionChanges ? (
      <div
        className="activity-bar__item__icon__indicator activity-bar__conflict-resolution-change-counter"
        data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
      >
        {conflictResolutionChangesDisplayLabel}
      </div>
    ) : (
      <div />
    );
  // review changes
  const reviewChanges =
    editorStore.changeDetectionState.aggregatedWorkspaceChanges.length;
  const reviewChangesIndicatorStatusIcon = !reviewChanges ? (
    <div />
  ) : !editorStore.changeDetectionState.initState.hasSucceeded ||
    editorStore.changeDetectionState.workspaceBaseRevisionState
      .isBuildingEntityHashesIndex ||
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState
      .isBuildingEntityHashesIndex ? (
    <div />
  ) : (
    <div
      className="activity-bar__item__icon__indicator activity-bar__item__icon__indicator__dot activity-bar__item__icon__review-changes__indicator"
      data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
    ></div>
  );
  // project latest changes
  const workspaceUpdateChanges =
    editorStore.changeDetectionState.aggregatedProjectLatestChanges.length;
  const workspaceUpdatePotentialConflicts =
    editorStore.changeDetectionState.potentialWorkspaceUpdateConflicts.length;
  const projectLatestChangesIndicatorStatusIcon = !workspaceUpdateChanges ? (
    <div />
  ) : !editorStore.changeDetectionState.initState.hasSucceeded ||
    editorStore.changeDetectionState.workspaceBaseRevisionState
      .isBuildingEntityHashesIndex ||
    editorStore.changeDetectionState.projectLatestRevisionState
      .isBuildingEntityHashesIndex ? (
    <div />
  ) : (
    <div
      className={`activity-bar__item__icon__indicator activity-bar__item__icon__indicator__dot activity-bar__item__icon__project-latest-changes__indicator ${
        workspaceUpdatePotentialConflicts
          ? 'activity-bar__item__icon__project-latest-changes__indicator--has-conflicts'
          : ''
      }`}
      data-testid={LEGEND_STUDIO_TEST_ID.ACTIVITY_BAR_ITEM_ICON_INDICATOR}
    ></div>
  );
  // tabs
  const activities: ActivityDisplay[] = [
    {
      mode: ACTIVITY_MODE.EXPLORER,
      title: 'Explorer (Ctrl + Shift + X)',
      icon: <FileTrayIcon className="activity-bar__explorer-icon" />,
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.GLOBAL_TEST_RUNNER,
      title: 'Global Test Runner',
      icon: <FlaskIcon />,
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.LOCAL_CHANGES,
      title: 'Local Changes (Ctrl + Shift + G)',
      info: localChanges ? `${localChanges} unpushed changes` : undefined,
      icon: (
        <div className="activity-bar__local-change-icon activity-bar__item__icon-with-indicator">
          <CodeBranchIcon />
          {localChangesIndicatorStatusIcon}
        </div>
      ),
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.WORKSPACE_UPDATER,
      title: 'Update Workspace (Ctrl + Shift + U)',
      info: workspaceUpdateChanges
        ? `Update available${
            workspaceUpdatePotentialConflicts ? ' with potential conflicts' : ''
          }`
        : undefined,
      icon: (
        <div className="activity-bar__workspace-updater-icon activity-bar__item__icon-with-indicator">
          <CloudDownloadIcon />
          {projectLatestChangesIndicatorStatusIcon}
        </div>
      ),
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.WORKSPACE_REVIEW,
      title: 'Review (Ctrl + Shift + M)',
      info: reviewChanges ? `${reviewChanges} changes` : undefined,
      icon: (
        <div className="activity-bar__review-icon activity-bar__item__icon-with-indicator">
          <GitPullRequestIcon />
          {reviewChangesIndicatorStatusIcon}
        </div>
      ),
    },
    editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.CONFLICT_RESOLUTION,
      title: 'Conflict Resolution',
      info: conflictResolutionChanges
        ? `${conflictResolutionChanges} changes${
            conflictResolutionConflicts
              ? ` (${conflictResolutionConflicts} unresolved conflicts)`
              : ''
          }`
        : conflictResolutionChanges,
      icon: (
        <div className="activity-bar__conflict-resolution-icon activity-bar__item__icon-with-indicator">
          <GitMergeIcon />
          {conflictResolutionChangesIndicatorStatusIcon}
        </div>
      ),
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.PROJECT_OVERVIEW,
      title: 'Project',
      icon: (
        <div className="activity-bar__project-overview-icon">
          <RepoIcon />
        </div>
      ),
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.WORKFLOW_MANAGER,
      title: 'Workflow Manager',
      icon: <WrenchIcon />,
    },
  ].filter((activity): activity is ActivityDisplay => Boolean(activity));

  return (
    <div className="activity-bar">
      <ActivityBarMenu />
      <div className="activity-bar__items">
        {activities.map((activity) => (
          <button
            key={activity.mode}
            className={clsx('activity-bar__item', {
              'activity-bar__item--active':
                editorStore.sideBarDisplayState.isOpen &&
                editorStore.activeActivity === activity.mode,
            })}
            onClick={changeActivity(activity.mode)}
            tabIndex={-1}
            title={`${activity.title}${
              activity.info ? ` - ${activity.info}` : ''
            }`}
          >
            {activity.icon}
          </button>
        ))}
      </div>
      <DropdownMenu
        className="activity-bar__setting"
        content={<SettingsMenu />}
        menuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
          transformOrigin: { vertical: 'bottom', horizontal: 'left' },
          elevation: 7,
        }}
      >
        <button
          className="activity-bar__item"
          tabIndex={-1}
          title="Settings..."
        >
          <CogIcon />
        </button>
      </DropdownMenu>
    </div>
  );
});
