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
import type { TreeData, TreeNodeContainerProps } from '@finos/legend-art';
import {
  MenuContent,
  MenuContentItem,
  clsx,
  PanelLoadingIndicator,
  TreeView,
  ContextMenu,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import { MdRefresh } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import {
  FaCircleNotch,
  FaPauseCircle,
  FaQuestionCircle,
  FaBan,
  FaTimesCircle,
  FaCheckCircle,
} from 'react-icons/fa';
import { STUDIO_TEST_ID } from '../../StudioTestID';
import { flowResult } from 'mobx';
import { WorkflowJobStatus, WorkflowStatus } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../EditorStoreProvider';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import type {
  WorkflowExplorerTreeNodeData,
  WorkflowLogState,
  WorkspaceWorkflowsState,
} from '../../../stores/sidebar-state/WorkspaceWorkflowsState';
import {
  WorkflowJobTreeNodeData,
  WorkflowTreeNodeData,
} from '../../../stores/sidebar-state/WorkspaceWorkflowsState';
import { guaranteeType, isNonNullable } from '@finos/legend-shared';
import { Dialog } from '@material-ui/core';
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
          <FaPauseCircle />
        </div>
      );
    case WorkflowStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--in-progress"
        >
          <FaCircleNotch />
        </div>
      );
    case WorkflowStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--succeeded"
        >
          <FaCheckCircle />
        </div>
      );
    case WorkflowStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--failed"
        >
          <FaTimesCircle />
        </div>
      );
    case WorkflowStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--canceled"
        >
          <FaBan />
        </div>
      );
    case WorkflowStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--unknown"
        >
          <FaQuestionCircle />
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
          <FaPauseCircle />
        </div>
      );
    case WorkflowJobStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--in-progress"
        >
          <FaCircleNotch />
        </div>
      );
    case WorkflowJobStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--succeeded"
        >
          <FaCheckCircle />
        </div>
      );
    case WorkflowJobStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--failed"
        >
          <FaTimesCircle />
        </div>
      );
    case WorkflowJobStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--canceled"
        >
          <FaBan />
        </div>
      );
    case WorkflowJobStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-workflow-jobs__item__link__content__status__indicator workspace-workflow-jobs__item__link__content__status__indicator--unknown"
        >
          <FaQuestionCircle />
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
    const job = logState.job;
    const jobIsInProgress = job.status === WorkflowJobStatus.IN_PROGRESS;
    const closeLogViewer = (): void => {
      workflowState.setWorkflowJobLogState(undefined);
      flowResult(workflowState.refreshWorkflows()).catch(
        workflowState.editorStore.applicationStore.alertIllegalUnhandledError,
      );
    };
    const refreshLogs = (): void => {
      logState.refreshJobLogs();
    };
    const logs = logState.logs;
    return (
      <Dialog
        open={Boolean(workflowState.workflowJobLogState)}
        onClose={closeLogViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal">
          <div className="modal__header">
            <div className="modal__title">{`Logs for ${job.name} #${job.id}`}</div>
            <div className="modal__header__actions">
              <button
                className="modal__header__action"
                disabled={!jobIsInProgress}
                title="Refresh"
                onClick={refreshLogs}
              >
                <MdRefresh />
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
      workflowState: WorkspaceWorkflowsState;
      node: WorkflowExplorerTreeNodeData;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { node, workflowState, treeData } = props;
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
        workflowState.viewJobLogs(node.workflowJob);
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
      <MenuContent data-testid={STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
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
      workflowState: WorkspaceWorkflowsState;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const { workflowState, treeData } = props.innerProps;
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
  const workflowState = editorStore.workspaceWorkflowsState;
  const workflowTreeData = workflowState.workflowTreeData;
  const isDispatchingAction = workflowState.isExecutingWorkflowRequest;
  const refresh = applicationStore.guaranteeSafeAction(() =>
    flowResult(workflowState.refreshWorkflows()),
  );
  const onNodeSelect = (node: WorkflowExplorerTreeNodeData): void => {
    if (workflowTreeData) {
      workflowState.onTreeNodeSelect(node, workflowTreeData);
    }
  };

  const getChildNodes = (
    node: WorkflowExplorerTreeNodeData,
  ): WorkflowExplorerTreeNodeData[] => {
    if (
      node.childrenIds &&
      node instanceof WorkflowTreeNodeData &&
      workflowTreeData
    ) {
      return node.childrenIds
        .map((id) => workflowTreeData.nodes.get(id))
        .filter(isNonNullable);
    }
    return [];
  };

  useEffect(() => {
    flowResult(workflowState.fetchAllWorkspaceWorkflows()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, workflowState]);

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
            disabled={isDispatchingAction || !workflowTreeData}
            onClick={refresh}
            tabIndex={-1}
            title="Refresh"
          >
            <MdRefresh />
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
              data-testid={STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
            >
              {workflowState.workflows.length}
            </div>
          </div>
          <div className="panel__content">
            {workflowTreeData && (
              <TreeView
                components={{
                  TreeNodeContainer: WorkflowTreeNodeContainer,
                }}
                treeData={workflowTreeData}
                onNodeSelect={onNodeSelect}
                getChildNodes={getChildNodes}
                innerProps={{
                  workflowState,
                  treeData: workflowTreeData,
                }}
              />
            )}
          </div>
        </div>
        {workflowState.workflowJobLogState && (
          <WorkflowJobLogsViewer
            logState={workflowState.workflowJobLogState}
            workflowState={workflowState}
          />
        )}
      </div>
    </div>
  );
});
