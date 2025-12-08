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

import {
  useApplicationStore,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import {
  type SelectComponent,
  type TreeData,
  type TreeNodeContainerProps,
  compareLabelFn,
  clsx,
  CustomSelectorInput,
  TimesIcon,
  Dialog,
  ControlledDropdownMenu,
  CaretDownIcon,
  MenuContentItem,
  MenuContent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PanelLoadingIndicator,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  ContextMenu,
  CompressIcon,
  SubjectIcon,
  ViewHeadlineIcon,
  ExpandAllIcon,
  BlankPanelContent,
  VersionsIcon,
  RepoIcon,
  ModalFooterButton,
  Button,
  Panel,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderActionItem,
  PanelContentLists,
} from '@finos/legend-art';
import {
  MASTER_SNAPSHOT_ALIAS,
  type ProjectDependencyGraphReport,
  type StoreProjectData,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import type { ProjectDependency } from '@finos/legend-server-sdlc';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  LogEvent,
  prettyCONSTName,
  compareSemVerVersions,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { ProjectConfigurationEditorState } from '../../../../stores/editor/editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import {
  type ProjectDependencyConflictTreeNodeData,
  ConflictTreeNodeData,
  ConflictVersionNodeData,
  buildDependencyNodeChildren,
  DEPENDENCY_REPORT_TAB,
  openAllDependencyNodesInTree,
  ProjectDependencyTreeNodeData,
  type ProjectDependencyEditorState,
} from '../../../../stores/editor/editor-state/project-configuration-editor-state/ProjectDependencyEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import {
  generateViewProjectByGAVRoute,
  generateViewProjectRoute,
  generateViewVersionRoute,
} from '../../../../__lib__/LegendStudioNavigation.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

export interface VersionOption {
  label: string;
  value: string;
}
interface ProjectOption {
  label: string;
  value: StoreProjectData;
}

const buildProjectOption = (project: StoreProjectData): ProjectOption => ({
  label: project.coordinates,
  value: project,
});

const ProjectDependencyActions = observer(
  (props: { dependencyEditorState: ProjectDependencyEditorState }) => {
    const { dependencyEditorState: dependencyEditorState } = props;
    const hasConflicts =
      dependencyEditorState.dependencyReport?.conflicts.length;
    const viewTree = (): void => {
      if (dependencyEditorState.dependencyReport) {
        dependencyEditorState.setReportTab(DEPENDENCY_REPORT_TAB.EXPLORER);
      }
    };
    const viewConflict = (): void => {
      if (dependencyEditorState.dependencyReport) {
        dependencyEditorState.setReportTab(DEPENDENCY_REPORT_TAB.CONFLICTS);
      }
    };
    return (
      <div className="project-dependency-editor__info">
        <Button
          onClick={viewTree}
          disabled={!dependencyEditorState.dependencyReport}
          title="View Dependency Explorer"
          text="View Dependency Explorer"
        />
        {Boolean(hasConflicts) && (
          <Button
            className="project-dependency-editor__conflicts-btn"
            text="View Conflicts"
            onClick={viewConflict}
            disabled={!dependencyEditorState.dependencyReport?.conflicts.length}
            title="View any conflicts in your dependencies"
          />
        )}
      </div>
    );
  },
);

const formatOptionLabel = (option: ProjectOption): React.ReactNode => (
  <div className="project-dependency-editor__label">
    <div className="project-dependency-editor__label__tag">
      {option.value.projectId}
    </div>
    <div className="project-dependency-editor__label__name">
      {option.value.coordinates}
    </div>
  </div>
);

const DependencyTreeNodeContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      node: ProjectDependencyConflictTreeNodeData;
    }
  >(function DependencyTreeNodeContextMenu(props, ref) {
    const { node } = props;
    const applicationStore = useApplicationStore();
    const getViewProjectUrl = (): string => {
      let groupId: string | undefined;
      let artifactId: string | undefined;
      let versionId: string | undefined;
      if (node instanceof ConflictTreeNodeData) {
        groupId = node.conflict.groupId;
        artifactId = node.conflict.artifactId;
      } else if (node instanceof ConflictVersionNodeData) {
        groupId = node.versionConflict.conflict.groupId;
        artifactId = node.versionConflict.conflict.artifactId;
        versionId = node.versionConflict.version.versionId;
      } else if (node instanceof ProjectDependencyTreeNodeData) {
        groupId = node.value.groupId;
        artifactId = node.value.artifactId;
        versionId = node.value.versionId;
      }
      return generateViewProjectByGAVRoute(
        guaranteeNonNullable(groupId),
        guaranteeNonNullable(artifactId),
        versionId === MASTER_SNAPSHOT_ALIAS
          ? SNAPSHOT_VERSION_ALIAS
          : versionId,
      );
    };
    const getSDLCProjectUrl = (): string | undefined => {
      if (node instanceof ConflictTreeNodeData) {
        const version = node.conflict.versions[0];
        return version
          ? generateViewProjectRoute(version.projectId)
          : undefined;
      } else if (node instanceof ConflictVersionNodeData) {
        return generateViewVersionRoute(
          node.versionConflict.version.projectId,
          node.versionConflict.version.artifactId,
        );
      } else if (node instanceof ProjectDependencyTreeNodeData) {
        return generateViewVersionRoute(
          node.value.projectId,
          node.value.versionId,
        );
      }
      return undefined;
    };

    const sdlcProjectUrl = getSDLCProjectUrl();
    const viewProjectUrl = getViewProjectUrl();

    const viewProject = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          viewProjectUrl,
        ),
      );
    };
    const viewSDLCProject = (): void => {
      if (sdlcProjectUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            sdlcProjectUrl,
          ),
        );
      }
    };

    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        <MenuContentItem onClick={viewProject}>Visit Project</MenuContentItem>
        <MenuContentItem disabled={!sdlcProjectUrl} onClick={viewSDLCProject}>
          Visit SDLC Project
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const DependencyTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ProjectDependencyTreeNodeData,
    {
      onNodeExpand: (node: ProjectDependencyTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const value = node.value;
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
  return (
    <ContextMenu
      content={<DependencyTreeNodeContextMenu node={node} />}
      menuProps={{ elevation: 7 }}
    >
      <div
        className={clsx(
          'tree-view__node__container project-dependency-explorer-tree__node__container',
          {
            'menu__trigger--on-menu-open': !node.isSelected,
          },
          {
            'project-dependency-explorer-tree__node__container--selected':
              node.isSelected,
          },
        )}
        style={{
          paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        }}
        onClick={selectNode}
      >
        <div className="tree-view__node__icon project-dependency-explorer-tree__node__icon">
          <div className="project-dependency-explorer-tree__node__icon__expand">
            {nodeExpandIcon}
          </div>
        </div>
        <button
          className="tree-view__node__label project-dependency-explorer-tree__node__label"
          tabIndex={-1}
          title={value.id}
        >
          {value.artifactId}
        </button>
        <div className="project-dependency-explorer-tree__node__version">
          <button
            className="project-dependency-explorer-tree__node__version-btn"
            title={value.versionId}
            tabIndex={-1}
          >
            {value.versionId}
          </button>
        </div>
      </div>
    </ContextMenu>
  );
};

const DependencyTreeView: React.FC<{
  treeData: TreeData<ProjectDependencyTreeNodeData>;
  setTreeData: (treeData: TreeData<ProjectDependencyTreeNodeData>) => void;
}> = (props) => {
  const { treeData, setTreeData } = props;
  const onNodeExpand = (node: ProjectDependencyTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        .forEach((c) => buildDependencyNodeChildren(c, treeData.nodes));
    }
    setTreeData({ ...treeData });
  };
  const onNodeSelect = (node: ProjectDependencyTreeNodeData): void => {
    buildDependencyNodeChildren(node, treeData.nodes);
    onNodeExpand(node);
    setTreeData({ ...treeData });
  };
  const getChildNodes = (
    node: ProjectDependencyTreeNodeData,
  ): ProjectDependencyTreeNodeData[] => {
    if (!node.childrenIds || node.childrenIds.length === 0) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable);
    return childrenNodes;
  };
  return (
    <TreeView
      components={{
        TreeNodeContainer: DependencyTreeNodeContainer,
      }}
      treeData={treeData}
      getChildNodes={getChildNodes}
      onNodeSelect={onNodeSelect}
      innerProps={{
        onNodeExpand,
      }}
    />
  );
};

const ConflictTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ProjectDependencyConflictTreeNodeData,
    {
      onNodeExpand: (node: ProjectDependencyConflictTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
  return (
    <ContextMenu
      content={<DependencyTreeNodeContextMenu node={node} />}
      menuProps={{ elevation: 7 }}
    >
      <div
        className={clsx(
          'tree-view__node__container project-dependency-explorer-tree__node__container',
          {
            'menu__trigger--on-menu-open': !node.isSelected,
          },
          {
            'project-dependency-explorer-tree__node__container--selected':
              node.isSelected,
          },
        )}
        style={{
          paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        }}
        onClick={selectNode}
      >
        <div
          className={clsx(
            'tree-view__node__icon project-dependency-explorer-tree__node__icon',
            {
              'tree-view__node__icon project-dependency-explorer-tree__node__icon__with__type':
                node instanceof ConflictTreeNodeData ||
                node instanceof ConflictVersionNodeData,
            },
          )}
        >
          <div className="project-dependency-explorer-tree__node__icon__expand">
            {nodeExpandIcon}
          </div>
          {node instanceof ConflictTreeNodeData && (
            <div className="project-dependency-explorer-tree__node__icon__type">
              <RepoIcon />
            </div>
          )}
          {node instanceof ConflictVersionNodeData && (
            <div className="project-dependency-explorer-tree__node__icon__type">
              <VersionsIcon />
            </div>
          )}
        </div>
        <button
          className="tree-view__node__label project-dependency-explorer-tree__node__label"
          tabIndex={-1}
          title={node.description}
        >
          {node.label}
        </button>
        {node instanceof ProjectDependencyTreeNodeData && (
          <div className="project-dependency-explorer-tree__node__version">
            <button
              className="project-dependency-explorer-tree__node__version-btn"
              title={node.value.versionId}
              tabIndex={-1}
            >
              {node.value.versionId}
            </button>
          </div>
        )}
      </div>
    </ContextMenu>
  );
};

const ConflictDependencyTreeView: React.FC<{
  treeData: TreeData<ProjectDependencyConflictTreeNodeData>;
  setTreeData: (
    treeData: TreeData<ProjectDependencyConflictTreeNodeData>,
  ) => void;
}> = (props) => {
  const { treeData, setTreeData } = props;
  const onNodeExpand = (node: ProjectDependencyConflictTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
    }
    setTreeData({ ...treeData });
  };
  const onNodeSelect = (node: ProjectDependencyConflictTreeNodeData): void => {
    onNodeExpand(node);
    setTreeData({ ...treeData });
  };
  const getChildNodes = (
    node: ProjectDependencyConflictTreeNodeData,
  ): ProjectDependencyConflictTreeNodeData[] => {
    if (!node.childrenIds || node.childrenIds.length === 0) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable);
    return childrenNodes;
  };
  return (
    <TreeView
      components={{
        TreeNodeContainer: ConflictTreeNodeContainer,
      }}
      treeData={treeData}
      getChildNodes={getChildNodes}
      onNodeSelect={onNodeSelect}
      innerProps={{
        onNodeExpand,
      }}
    />
  );
};

const collapseTreeData = (
  treeData: TreeData<ProjectDependencyTreeNodeData>,
): void => {
  Array.from(treeData.nodes.values()).forEach((node) => {
    node.isOpen = false;
  });
};

export const getConflictsString = (
  report: ProjectDependencyGraphReport,
): string =>
  Array.from(report.conflictInfo.entries())
    .map(([k, conflictVersionPaths]) => {
      const base = `project:\n${
        ' '.repeat(DEFAULT_TAB_SIZE) +
        generateGAVCoordinates(k.groupId, k.artifactId, undefined)
      }`;
      const versionConflictString = conflictVersionPaths
        .map((conflictVersion) => {
          const versions = `version: ${conflictVersion.version.versionId}\n`;
          const paths = `paths:\n${conflictVersion.pathsToVersion
            .map(
              (p, idx) =>
                `${' '.repeat(DEFAULT_TAB_SIZE) + (idx + 1)}:\n${p
                  .map((l) => l.id)
                  .join('>')}`,
            )
            .join('\n')}`;
          return versions + paths;
        })
        .join('\n');

      return `${base}\n${versionConflictString}`;
    })
    .join('\n\n');

const ProjectDependencyConflictViewer = observer(
  (props: {
    dependencyEditorState: ProjectDependencyEditorState;
    report: ProjectDependencyGraphReport;
  }) => {
    const { report, dependencyEditorState } = props;
    const hasConflict = Boolean(report.conflicts.length);
    const collapseTree = (): void => {
      dependencyEditorState.conflictStates?.forEach((c) => {
        const treeData = c.treeData;
        Array.from(treeData.nodes.values()).forEach((n) => (n.isOpen = false));
        c.setTreeData({ ...treeData });
      });
    };
    const expandAllNodes = (): void => {
      dependencyEditorState.expandAllConflicts();
    };

    useEffect(() => {
      if (hasConflict && !dependencyEditorState.conflictStates) {
        dependencyEditorState.buildConflictPaths();
      }
    }, [dependencyEditorState, hasConflict]);

    return (
      <Panel className="project-dependency-explorer">
        <PanelHeader title="conflicts">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              title="Collapse Tree"
              disabled={!hasConflict || !dependencyEditorState.conflictStates}
              onClick={collapseTree}
            >
              <CompressIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem
              title="Expand All Conflict Paths"
              disabled={!hasConflict || !dependencyEditorState.conflictStates}
              onClick={expandAllNodes}
            >
              <ExpandAllIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <div className="project-dependency-explorer__content">
          {hasConflict && dependencyEditorState.conflictStates && (
            <div>
              {dependencyEditorState.conflictStates.map((c) => (
                <ConflictDependencyTreeView
                  key={c.uuid}
                  treeData={c.treeData}
                  setTreeData={(
                    treeData: TreeData<ProjectDependencyConflictTreeNodeData>,
                  ) => c.setTreeData(treeData)}
                />
              ))}
            </div>
          )}
          {!hasConflict && <BlankPanelContent>No Conflicts</BlankPanelContent>}
        </div>
      </Panel>
    );
  },
);

const ProjectDependencyReportModal = observer(
  (props: {
    dependencyEditorState: ProjectDependencyEditorState;
    tab: DEPENDENCY_REPORT_TAB;
  }) => {
    const { dependencyEditorState } = props;
    const applicationStore = dependencyEditorState.editorStore.applicationStore;
    const reportTab = dependencyEditorState.reportTab;
    const tabs = Object.values(DEPENDENCY_REPORT_TAB);
    const changeTab =
      (tab: DEPENDENCY_REPORT_TAB): (() => void) =>
      (): void =>
        dependencyEditorState.setReportTab(tab);
    const dependencyReport = dependencyEditorState.dependencyReport;
    const closeModal = (): void =>
      dependencyEditorState.setReportTab(undefined);
    const [flattenView, setFlattenView] = useState(false);
    const [isExpandingDependencies, setIsExpandingDependencies] =
      useState(false);
    const setTreeData = (
      val: TreeData<ProjectDependencyTreeNodeData>,
    ): void => {
      dependencyEditorState.setTreeData(val, flattenView);
    };
    const toggleViewAsListOrAsTree = (): void => {
      setFlattenView(!flattenView);
    };
    const treeData = flattenView
      ? dependencyEditorState.flattenDependencyTreeData
      : dependencyEditorState.dependencyTreeData;
    const collapseTree = (): void => {
      if (treeData) {
        collapseTreeData(treeData);
        setTreeData({ ...treeData });
      }
    };
    const openAllDependencyNodes = (): void => {
      if (treeData && dependencyReport) {
        setIsExpandingDependencies(true);
        openAllDependencyNodesInTree(treeData, dependencyReport.graph);
        setTreeData({ ...treeData });
        setIsExpandingDependencies(false);
      }
    };
    return (
      <Dialog
        open={Boolean(dependencyEditorState.reportTab)}
        onClose={closeModal}
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
          <ModalHeader title="Dependency Explorer" />
          <ModalBody>
            <div className="panel project-dependency-report">
              <PanelLoadingIndicator
                isLoading={Boolean(
                  isExpandingDependencies ||
                    dependencyEditorState.expandConflictsState.isInProgress ||
                    dependencyEditorState.buildConflictPathState.isInProgress,
                )}
              />
              <div className="panel__header project-dependency-report__tabs__header">
                <div className="project-dependency-report__tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={changeTab(tab)}
                      className={clsx('project-dependency-report__tab', {
                        'project-dependency-report__tab--active':
                          tab === reportTab,
                      })}
                    >
                      {prettyCONSTName(tab)}
                    </button>
                  ))}
                </div>
              </div>
              {reportTab === DEPENDENCY_REPORT_TAB.EXPLORER && (
                <Panel className="project-dependency-explorer">
                  <PanelHeader>
                    <div className="panel__header__title">
                      <div className="panel__header__title__label">
                        explorer
                      </div>
                    </div>
                    <PanelHeaderActions>
                      {!flattenView && (
                        <>
                          <PanelHeaderActionItem
                            disabled={!treeData}
                            onClick={collapseTree}
                            title="Collapse Tree"
                          >
                            <CompressIcon />
                          </PanelHeaderActionItem>
                          <PanelHeaderActionItem
                            disabled={!treeData || !dependencyReport}
                            onClick={openAllDependencyNodes}
                            title="Expand All Dependencies"
                          >
                            <ExpandAllIcon />
                          </PanelHeaderActionItem>
                        </>
                      )}
                      <div className="panel__header__action query-builder__functions-explorer__custom-icon">
                        {flattenView ? (
                          <SubjectIcon
                            title="View as Tree"
                            onClick={toggleViewAsListOrAsTree}
                          />
                        ) : (
                          <ViewHeadlineIcon
                            title="View as Flatten List"
                            onClick={toggleViewAsListOrAsTree}
                          />
                        )}
                      </div>
                    </PanelHeaderActions>
                  </PanelHeader>
                  <div className="project-dependency-explorer__content">
                    {treeData && (
                      <DependencyTreeView
                        treeData={treeData}
                        setTreeData={setTreeData}
                      />
                    )}
                  </div>
                </Panel>
              )}
              {reportTab === DEPENDENCY_REPORT_TAB.CONFLICTS &&
                dependencyReport && (
                  <ProjectDependencyConflictViewer
                    report={dependencyReport}
                    dependencyEditorState={dependencyEditorState}
                  />
                )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const ProjectVersionDependencyEditor = observer(
  (props: {
    projectDependency: ProjectDependency;
    deleteValue: () => void;
    isReadOnly: boolean;
    projects: Map<string, StoreProjectData>;
  }) => {
    // init
    const { projectDependency, deleteValue, isReadOnly, projects } = props;
    const projectDependencyData = projects.get(projectDependency.projectId);
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const projectSelectorRef = useRef<SelectComponent>(null);
    const versionSelectorRef = useRef<SelectComponent>(null);
    const configState = editorStore.projectConfigurationEditorState;
    const dependencyEditorState = configState.projectDependencyEditorState;
    const versions: string[] =
      configState.versions.get(projectDependency.projectId) ?? [];
    const [fetchSelectedProjectVersionsStatus] = useState(ActionState.create());
    // project
    const selectedProject = configState.projects.get(
      projectDependency.projectId,
    );
    const selectedProjectOption = selectedProject
      ? buildProjectOption(selectedProject)
      : null;
    const projectDisabled =
      !configState.associatedProjectsAndVersionsFetched ||
      configState.isReadOnly;
    const projectsOptions = Array.from(configState.projects.values())
      .map(buildProjectOption)
      .sort(compareLabelFn);
    const onProjectSelectionChange = async (
      val: ProjectOption | null,
    ): Promise<void> => {
      if (
        (val !== null || selectedProjectOption !== null) &&
        (!val ||
          !selectedProjectOption ||
          val.value !== selectedProjectOption.value)
      ) {
        projectDependency.setProjectId(val?.value.coordinates ?? '');
        projectDependency.setVersionId('');
        if (val) {
          try {
            fetchSelectedProjectVersionsStatus.inProgress();
            const _versions = await editorStore.depotServerClient.getVersions(
              guaranteeNonNullable(projectDependency.groupId),
              guaranteeNonNullable(projectDependency.artifactId),
              true,
            );
            configState.versions.set(val.value.coordinates, _versions);
            if (_versions.length) {
              projectDependency.setVersionId(
                guaranteeNonNullable(_versions[_versions.length - 1]),
              );
              flowResult(dependencyEditorState.fetchDependencyReport()).catch(
                applicationStore.alertUnhandledError,
              );
            } else {
              projectDependency.setVersionId('');
            }
          } catch (error) {
            assertErrorThrown(error);
            editorStore.applicationStore.notificationService.notifyError(error);
          } finally {
            fetchSelectedProjectVersionsStatus.reset();
          }
        }
      }
    };
    // version
    const version = projectDependency.versionId;
    const versionOptions = versions
      .toSorted((v1, v2) => compareSemVerVersions(v2, v1))
      .map((v) => {
        if (v === MASTER_SNAPSHOT_ALIAS) {
          return { value: v, label: SNAPSHOT_VERSION_ALIAS };
        }
        return { value: v, label: v };
      });
    const selectedVersionOption: VersionOption | null =
      versionOptions.find((v) => v.value === version) ?? null;
    const versionDisabled =
      Boolean(!versions.length || !projectDependency.projectId.length) ||
      !configState.associatedProjectsAndVersionsFetched ||
      isReadOnly;

    const onVersionSelectionChange = (val: VersionOption | null): void => {
      if (
        (val !== null || selectedVersionOption !== null) &&
        (!val ||
          !selectedVersionOption ||
          val.value !== selectedVersionOption.value)
      ) {
        try {
          projectDependency.setVersionId(val?.value ?? '');
          flowResult(dependencyEditorState.fetchDependencyReport()).catch(
            applicationStore.alertUnhandledError,
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.logService.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
            error,
          );
        }
      }
    };
    const viewProject = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateViewProjectByGAVRoute(
            guaranteeNonNullable(projectDependency.groupId),
            guaranteeNonNullable(projectDependency.artifactId),
            projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
              ? SNAPSHOT_VERSION_ALIAS
              : projectDependency.versionId,
          ),
        ),
      );
    };
    // NOTE: This assumes that the dependant project is in the same studio instance as the current project
    // In the future, the studio instance may be part of the project data
    const viewSDLCProject = (): void => {
      if (projectDependencyData) {
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
              ? generateViewProjectRoute(projectDependencyData.projectId)
              : generateViewVersionRoute(
                  projectDependencyData.projectId,
                  projectDependency.versionId,
                ),
          ),
        );
      }
    };
    const projectSelectorPlaceholder = !projectDependency.projectId.length
      ? 'Choose project'
      : versionDisabled
        ? 'No project version found. Please create a new one.'
        : 'Select version';

    return (
      <div className="project-dependency-editor">
        <CustomSelectorInput
          className="project-dependency-editor__selector"
          inputRef={projectSelectorRef}
          disabled={projectDisabled}
          options={projectsOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={(val: ProjectOption | null) => {
            onProjectSelectionChange(val).catch(
              applicationStore.alertUnhandledError,
            );
          }}
          value={selectedProjectOption}
          isLoading={configState.fetchingProjectVersionsState.isInProgress}
          formatOptionLabel={formatOptionLabel}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <CustomSelectorInput
          className="project-dependency-editor__selector"
          inputRef={versionSelectorRef}
          options={versionOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={onVersionSelectionChange}
          value={selectedVersionOption}
          disabled={versionDisabled}
          placeholder={
            fetchSelectedProjectVersionsStatus.isInProgress
              ? 'Fetching project versions'
              : projectSelectorPlaceholder
          }
          isLoading={
            editorStore.projectConfigurationEditorState
              .fetchingProjectVersionsState.isInProgress ||
            fetchSelectedProjectVersionsStatus.isInProgress
          }
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <ControlledDropdownMenu
          className="project-dependency-editor__visit-project-btn__dropdown-trigger btn--medium"
          content={
            <MenuContent>
              <MenuContentItem
                disabled={!selectedProject || !selectedVersionOption}
                onClick={viewProject}
                title="View project"
              >
                Project
              </MenuContentItem>
              <MenuContentItem
                title="View SDLC project"
                disabled={
                  !selectedProject ||
                  !selectedVersionOption ||
                  !projectDependencyData
                }
                onClick={viewSDLCProject}
              >
                SDLC project
              </MenuContentItem>
            </MenuContent>
          }
        >
          Go to... <CaretDownIcon title="Show more options..." />
        </ControlledDropdownMenu>

        <button
          className="project-dependency-editor__remove-btn btn--dark btn--caution"
          disabled={isReadOnly}
          onClick={deleteValue}
          tabIndex={-1}
          title="Close"
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

export const ProjectDependencyEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const configState = editorStore.tabManagerState.getCurrentEditorState(
    ProjectConfigurationEditorState,
  );
  const dependencyEditorState = configState.projectDependencyEditorState;
  const currentProjectConfiguration = configState.currentProjectConfiguration;
  const deleteProjectDependency =
    (val: ProjectDependency): (() => void) =>
    (): void => {
      currentProjectConfiguration.deleteProjectDependency(val);
      flowResult(dependencyEditorState.fetchDependencyReport()).catch(
        applicationStore.alertUnhandledError,
      );
    };
  const isReadOnly = editorStore.isInViewerMode;
  const isLoading =
    configState.updatingConfigurationState.isInProgress ||
    configState.fetchingProjectVersionsState.isInProgress ||
    dependencyEditorState.fetchingDependencyInfoState.isInProgress;

  return (
    <PanelContentLists>
      {isLoading && (
        <div className="project-dependency-editor__progress-msg">
          {configState.updatingConfigurationState.isInProgress
            ? `Updating configuration...`
            : configState.fetchingProjectVersionsState.isInProgress
              ? `Fetching dependency versions`
              : 'Updating project dependency tree and potential conflicts'}
        </div>
      )}
      <ProjectDependencyActions dependencyEditorState={dependencyEditorState} />
      {currentProjectConfiguration.projectDependencies.map(
        (projectDependency) => (
          <ProjectVersionDependencyEditor
            key={projectDependency._UUID}
            projectDependency={projectDependency}
            deleteValue={deleteProjectDependency(projectDependency)}
            isReadOnly={isReadOnly}
            projects={configState.projects}
          />
        ),
      )}
      {dependencyEditorState.reportTab && (
        <ProjectDependencyReportModal
          tab={dependencyEditorState.reportTab}
          dependencyEditorState={dependencyEditorState}
        />
      )}
    </PanelContentLists>
  );
});
