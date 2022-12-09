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
  EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
  TAB_SIZE,
} from '@finos/legend-application';
import {
  type SelectComponent,
  type TreeData,
  type TreeNodeContainerProps,
  compareLabelFn,
  clsx,
  CustomSelectorInput,
  TimesIcon,
  ExternalLinkSquareIcon,
  Dialog,
  DropdownMenu,
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
  RepoIcon,
  CompressIcon,
  SubjectIcon,
  ViewHeadlineIcon,
} from '@finos/legend-art';
import {
  MASTER_SNAPSHOT_ALIAS,
  type ProjectDependencyGraphReport,
  type ProjectData,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import type { ProjectDependency } from '@finos/legend-server-sdlc';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import {
  compareSemVerVersions,
  generateGAVCoordinates,
} from '@finos/legend-storage';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { forwardRef, useRef, useState } from 'react';
import {
  type DependencyTreeNodeData,
  buildDependencyNodeChildren,
  ProjectConfigurationEditorState,
} from '../../../../stores/editor-state/ProjectConfigurationEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../stores/LegendStudioAppEvent.js';
import {
  generateViewProjectByGAVRoute,
  generateViewVersionRoute,
} from '../../../../stores/LegendStudioRouter.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

interface VersionOption {
  label: string;
  value: string;
}
interface ProjectOption {
  label: string;
  value: ProjectData;
}

const buildProjectOption = (project: ProjectData): ProjectOption => ({
  label: project.coordinates,
  value: project,
});

const ProjectDependencyActions = observer(
  (props: { config: ProjectConfigurationEditorState }) => {
    const { config } = props;
    const hasConflicts = config.dependencyReport?.conflicts.length;
    const viewTree = (): void => {
      if (config.dependencyReport) {
        config.setDependencyTreeReportModal(true);
      }
    };
    const viewConflict = (): void => {
      if (config.dependencyReport) {
        config.setDependencyConflictModal(true);
      }
    };
    return (
      <div className="project-dependency-editor__info">
        <button
          className="btn btn--dark"
          tabIndex={-1}
          onClick={viewTree}
          disabled={!config.dependencyReport}
          title="View Dependency Explorer"
        >
          View Dependency Explorer
        </button>

        {Boolean(hasConflicts) && (
          <button
            className="project-dependency-editor__conflicts-btn"
            tabIndex={-1}
            onClick={viewConflict}
            disabled={!config.dependencyReport?.conflictPaths.size}
            title="View any conflicts in your dependencies"
          >
            View Conflicts
          </button>
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
      node: DependencyTreeNodeData;
    }
  >(function WorkflowExplorerContextMenu(props, ref) {
    const { node } = props;
    const value = node.value;
    const applicationStore = useApplicationStore();
    const viewProject = (): void => {
      applicationStore.navigator.visitAddress(
        applicationStore.navigator.generateAddress(
          generateViewProjectByGAVRoute(
            guaranteeNonNullable(value.groupId),
            guaranteeNonNullable(value.artifactId),
            value.versionId === MASTER_SNAPSHOT_ALIAS
              ? SNAPSHOT_VERSION_ALIAS
              : value.versionId,
          ),
        ),
      );
    };
    const viewSDLCProject = (): void => {
      applicationStore.navigator.visitAddress(
        applicationStore.navigator.generateAddress(
          generateViewVersionRoute(value.projectId, value.versionId),
        ),
      );
    };

    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        <MenuContentItem onClick={viewProject}>Visit Project</MenuContentItem>
        <MenuContentItem onClick={viewSDLCProject}>
          Visit SDLC Project
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const DependencyTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DependencyTreeNodeData,
    {
      onNodeExpand: (node: DependencyTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { onNodeExpand } = innerProps;
  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const expandNode = (): void => onNodeExpand(node);
  const value = node.value;
  const label = `${value.artifactId}:${value.versionId}`;
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
          <div
            onClick={expandNode}
            className="project-dependency-explorer-tree__node__icon__expand"
          >
            {nodeExpandIcon}
          </div>
          <div className="project-dependency-explorer-tree__node__icon__type">
            <RepoIcon />
          </div>
        </div>

        <button
          className="tree-view__node__label project-dependency-explorer-tree__node__label"
          tabIndex={-1}
          title={node.id}
        >
          {label}
        </button>
      </div>
    </ContextMenu>
  );
};

const DependencyTreeView: React.FC<{
  configState: ProjectConfigurationEditorState;
  treeData: TreeData<DependencyTreeNodeData>;
  setTreeData: (treeData: TreeData<DependencyTreeNodeData>) => void;
}> = (props) => {
  const { treeData, setTreeData } = props;
  const onNodeExpand = (node: DependencyTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        .forEach((c) => buildDependencyNodeChildren(c, treeData.nodes));
    }
    setTreeData({ ...treeData });
  };
  const onNodeSelect = (node: DependencyTreeNodeData): void => {
    buildDependencyNodeChildren(node, treeData.nodes);
    onNodeExpand(node);
    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: DependencyTreeNodeData,
  ): DependencyTreeNodeData[] => {
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

const ProjectDependencyExplorer = observer(
  (props: { configState: ProjectConfigurationEditorState }) => {
    const { configState } = props;
    const closeModal = (): void =>
      configState.setDependencyTreeReportModal(false);
    const [viewAsTree, setViewAsTree] = useState(true);
    const setTreeData = (treeData: TreeData<DependencyTreeNodeData>): void => {
      if (viewAsTree) {
        configState.setDependencyTreeData(treeData);
      } else {
        configState.setFlattenDependencyTreeData(treeData);
      }
    };
    const toggleViewAsListOrAsTree = (): void => {
      setViewAsTree(!viewAsTree);
    };
    const treeData = viewAsTree
      ? configState.dependencyTreeData
      : configState.flattenDependencyTreeData;
    const collapseTree = (): void => {
      if (treeData) {
        Array.from(treeData.nodes.values()).forEach((node) => {
          node.isOpen = false;
        });
      }
    };
    return (
      <Dialog
        open={Boolean(configState.dependencyTreeReportModal)}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title="Dependency Explorer" />
          <ModalBody>
            <div className="panel project-dependency-explorer">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">explorer</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    onClick={collapseTree}
                    tabIndex={-1}
                  >
                    {viewAsTree && <CompressIcon title="Collapse Tree" />}
                  </button>
                  <div className="panel__header__action query-builder__functions-explorer__custom-icon">
                    {!viewAsTree ? (
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
                </div>
              </div>
              <div className="project-dependency-explorer__content">
                {treeData && (
                  <DependencyTreeView
                    configState={configState}
                    treeData={treeData}
                    setTreeData={setTreeData}
                  />
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              className="btn modal__footer__close-btn"
              onClick={closeModal}
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const getConflictsString = (
  report: ProjectDependencyGraphReport,
): string =>
  Array.from(report.conflictPaths.entries())
    .map(([k, conflictVersionPaths]) => {
      const base = `project:\n${
        ' '.repeat(TAB_SIZE) +
        generateGAVCoordinates(k.groupId, k.artifactId, undefined)
      }`;
      const versionConflictString = conflictVersionPaths
        .map((conflictVersion) => {
          const versions = `version: ${conflictVersion.versionNode.versionId}\n`;
          const paths = `paths:\n${conflictVersion.paths
            .map(
              (p, idx) =>
                `${' '.repeat(TAB_SIZE) + (idx + 1)}:\n${p
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

const ProjectDependencyConflictModal = observer(
  (props: { configState: ProjectConfigurationEditorState }) => {
    const { configState } = props;
    const report = configState.dependencyReport;
    const closeModal = (): void =>
      configState.setDependencyConflictModal(false);
    return (
      <Dialog
        open={Boolean(configState.dependencyConflictModal)}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title="Conflict Viewer" />
          <ModalBody>
            {report && (
              <TextInputEditor
                inputValue={getConflictsString(report)}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.TEXT}
                showMiniMap={true}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <button
              className="btn modal__footer__close-btn"
              onClick={closeModal}
            >
              Close
            </button>
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
    projects: Map<string, ProjectData>;
  }) => {
    // init
    const { projectDependency, deleteValue, isReadOnly, projects } = props;
    const projectDependencyData = projects.get(projectDependency.projectId);
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const projectSelectorRef = useRef<SelectComponent>(null);
    const versionSelectorRef = useRef<SelectComponent>(null);
    const configState = editorStore.projectConfigurationEditorState;
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
    const onProjectSelectionChange = (val: ProjectOption | null): void => {
      if (
        (val !== null || selectedProjectOption !== null) &&
        (!val ||
          !selectedProjectOption ||
          val.value !== selectedProjectOption.value)
      ) {
        projectDependency.setProjectId(val?.value.coordinates ?? '');
        if (val) {
          projectDependency.setVersionId(val.value.latestVersion);
          flowResult(configState.fetchDependencyInfo()).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
    };
    // version
    const version = projectDependency.versionId;
    const versions = selectedProject?.versions ?? [];
    let versionOptions = versions
      .slice()
      .sort((v1, v2) => compareSemVerVersions(v2, v1))
      .map((v) => ({ value: v, label: v }));
    versionOptions = [
      { label: SNAPSHOT_VERSION_ALIAS, value: MASTER_SNAPSHOT_ALIAS },
      ...versionOptions,
    ];
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
          flowResult(configState.fetchDependencyInfo()).catch(
            applicationStore.alertUnhandledError,
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.log.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
            error,
          );
        }
      }
    };
    const viewProject = (): void => {
      if (!projectDependency.isLegacyDependency) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewProjectByGAVRoute(
              guaranteeNonNullable(projectDependency.groupId),
              guaranteeNonNullable(projectDependency.artifactId),
              projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
                ? SNAPSHOT_VERSION_ALIAS
                : projectDependency.versionId,
            ),
          ),
        );
      }
    };
    // NOTE: This assumes that the dependant project is in the same studio instance as the current project
    // In the future, the studio instance may be part of the project data
    const viewSDLCProject = (): void => {
      if (projectDependencyData) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewVersionRoute(projectDependencyData.projectId, version),
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
          ref={projectSelectorRef}
          disabled={projectDisabled}
          options={projectsOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={onProjectSelectionChange}
          value={selectedProjectOption}
          isLoading={configState.fetchingProjectVersionsState.isInProgress}
          formatOptionLabel={formatOptionLabel}
          darkMode={true}
        />
        <CustomSelectorInput
          className="project-dependency-editor__selector"
          ref={versionSelectorRef}
          options={versionOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={onVersionSelectionChange}
          value={selectedVersionOption}
          disabled={versionDisabled}
          placeholder={projectSelectorPlaceholder}
          isLoading={
            editorStore.projectConfigurationEditorState
              .fetchingProjectVersionsState.isInProgress
          }
          darkMode={true}
        />
        <div className="project-dependency-editor__visit-project-btn">
          <button
            className="project-dependency-editor__visit-project-btn__btn btn--dark"
            disabled={
              projectDependency.isLegacyDependency ||
              !selectedProject ||
              !selectedVersionOption
            }
            onClick={viewProject}
            tabIndex={-1}
            title="View project"
          >
            <ExternalLinkSquareIcon />
          </button>
          <DropdownMenu
            className="project-dependency-editor__visit-project-btn__dropdown-trigger btn--dark"
            content={
              <MenuContent>
                <MenuContentItem
                  disabled={
                    projectDependency.isLegacyDependency ||
                    !selectedProject ||
                    !selectedVersionOption ||
                    !projectDependencyData
                  }
                  onClick={viewSDLCProject}
                >
                  View SDLC project
                </MenuContentItem>
              </MenuContent>
            }
          >
            <CaretDownIcon title="Show more options..." />
          </DropdownMenu>
        </div>
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
  const currentProjectConfiguration = configState.currentProjectConfiguration;
  const deleteProjectDependency =
    (val: ProjectDependency): (() => void) =>
    (): void => {
      currentProjectConfiguration.deleteProjectDependency(val);
      flowResult(configState.fetchDependencyInfo()).catch(
        applicationStore.alertUnhandledError,
      );
    };
  const isReadOnly = editorStore.isInViewerMode;
  const isLoading =
    configState.updatingConfigurationState.isInProgress ||
    configState.fetchingProjectVersionsState.isInProgress ||
    configState.fetchingDependencyInfoState.isInProgress;

  return (
    <div className="panel__content__lists">
      <PanelLoadingIndicator isLoading={isLoading} />
      {isLoading && (
        <div className="project-dependency-editor__progress-msg">
          {configState.updatingConfigurationState.isInProgress
            ? `Updating configuration...`
            : configState.fetchingProjectVersionsState.isInProgress
            ? `Fetching dependency versions`
            : 'Updating project dependency tree and potential conflicts'}
        </div>
      )}
      <ProjectDependencyActions config={configState} />
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
      {configState.dependencyReport &&
        configState.dependencyTreeData &&
        configState.dependencyTreeReportModal && (
          <ProjectDependencyExplorer configState={configState} />
        )}
      {configState.dependencyConflictModal &&
        configState.dependencyReport?.conflictPaths.size && (
          <ProjectDependencyConflictModal configState={configState} />
        )}
    </div>
  );
});
