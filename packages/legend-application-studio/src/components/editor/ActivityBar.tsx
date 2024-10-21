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
import {
  ACTIVITY_MODE,
  EDITOR_MODE,
  PANEL_MODE,
  USER_JOURNEYS,
} from '../../stores/editor/EditorConfig.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import {
  clsx,
  ControlledDropdownMenu,
  RepoIcon,
  MenuContent,
  MenuContentItem,
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
  RobotIcon,
  WorkflowIcon,
  ReadMeIcon,
} from '@finos/legend-art';
import { useEditorStore } from './EditorStoreProvider.js';
import { forwardRef, useEffect, useState } from 'react';
import {
  ReleaseLogManager,
  ReleaseNotesManager,
  VIRTUAL_ASSISTANT_TAB,
} from '@finos/legend-application';
import { LegendStudioAppInfo } from '../LegendStudioAppInfo.js';
import { generateSetupRoute } from '../../__lib__/LegendStudioNavigation.js';
import { useLegendStudioApplicationStore } from '../LegendStudioFrameworkProvider.js';
import {
  ActivityBarItemExperimentalBadge,
  type ActivityBarItemConfig,
} from '@finos/legend-lego/application';
import {
  ShowcaseManagerState,
  openShowcaseManager,
} from '../../stores/ShowcaseManagerState.js';
import { toggleShowcasePanel } from './ShowcaseSideBar.js';

const SettingsMenu = observer(
  forwardRef<HTMLDivElement, unknown>(function SettingsMenu(props, ref) {
    const editorStore = useEditorStore();
    const showDeveloperTool = (): void => {
      editorStore.panelGroupDisplayState.open();
      editorStore.setActivePanelMode(PANEL_MODE.DEV_TOOL);
    };

    return (
      <MenuContent ref={ref} className="activity-bar__setting__menu">
        <MenuContentItem onClick={showDeveloperTool}>
          <MenuContentItemLabel>Show Developer Tool</MenuContentItemLabel>
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

export const ActivityBarMenu: React.FC<{
  openShowcasePanel?: () => void;
}> = ({ openShowcasePanel }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const appDocUrl = applicationStore.documentationService.url;
  const docLinks = applicationStore.documentationService.links;
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);
  // documentation
  const goToDocumentation = (): void => {
    if (appDocUrl) {
      applicationStore.navigationService.navigator.visitAddress(appDocUrl);
    }
  };
  const goToDocLink = (url: string): void => {
    applicationStore.navigationService.navigator.visitAddress(url);
  };
  // go to setup page
  const goToWorkspaceSetup = (): void =>
    applicationStore.navigationService.navigator.visitAddress(
      applicationStore.navigationService.navigator.generateAddress(
        generateSetupRoute(undefined, undefined),
      ),
    );
  // help
  const openHelp = (): void => {
    applicationStore.assistantService.setIsHidden(false);
    applicationStore.assistantService.setIsOpen(true);
    applicationStore.assistantService.setSelectedTab(
      VIRTUAL_ASSISTANT_TAB.SEARCH,
    );
  };
  // showcases
  const showcaseManagerState =
    ShowcaseManagerState.retrieveNullableState(applicationStore);
  // release notification
  useEffect(() => {
    applicationStore.releaseNotesService.updateViewedVersion();
  }, [applicationStore]);

  return (
    <>
      <div className="activity-bar__menu">
        <ControlledDropdownMenu
          className="activity-bar__menu-item"
          menuProps={{
            anchorOrigin: { vertical: 'top', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            elevation: 7,
          }}
          content={
            <MenuContent>
              <MenuContentItem onClick={showAppInfo}>About</MenuContentItem>
              {showcaseManagerState?.isEnabled && (
                <MenuContentItem
                  onClick={() =>
                    openShowcasePanel
                      ? openShowcasePanel()
                      : openShowcaseManager(applicationStore)
                  }
                >
                  See Showcases
                </MenuContentItem>
              )}
              <MenuContentItem
                disabled={!appDocUrl}
                onClick={goToDocumentation}
              >
                Documentation
              </MenuContentItem>
              {docLinks?.map((entry) => (
                <MenuContentItem
                  key={entry.key}
                  onClick={(): void => goToDocLink(entry.url)}
                >
                  {entry.label}
                </MenuContentItem>
              ))}
              <MenuContentItem
                onClick={openHelp}
                disabled={
                  applicationStore.config.TEMPORARY__disableVirtualAssistant
                }
                title={
                  applicationStore.config.TEMPORARY__disableVirtualAssistant
                    ? 'Virtual Assistant is disabled'
                    : ''
                }
              >
                Help...
              </MenuContentItem>
              <MenuContentDivider />
              <MenuContentItem onClick={goToWorkspaceSetup}>
                Back to workspace setup
              </MenuContentItem>
            </MenuContent>
          }
        >
          <MenuIcon />
        </ControlledDropdownMenu>
      </div>
      <LegendStudioAppInfo open={openAppInfo} closeModal={hideAppInfo} />
      <ReleaseLogManager />
      <ReleaseNotesManager />
    </>
  );
};

export const ActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const changeActivity =
    (activity: string): (() => void) =>
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
  const lazyTextModeEnabled = editorStore.mode === EDITOR_MODE.LAZY_TEXT_EDITOR;
  // tabs
  const activities: ActivityBarItemConfig[] = [
    {
      mode: ACTIVITY_MODE.EXPLORER,
      title: 'Explorer (Ctrl + Shift + X)',
      icon: <FileTrayIcon className="activity-bar__explorer-icon" />,
    },
    {
      mode: ACTIVITY_MODE.TEST_RUNNER,
      title: 'Test Runner',
      icon: <FlaskIcon />,
      disabled: editorStore.isInConflictResolutionMode || lazyTextModeEnabled,
    },
    {
      mode: ACTIVITY_MODE.LOCAL_CHANGES,
      title: `Local Changes (Ctrl + Shift + G)${
        localChanges ? ` - ${localChanges} unpushed changes` : ''
      }`,
      icon: (
        <div className="activity-bar__local-change-icon activity-bar__item__icon-with-indicator">
          <CodeBranchIcon />
          {localChangesIndicatorStatusIcon}
        </div>
      ),
      disabled: editorStore.isInConflictResolutionMode,
    },
    {
      mode: ACTIVITY_MODE.WORKSPACE_UPDATER,
      title: `Update Workspace (Ctrl + Shift + U)${
        workspaceUpdateChanges
          ? ` - Update available${
              workspaceUpdatePotentialConflicts
                ? ' with potential conflicts'
                : ''
            }`
          : ''
      }`,
      icon: (
        <div className="activity-bar__workspace-updater-icon activity-bar__item__icon-with-indicator">
          <CloudDownloadIcon />
          {projectLatestChangesIndicatorStatusIcon}
        </div>
      ),
      disabled: editorStore.isInConflictResolutionMode,
    },
    {
      mode: ACTIVITY_MODE.WORKSPACE_REVIEW,
      title: `Review (Ctrl + Shift + M)${
        reviewChanges ? ` - ${reviewChanges} changes` : ''
      }`,
      icon: (
        <div className="activity-bar__review-icon activity-bar__item__icon-with-indicator">
          <GitPullRequestIcon />
          {reviewChangesIndicatorStatusIcon}
        </div>
      ),
      disabled: editorStore.isInConflictResolutionMode,
    },
    {
      mode: ACTIVITY_MODE.CONFLICT_RESOLUTION,
      title: `Conflict Resolution${
        conflictResolutionChanges
          ? ` - ${conflictResolutionChanges} changes${
              conflictResolutionConflicts
                ? ` (${conflictResolutionConflicts} unresolved conflicts)`
                : ''
            }`
          : ''
      }`,
      icon: (
        <div className="activity-bar__conflict-resolution-icon activity-bar__item__icon-with-indicator">
          <GitMergeIcon />
          {conflictResolutionChangesIndicatorStatusIcon}
        </div>
      ),

      disabled: !editorStore.isInConflictResolutionMode || lazyTextModeEnabled,
    },
    {
      mode: ACTIVITY_MODE.PROJECT_OVERVIEW,
      title: 'Project',
      icon: <RepoIcon className="activity-bar__project-overview-icon" />,
      disabled: editorStore.isInConflictResolutionMode,
    },
    {
      mode: ACTIVITY_MODE.WORKFLOW_MANAGER,
      title: 'Workflow Manager',
      icon: <WrenchIcon />,
      disabled: editorStore.isInConflictResolutionMode,
    },
    {
      mode: ACTIVITY_MODE.REGISTER_SERVICES,
      title: 'Register Service (Beta)',
      icon: (
        <>
          <RobotIcon className="activity-bar__icon--service-registrar" />
          <ActivityBarItemExperimentalBadge />
        </>
      ),
      disabled: editorStore.isInConflictResolutionMode || lazyTextModeEnabled,
    },
  ].filter((activity) => !activity.disabled);

  const userJourneys: ActivityBarItemConfig[] = [
    {
      mode: USER_JOURNEYS.END_TO_END_WORKFLOWS,
      title: 'End to End Workflows (Beta)',
      icon: (
        <div>
          <WorkflowIcon className="activity-bar__icon--service-registrar" />
          <ActivityBarItemExperimentalBadge />
        </div>
      ),
      disabled:
        editorStore.isInConflictResolutionMode ||
        !editorStore.applicationStore.config.options.NonProductionFeatureFlag,
    },
  ].filter((activity) => !activity.disabled);

  const openShowcasePanel = () => {
    toggleShowcasePanel(editorStore);
  };

  return (
    <div className="activity-bar">
      <ActivityBarMenu openShowcasePanel={openShowcasePanel} />
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
            title={activity.title}
          >
            {activity.icon}
          </button>
        ))}
        {Boolean(userJourneys.length) && <MenuContentDivider />}
        {userJourneys.map((activity) => (
          <button
            key={activity.mode}
            className={clsx('activity-bar__item', {
              'activity-bar__item--active':
                editorStore.sideBarDisplayState.isOpen &&
                editorStore.activeActivity === activity.mode,
            })}
            onClick={changeActivity(activity.mode)}
            tabIndex={-1}
            title={activity.title}
          >
            {activity.icon}
          </button>
        ))}
      </div>
      <button
        className={clsx('activity-bar__item')}
        onClick={() => openShowcasePanel()}
        tabIndex={-1}
        title={'Open Showcases'}
      >
        <ReadMeIcon />
      </button>
      <ControlledDropdownMenu
        className="activity-bar__item"
        title="Settings"
        content={<SettingsMenu />}
        menuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
          transformOrigin: { vertical: 'bottom', horizontal: 'left' },
          elevation: 7,
        }}
      >
        <CogIcon />
      </ControlledDropdownMenu>
    </div>
  );
});
