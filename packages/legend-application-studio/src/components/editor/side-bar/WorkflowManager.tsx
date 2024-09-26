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

import { forwardRef, useEffect } from 'react';
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
  PanelContent,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  Modal,
  ModalFooterButton,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { flowResult } from 'mobx';
import { WorkflowJobStatus, WorkflowStatus } from '@finos/legend-server-sdlc';
import { useApplicationStore } from '@finos/legend-application';
import {
  type WorkflowExplorerTreeNodeData,
  type WorkflowLogState,
  type WorkflowManagerState,
  type WorkflowState,
  WorkflowJobTreeNodeData,
  WorkflowTreeNodeData,
} from '../../../stores/editor/sidebar-state/WorkflowManagerState.js';
import {
  formatDistanceToNow,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

const getWorkflowStatusIcon = (
  workflowStatus: WorkflowStatus,
): React.ReactNode => {
  switch (workflowStatus) {
    case WorkflowStatus.PENDING:
      return (
        <div
          title="Pipeline is suspended"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--suspended"
        >
          <PauseCircleIcon />
        </div>
      );
    case WorkflowStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--in-progress"
        >
          <CircleNotchIcon />
        </div>
      );
    case WorkflowStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--succeeded"
        >
          <CheckCircleIcon />
        </div>
      );
    case WorkflowStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    case WorkflowStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--canceled"
        >
          <BanIcon />
        </div>
      );
    case WorkflowStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workflow-manager__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--unknown"
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
    workflowState: WorkflowManagerState;
    logState: WorkflowLogState;
  }) => {
    const { workflowState, logState } = props;
    const applicationStore = workflowState.editorStore.applicationStore;
    const job = guaranteeNonNullable(logState.job);
    const jobIsInProgress = job.status === WorkflowJobStatus.IN_PROGRESS;
    const closeLogViewer = (): void => {
      logState.closeModal();
      flowResult(workflowState.fetchAllWorkflows()).catch(
        workflowState.editorStore.applicationStore.alertUnhandledError,
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
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <PanelLoadingIndicator
            isLoading={logState.fetchJobLogState.isInProgress}
          />
          <ModalHeader>
            <ModalTitle title={`Logs for ${job.name} #${job.id}`} />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                disabled={!jobIsInProgress}
                title="Refresh"
                onClick={refreshLogs}
              >
                <RefreshIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody>
            <CodeEditor
              inputValue={logs}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.TEXT}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Close"
              onClick={closeLogViewer}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const WorkflowExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      workflowManagerState: WorkflowManagerState;
      workflowState: WorkflowState;
      node: WorkflowExplorerTreeNodeData;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    }
  >(function WorkflowExplorerContextMenu(props, ref) {
    const { node, workflowManagerState, workflowState, treeData } = props;
    const applicationStore = useApplicationStore();
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
    const runManualJob = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowState.runManualJob(node.workflowJob, treeData);
      }
    };
    const viewLogs = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        workflowManagerState.logState.viewJobLogs(node.workflowJob);
      }
    };
    const visitWeburl = (): void => {
      if (node instanceof WorkflowJobTreeNodeData) {
        applicationStore.navigationService.navigator.visitAddress(
          node.workflowJob.webURL,
        );
      } else if (node instanceof WorkflowTreeNodeData) {
        applicationStore.navigationService.navigator.visitAddress(
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
            {node.workflowJob.status === WorkflowJobStatus.WAITING_MANUAL && (
              <MenuContentItem onClick={runManualJob}>
                Run Manual Job
              </MenuContentItem>
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
  }),
);

const WorkflowTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    WorkflowExplorerTreeNodeData,
    {
      workflowManagerState: WorkflowManagerState;
      workflowState: WorkflowState;
      treeData: TreeData<WorkflowExplorerTreeNodeData>;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const { workflowManagerState, treeData, workflowState } = props.innerProps;
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
          workflowManagerState={workflowManagerState}
          workflowState={workflowState}
          treeData={treeData}
          node={node}
        />
      }
      menuProps={{ elevation: 7 }}
    >
      <div
        className={clsx(
          'tree-view__node__container workflow-manager__explorer__workflow-tree__node__container',
        )}
        onClick={selectNode}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon workflow-manager__explorer__workflow-tree__node__icon">
          <div className="workflow-manager__explorer__workflow-tree__node__icon__expand">
            {expandIcon}
          </div>
          <div className="workflow-manager__explorer__workflow-tree__node__icon__type">
            {nodeIcon}
          </div>
        </div>
        {node instanceof WorkflowTreeNodeData && (
          <a
            className="workflow-manager__item__link"
            rel="noopener noreferrer"
            target="_blank"
            href={node.workflow.webURL}
            title="See workflow detail"
          >
            <div className="workflow-manager__item__link__content">
              <span className="workflow-manager__item__link__content__id">
                #{node.label}
              </span>
              <span className="workflow-manager__item__link__content__created-at">
                {`created ${formatDistanceToNow(node.workflow.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}`}
              </span>
            </div>
          </a>
        )}
        {node instanceof WorkflowJobTreeNodeData && (
          <a
            className="workflow-manager__item__link"
            rel="noopener noreferrer"
            target="_blank"
            href={node.workflowJob.webURL}
            title="See job detail"
          >
            <div className="workflow-manager__item__link__content">
              <span className="workflow-manager__item__link__content__id">
                {node.workflowJob.name}
              </span>
              <span className="workflow-manager__item__link__content__created-at">
                {`created ${formatDistanceToNow(node.workflowJob.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}`}
              </span>
            </div>
          </a>
        )}
      </div>
    </ContextMenu>
  );
};

export const WorkflowManager = observer(
  (props: { workflowManagerState: WorkflowManagerState }) => {
    const applicationStore = useApplicationStore();
    const workflowManagerState = props.workflowManagerState;
    const isDispatchingAction =
      workflowManagerState.fetchWorkflowsState.isInProgress ||
      Boolean(
        workflowManagerState.workflowStates.find(
          (e) => e.isExecutingWorkflowRequest,
        ),
      );
    const renderWorkflowContent = (): React.ReactNode => (
      <>
        {workflowManagerState.workflowStates.map((workflowState) => {
          const onNodeSelect = (node: WorkflowExplorerTreeNodeData): void => {
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
                workflowManagerState,
                workflowState: workflowState,
                treeData: workflowState.treeData,
              }}
            />
          );
        })}
        {workflowManagerState.logState.job && (
          <WorkflowJobLogsViewer
            logState={workflowManagerState.logState}
            workflowState={workflowManagerState}
          />
        )}
      </>
    );

    const refresh = applicationStore.guardUnhandledError(() =>
      flowResult(workflowManagerState.fetchAllWorkflows()),
    );
    useEffect(() => {
      flowResult(workflowManagerState.fetchAllWorkflows()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, workflowManagerState]);

    return (
      <div className="panel workflow-manager">
        <div className="panel__header side-bar__header">
          <div className="panel__header__title workflow-manager__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              WORKFLOW MANAGER
            </div>
          </div>
          <div className="panel__header__actions side-bar__header__actions">
            <button
              className={clsx(
                'panel__header__action side-bar__header__action workflow-manager__refresh-btn',
                {
                  'workflow-manager__refresh-btn--loading': isDispatchingAction,
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
                {workflowManagerState.workflowStates.length}
              </div>
            </div>
            <PanelContent>{renderWorkflowContent()}</PanelContent>
          </div>
        </div>
      </div>
    );
  },
);
