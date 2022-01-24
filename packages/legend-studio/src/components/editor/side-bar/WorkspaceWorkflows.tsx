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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TreeData,
  type TreeNodeContainerProps,
  clsx,
  Dialog,
  MenuContent,
  MenuContentItem,
  PanelLoadingIndicator,
  TreeView,
  ContextMenu,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshIcon,
  CircleNotchIcon,
  QuestionCircleIcon,
  TimesCircleIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  BanIcon,
} from '@finos/legend-art';
import { formatDistanceToNow } from 'date-fns';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID';
import { flowResult } from 'mobx';
import { WorkflowJobStatus, WorkflowStatus } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../EditorStoreProvider';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type WorkflowExplorerTreeNodeData,
  type WorkflowLogState,
  type WorkspaceWorkflowsState,
  type WorkspaceWorkflowState,
  WorkflowJobTreeNodeData,
  WorkflowTreeNodeData,
} from '../../../stores/sidebar-state/WorkspaceWorkflowsState';
import {
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { StudioTextInputEditor } from '../../shared/StudioTextInputEditor';

const getWorkflowStatusIcon = (
  workflowStatus: WorkflowStatus,
): React.ReactNode => {
  switch (workflowStatus) {
    case WorkflowStatus.PENDING:
      return (
        <div
          title="Pipeline is suspended"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--suspended"
        >
          <PauseCircleIcon />
        </div>
      );
    case WorkflowStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--in-progress"
        >
          <CircleNotchIcon />
        </div>
      );
    case WorkflowStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--succeeded"
        >
          <CheckCircleIcon />
        </div>
      );
    case WorkflowStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    case WorkflowStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--canceled"
        >
          <BanIcon />
        </div>
      );
    case WorkflowStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--unknown"
        >
          <QuestionCircleIcon />
        </div>
      );
  }
};

const getWorkflowJobStatusIcon = (
  workflowStatus: WorkflowJobStatus,
): React.ReactNode => {
  switch (workflowStatus) {
    case WorkflowJobStatus.WAITING:
    case WorkflowJobStatus.WAITING_MANUAL:
      return (
        <div
          title="Pipeline is suspended"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--suspended"
        >
          <PauseCircleIcon />
        </div>
      );
    case WorkflowJobStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--in-progress"
        >
          <CircleNotchIcon />
        </div>
      );
    case WorkflowJobStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--succeeded"
        >
          <CheckCircleIcon />
        </div>
      );
    case WorkflowJobStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    case WorkflowJobStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--canceled"
        >
          <BanIcon />
        </div>
      );
    case WorkflowJobStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--unknown"
        >
          <QuestionCircleIcon />
        </div>
      );
  }
};
const WorkflowJobLogsViewer = observer(
  (props: {
    workflowState: WorkspaceWorkflowsState;
    logState: WorkflowLogState;
  }) => {
    const { workflowState, logState } = props;
    const job = guaranteeNonNullable(logState.job);
    const jobIsInProgress = job.status === WorkflowJobStatus.IN_PROGRESS;
    const closeLogViewer = (): void => {
      logState.closeModal();
      flowResult(workflowState.fetchAllWorkspaceWorkflows()).catch(
        workflowState.editorStore.applicationStore.alertIllegalUnhandledError,
      );
    };
    const refreshLogs = (): void => {
      logState.refreshJobLogs(job);
    };
    const logs = logState.logs;
    return (
      <Dialog
        open={Boolean(logState.job)}
        onClose={closeLogViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        TransitionProps={{
          appear: false, // disable transition
        }}
      >
        <div className="modal modal--dark editor-modal">
          <PanelLoadingIndicator
            isLoading={logState.fetchJobLogState.isInProgress}
          />
          <div className="modal__header">
            <div className="modal__title">{`Logs for ${job.name} #${job.id}`}</div>
            <div className="modal__header__actions">
              <button
                className="modal__header__action"
                disabled={!jobIsInProgress}
                title="Refresh"
                onClick={refreshLogs}
              >
                <RefreshIcon />
              </button>
            </div>
          </div>
          <div className="modal__body">
            <StudioTextInputEditor
              inputValue={logs}
              isReadOnly={true}
              language={EDITOR_LANGUAGE.TEXT}
              showMiniMap={true}
            />
          </div>
          <div className="modal__footer">
            <button
              className="btn modal__footer__close-btn"
              onClick={closeLogViewer}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
const WorkflowExplorerContextMenu = observer(
  (
    props: {
      workflowsState: WorkspaceWorkflowsState;
      workflowState: WorkspaceWorkflowState;
      node: WorkflowExplorerTreeNodeData;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { node, workflowsState, workflowState, treeData } = props;
    const retryJob = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowState.retryJob(node.workflowJob, treeData);
      }
    };
    const cancelJob = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowState.cancelJob(node.workflowJob, treeData);
      }
    };
    const viewLogs = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowsState.logState.viewJobLogs(node.workflowJob);
      }
    };
    const visitWeburl = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowState.editorStore.applicationStore.navigator.openNewWindow(
          node.workflowJob.webURL,
        );
      } else if (node instanceof WorkflowTreeNodeData) {
        workflowState.editorStore.applicationStore.navigator.openNewWindow(
          node.workflow.webURL,
        );
      }
    };

    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        {node instanceof WorkflowJobTreeNodeData && (
          <>
            <MenuContentItem onClick={viewLogs}>View Logs</MenuContentItem>
            <MenuContentItem onClick={visitWeburl}>Visit Job</MenuContentItem>
            {node.workflowJob.status !== WorkflowJobStatus.IN_PROGRESS && (
              <MenuContentItem onClick={retryJob}>Retry Job</MenuContentItem>
            )}
            {node.workflowJob.status === WorkflowJobStatus.IN_PROGRESS && (
              <MenuContentItem onClick={cancelJob}>Cancel Job</MenuContentItem>
            )}
          </>
        )}
        {node instanceof WorkflowTreeNodeData && (
          <MenuContentItem onClick={visitWeburl}>
            Visit Workflow
          </MenuContentItem>
        )}
      </MenuContent>
    );
  },
  { forwardRef: true },
);

const WorkflowTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    WorkflowExplorerTreeNodeData,
    {
      workflowsState: WorkspaceWorkflowsState;
      workflowState: WorkspaceWorkflowState;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const { workflowsState, treeData, workflowState } = props.innerProps;
  const expandIcon = !(node instanceof WorkflowTreeNodeData) ? (
    <div />
  ) : node.isOpen ? (
    <ChevronDownIcon />
  ) : (
    <ChevronRightIcon />
  );
  const nodeIcon =
    node instanceof WorkflowTreeNodeData
      ? getWorkflowStatusIcon(node.workflow.status)
      : getWorkflowJobStatusIcon(
          guaranteeType(node, WorkflowJobTreeNodeData).workflowJob.status,
        );
  const selectNode: React.MouseEventHandler = (event) => onNodeSelect?.(node);
  return (
    <ContextMenu
      content={
        <WorkflowExplorerContextMenu
          workflowsState={workflowsState}
          workflowState={workflowState}
          treeData={treeData}
          node={node}
        />
      }
      menuProps={{ elevation: 7 }}
    >
      <div
        className={clsx(
          'tree-view__node__container workspace-workflows__explorer__workflow-tree__node__container',
        )}
        onClick={selectNode}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon workspace-workflows__explorer__workflow-tree__node__icon">
          <div className="workspace-workflows__explorer__workflow-tree__node__icon__expand">
            {expandIcon}
          </div>
          <div className="workspace-workflows__explorer__workflow-tree__node__icon__type">
            {nodeIcon}
          </div>
        </div>
        {node instanceof WorkflowTreeNodeData && (
          <a
            className="workspace-workflows__item__link"
            rel="noopener noreferrer"
            target="_blank"
            href={node.workflow.webURL}
            title={'See workflow detail'}
          >
            <div className="workspace-workflows__item__link__content">
              <span className="workspace-workflows__item__link__content__id">
                #{node.label}
              </span>
              <span className="workspace-workflows__item__link__content__created-at">
                created{' '}
                {formatDistanceToNow(node.workflow.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}
              </span>
            </div>
          </a>
        )}
        {node instanceof WorkflowJobTreeNodeData && (
          <a
            className="workspace-workflows__item__link"
            rel="noopener noreferrer"
            target="_blank"
            href={node.workflowJob.webURL}
            title={'See job detail'}
          >
            <div className="workspace-workflows__item__link__content">
              <span className="workspace-workflows__item__link__content__id">
                {node.workflowJob.name}
              </span>
              <span className="workspace-workflows__item__link__content__created-at">
                created{' '}
                {formatDistanceToNow(node.workflowJob.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}
              </span>
            </div>
          </a>
        )}
      </div>
    </ContextMenu>
  );
};
export const WorkspaceWorkflows = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const workflowsState = editorStore.workspaceWorkflowsState;
  const logState = workflowsState.logState;
  const isDispatchingAction =
    workflowsState.fetchWorkflowsState.isInProgress ||
    Boolean(
      workflowsState.workflowStates.find((e) => e.isExecutingWorkflowRequest),
    );
  const refresh = applicationStore.guaranteeSafeAction(() =>
    flowResult(workflowsState.fetchAllWorkspaceWorkflows()),
  );
  useEffect(() => {
    flowResult(workflowsState.fetchAllWorkspaceWorkflows()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, workflowsState]);

  return (
    <div className="panel workspace-workflows">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-workflows__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            WORKSPACE WORKFLOWS
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action workspace-workflows__refresh-btn',
              {
                'workspace-workflows__refresh-btn--loading':
                  isDispatchingAction,
              },
            )}
            disabled={isDispatchingAction}
            onClick={refresh}
            tabIndex={-1}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel side-bar__panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">WORKFLOWS</div>
            </div>
            <div
              className="side-bar__panel__header__changes-count"
              data-testid={
                LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
              }
            >
              {workflowsState.workflowStates.length}
            </div>
          </div>
          <div className="panel__content">
            {workflowsState.workflowStates.map((workflowState) => {
              const onNodeSelect = (
                node: WorkflowExplorerTreeNodeData,
              ): void => {
                workflowState.onTreeNodeSelect(node, workflowState.treeData);
              };
              const getChildNodes = (
                node: WorkflowExplorerTreeNodeData,
              ): WorkflowExplorerTreeNodeData[] => {
                if (node.childrenIds && node instanceof WorkflowTreeNodeData) {
                  return node.childrenIds
                    .map((id) => workflowState.treeData.nodes.get(id))
                    .filter(isNonNullable);
                }
                return [];
              };

              return (
                <TreeView
                  components={{
                    TreeNodeContainer: WorkflowTreeNodeContainer,
                  }}
                  key={workflowState.uuid}
                  treeData={workflowState.treeData}
                  onNodeSelect={onNodeSelect}
                  getChildNodes={getChildNodes}
                  innerProps={{
                    workflowsState: workflowsState,
                    workflowState: workflowState,
                    treeData: workflowState.treeData,
                  }}
                />
              );
            })}
          </div>
        </div>
        {logState.job && (
          <WorkflowJobLogsViewer
            logState={logState}
            workflowState={workflowsState}
          />
        )}
      </div>
    </div>
  );
});
