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

import { useState, useRef, useMemo, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type InputActionData,
  Dialog,
  PanelLoadingIndicator,
  Modal,
  PanelFormActions,
  PanelFormTextField,
  PanelDivider,
  PanelForm,
  PanelFormBooleanField,
  CustomSelectorInput,
  CheckIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleNotchIcon,
  EmptyCircleIcon,
  ExclamationTriangleIcon,
  SearchIcon,
  SquareIcon,
  TimesCircleIcon,
  TimesIcon,
  UserIcon,
  UsersIcon,
  clsx,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  type Project,
  WorkspaceType,
  Patch,
  Workspace,
  EntityChangeType,
  getChangeTypeIconFromChange,
} from '@finos/legend-server-sdlc';
import { useApplicationStore } from '@finos/legend-application';
import { resolvePackagePathAndElementName } from '@finos/legend-graph';
import { extractEntityNameFromPath } from '@finos/legend-storage';
import { debounce } from '@finos/legend-shared';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/LegendStudioDocumentation.js';
import {
  DEFAULT_WORKSPACE_SOURCE,
  useWorkspaceSetupStore,
} from './WorkspaceSetup.js';
import {
  type WorkspaceOption,
  buildWorkspaceOption,
  formatWorkspaceOptionLabel,
} from './WorkspaceSelectorUtils.js';
import {
  type ProjectOption,
  buildProjectOption,
} from './ProjectSelectorUtils.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import type { WorkspaceCopyState } from '../../stores/workspace-setup/WorkspaceCopyState.js';
import {
  type OtherProjectCopySourceState,
  OtherProjectWorkspaceCopyState,
} from '../../stores/workspace-setup/OtherProjectWorkspaceCopyState.js';

export interface PatchOption {
  label: string;
  value: Patch | string;
}

/**
 * Where a new workspace starts from: HEAD, a patch, or a workspace of the
 * project, whose changes it copies, or of another project, which it copies
 * whole
 */
export interface WorkspaceSourceOption {
  label: string;
  value: PatchOption['value'] | Workspace;
}

// NOTE: the workspace of another project is then picked in fields of its own
const OTHER_PROJECT_WORKSPACE_SOURCE = 'other-project-workspace';
const OTHER_PROJECT_SOURCE_OPTION: WorkspaceSourceOption = {
  label: 'A workspace in another project…',
  value: OTHER_PROJECT_WORKSPACE_SOURCE,
};

// NOTE: `DEFAULT_WORKSPACE_SOURCE` comes from a module that imports this one,
// so it is only read once the modal renders
const buildHeadSourceOption = (): WorkspaceSourceOption => ({
  label: DEFAULT_WORKSPACE_SOURCE,
  value: DEFAULT_WORKSPACE_SOURCE,
});

/**
 * The line a workspace made from this source is on: `undefined` for HEAD,
 * else the patch's release version
 */
const getWorkspaceSourceLine = (
  option: WorkspaceSourceOption | null,
): string | undefined =>
  option?.value instanceof Patch
    ? option.value.patchReleaseVersionId.id
    : option?.value instanceof Workspace
      ? option.value.source
      : undefined;

const pluralize = (
  count: number,
  noun: string,
  pluralNoun = `${noun}s`,
): string => `${count} ${count === 1 ? noun : pluralNoun}`;

// NOTE: the menu list of `CustomSelectorInput` lays out its options in rows of
// one height, which can't hold groups, so list the sources without it
const WorkspaceSourceMenuList = (props: {
  children?: React.ReactNode;
  innerRef: React.Ref<HTMLDivElement>;
  innerProps: React.HTMLAttributes<HTMLDivElement>;
  maxHeight: number;
}): React.ReactElement => (
  <div
    {...props.innerProps}
    ref={props.innerRef}
    className="workspace-source-selector__menu-list"
    style={{ maxHeight: props.maxHeight }}
  >
    {props.children}
  </div>
);

const CHANGE_TYPE_LABEL: Partial<Record<EntityChangeType, string>> = {
  [EntityChangeType.CREATE]: 'New',
  [EntityChangeType.MODIFY]: 'Modified',
  [EntityChangeType.DELETE]: 'Deleted',
};

const ChangeTypeLetter = (props: {
  type: EntityChangeType;
  label?: string | undefined;
}): React.ReactElement => (
  <span
    className={clsx(
      'workspace-setup__create-workspace-modal__copy__change-type',
      `workspace-setup__create-workspace-modal__copy__change-type--${props.type.toLowerCase()}`,
    )}
    title={props.label ?? CHANGE_TYPE_LABEL[props.type]}
  >
    {getChangeTypeIconFromChange(props.type)}
  </span>
);

const ElementPath = (props: { entityPath: string }): React.ReactElement => {
  const [packagePath, name] = resolvePackagePathAndElementName(
    props.entityPath,
  );
  return (
    <span className="workspace-setup__create-workspace-modal__copy__element__path">
      {packagePath && (
        <span className="workspace-setup__create-workspace-modal__copy__element__package">
          {`${packagePath}::`}
        </span>
      )}
      <span className="workspace-setup__create-workspace-modal__copy__element__name">
        {name}
      </span>
    </span>
  );
};

const WorkspaceCopySummary = observer(
  (props: { copy: WorkspaceCopyState; projectName: string }) => {
    const { copy, projectName } = props;
    const [showElements, setShowElements] = useState(true);
    const sourceName = copy.source.workspaceId;
    const lineLabel = copy.source.source
      ? `patch/${copy.source.source}`
      : DEFAULT_WORKSPACE_SOURCE;

    if (copy.loadState.hasFailed) {
      return (
        <div
          className="workspace-setup__create-workspace-modal__copy workspace-setup__create-workspace-modal__copy--error"
          role="alert"
        >
          {`Can't read what ${sourceName} changed: ${copy.loadError ?? ''}`}
        </div>
      );
    }
    if (!copy.loadState.hasSucceeded) {
      return (
        <div className="workspace-setup__create-workspace-modal__copy workspace-setup__create-workspace-modal__copy--loading">
          <CircleNotchIcon className="workspace-setup__create-workspace-modal__copy__spinner" />
          {`Reading what ${sourceName} changed...`}
        </div>
      );
    }

    const { created, modified, deleted } = copy.counts;
    const changeCount = copy.changes.length;
    const alsoChangedPaths = Array.from(copy.pathsAlsoChangedOnLine);
    const lineName = copy.source.source ? lineLabel : projectName;
    return (
      <div className="workspace-setup__create-workspace-modal__copy">
        <div className="workspace-setup__create-workspace-modal__copy__header">
          <div className="workspace-setup__create-workspace-modal__copy__title">
            {changeCount
              ? `${pluralize(changeCount, 'change')} to copy`
              : 'No changes to copy'}
          </div>
          <div className="workspace-setup__create-workspace-modal__copy__counts">
            {Boolean(created) && (
              <span>
                <ChangeTypeLetter type={EntityChangeType.CREATE} />
                {` ${created} new`}
              </span>
            )}
            {Boolean(modified) && (
              <span>
                <ChangeTypeLetter type={EntityChangeType.MODIFY} />
                {` ${modified} modified`}
              </span>
            )}
            {Boolean(deleted) && (
              <span>
                <ChangeTypeLetter type={EntityChangeType.DELETE} />
                {` ${deleted} deleted`}
              </span>
            )}
          </div>
        </div>
        <div className="workspace-setup__create-workspace-modal__copy__description">
          {changeCount
            ? `What ${sourceName} changed since it was created is applied on top of ${lineLabel}, the line ${sourceName} is on, as one commit. ${sourceName} itself is not touched.`
            : `${sourceName} has no changes yet, so the new workspace starts from the latest version of ${lineLabel}.`}
        </div>
        {copy.isSourceOutdated && Boolean(changeCount) && (
          <div className="workspace-setup__create-workspace-modal__copy__warning">
            <ExclamationTriangleIcon className="workspace-setup__create-workspace-modal__copy__warning__icon" />
            <div>
              {copy.source.source
                ? `${sourceName} is behind ${lineName}. If an element it changed also changed there since, the copy keeps ${sourceName}'s version.`
                : alsoChangedPaths.length
                  ? `${sourceName} is behind ${lineName}. ${
                      alsoChangedPaths.length === 1
                        ? alsoChangedPaths[0]
                        : `${alsoChangedPaths.length} of the elements it changed`
                    } also changed in the project after ${sourceName} was created; the copy keeps ${sourceName}'s version.`
                  : `${sourceName} is behind ${lineName}, but none of the elements it changed were changed there since.`}
            </div>
          </div>
        )}
        {Boolean(changeCount) && (
          <>
            <button
              type="button"
              className="workspace-setup__create-workspace-modal__copy__toggle"
              aria-expanded={showElements}
              onClick={() => setShowElements(!showElements)}
            >
              {showElements ? <ChevronDownIcon /> : <ChevronRightIcon />}
              {`${showElements ? 'Hide' : 'Show'} the ${pluralize(changeCount, 'element')}`}
            </button>
            {showElements && (
              <div
                className="workspace-setup__create-workspace-modal__copy__elements"
                role="list"
                aria-label="Elements to copy"
              >
                {copy.changes.map((change) => (
                  <div
                    key={change.entityPath}
                    className={clsx(
                      'workspace-setup__create-workspace-modal__copy__element',
                      {
                        'workspace-setup__create-workspace-modal__copy__element--deleted':
                          change.type === EntityChangeType.DELETE,
                      },
                    )}
                    role="listitem"
                  >
                    <ChangeTypeLetter type={change.type} />
                    <ElementPath entityPath={change.entityPath} />
                    {copy.pathsAlsoChangedOnLine.has(change.entityPath) && (
                      <span className="workspace-setup__create-workspace-modal__copy__element__also-changed">
                        {`also changed in ${projectName}`}
                      </span>
                    )}
                    <span className="workspace-setup__create-workspace-modal__copy__element__classifier">
                      {extractEntityNameFromPath(change.classifierPath)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

const describeReplacedElements = (
  replacedPaths: string[],
  projectName: string,
): string =>
  replacedPaths.length === 1
    ? ` ${replacedPaths[0]} already exists in ${projectName} and is replaced.`
    : replacedPaths.length === 2
      ? ` ${replacedPaths[0]} and ${replacedPaths[1]} already exist in ${projectName} and are replaced.`
      : replacedPaths.length
        ? ` ${replacedPaths.length} of them already exist in ${projectName} and are replaced.`
        : '';

const OtherProjectCopyDependencies = observer(
  (props: {
    copy: OtherProjectWorkspaceCopyState;
    projectName: string;
    isReadOnly: boolean;
  }) => {
    const { copy, projectName, isReadOnly } = props;
    const sourceProjectName = copy.sourceProject.name;
    const { missing, mismatched } = copy.dependencyDiff;
    if (!missing.length && !mismatched.length) {
      return null;
    }
    return (
      <div className="workspace-setup__create-workspace-modal__copy-dependencies">
        {Boolean(missing.length) && (
          <>
            <div className="workspace-setup__create-workspace-modal__copy-dependencies__message">
              <ExclamationTriangleIcon className="workspace-setup__create-workspace-modal__copy-dependencies__icon" />
              <div>
                {`${sourceProjectName} depends on ${pluralize(missing.length, 'project')} that ${projectName} doesn't. Dependencies are project configuration, not elements, so they are not copied, and the copied elements may not compile without them.`}
              </div>
            </div>
            <div
              className="workspace-setup__create-workspace-modal__copy-dependencies__list"
              role="list"
              aria-label="Missing dependencies"
            >
              {missing.map((dependency) => (
                <div key={dependency.projectId} role="listitem">
                  {`${dependency.projectId} ${dependency.versionId}`}
                </div>
              ))}
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={copy.addsMissingDependencies}
              className="workspace-setup__create-workspace-modal__copy-dependencies__toggle"
              disabled={isReadOnly}
              onClick={() =>
                copy.setAddsMissingDependencies(!copy.addsMissingDependencies)
              }
            >
              <span className="workspace-setup__create-workspace-modal__copy-dependencies__toggle__box">
                {copy.addsMissingDependencies ? (
                  <CheckSquareIcon />
                ) : (
                  <SquareIcon />
                )}
              </span>
              {`Also add ${missing.length === 1 ? 'it' : 'them'} to the new workspace's project dependencies`}
            </button>
          </>
        )}
        {Boolean(mismatched.length) && (
          <>
            <div className="workspace-setup__create-workspace-modal__copy-dependencies__message">
              <ExclamationTriangleIcon className="workspace-setup__create-workspace-modal__copy-dependencies__icon" />
              <div>
                {`${sourceProjectName} and ${projectName} depend on ${pluralize(mismatched.length, 'project')} at different versions. ${projectName} keeps its version${mismatched.length === 1 ? '' : 's'}, which the copied elements may not compile with.`}
              </div>
            </div>
            <div
              className="workspace-setup__create-workspace-modal__copy-dependencies__list"
              role="list"
              aria-label="Dependencies at other versions"
            >
              {mismatched.map(({ source, target }) => (
                <div key={source.projectId} role="listitem">
                  {`${source.projectId} ${source.versionId} in ${sourceProjectName}, ${target.versionId} in ${projectName}`}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

const OtherProjectCopySummary = observer(
  (props: {
    copy: OtherProjectWorkspaceCopyState;
    projectName: string;
    isReadOnly: boolean;
  }) => {
    const { copy, projectName, isReadOnly } = props;
    const [showElements, setShowElements] = useState(false);
    const sourceName = copy.source.workspaceId;
    const sourceProjectName = copy.sourceProject.name;

    if (copy.loadState.hasFailed) {
      return (
        <div
          className="workspace-setup__create-workspace-modal__copy workspace-setup__create-workspace-modal__copy--error"
          role="alert"
        >
          {`Can't read ${sourceName} of ${sourceProjectName}: ${copy.loadError ?? ''}`}
        </div>
      );
    }
    if (!copy.loadState.hasSucceeded) {
      return (
        <div className="workspace-setup__create-workspace-modal__copy workspace-setup__create-workspace-modal__copy--loading">
          <CircleNotchIcon className="workspace-setup__create-workspace-modal__copy__spinner" />
          {`Reading ${sourceName} of ${sourceProjectName}...`}
        </div>
      );
    }

    const { created, modified } = copy.counts;
    const elementCount = copy.changes.length;
    const unchangedCount = copy.unchangedElementCount;
    const replacedPaths = copy.changes
      .filter((change) => change.type === EntityChangeType.MODIFY)
      .map((change) => change.entityPath);
    return (
      <>
        <div className="workspace-setup__create-workspace-modal__copy">
          <div className="workspace-setup__create-workspace-modal__copy__header">
            <div className="workspace-setup__create-workspace-modal__copy__title">
              {elementCount
                ? `${pluralize(elementCount, 'element')} to copy`
                : 'No elements to copy'}
            </div>
            <div className="workspace-setup__create-workspace-modal__copy__counts">
              {Boolean(created) && (
                <span>
                  <ChangeTypeLetter type={EntityChangeType.CREATE} />
                  {` ${created} new`}
                </span>
              )}
              {Boolean(modified) && (
                <span>
                  <ChangeTypeLetter
                    type={EntityChangeType.MODIFY}
                    label="Replaced"
                  />
                  {` ${modified} replaced`}
                </span>
              )}
            </div>
          </div>
          <div className="workspace-setup__create-workspace-modal__copy__description">
            {elementCount
              ? `They are added on top of ${projectName}'s HEAD as one commit.${describeReplacedElements(
                  replacedPaths,
                  projectName,
                )} Nothing in ${projectName} is deleted.${
                  unchangedCount
                    ? ` ${pluralize(unchangedCount, 'other element')} of ${sourceName} ${
                        unchangedCount === 1 ? 'is' : 'are'
                      } already in ${projectName} as ${
                        unchangedCount === 1 ? 'it is' : 'they are'
                      }.`
                    : ''
                }`
              : `${
                  unchangedCount
                    ? `${
                        unchangedCount === 1
                          ? `The only element of ${sourceName} is`
                          : `All ${unchangedCount} elements of ${sourceName} are`
                      } already in ${projectName} as ${
                        unchangedCount === 1 ? 'it is' : 'they are'
                      }`
                    : `${sourceName} has no elements`
                }, so the new workspace starts from the latest version of ${projectName}.`}
          </div>
          {Boolean(elementCount) && (
            <>
              <button
                type="button"
                className="workspace-setup__create-workspace-modal__copy__toggle"
                aria-expanded={showElements}
                onClick={() => setShowElements(!showElements)}
              >
                {showElements ? <ChevronDownIcon /> : <ChevronRightIcon />}
                {`${showElements ? 'Hide' : 'Show'} the ${pluralize(elementCount, 'element')}`}
              </button>
              {showElements && (
                <div
                  className="workspace-setup__create-workspace-modal__copy__elements"
                  role="list"
                  aria-label="Elements to copy"
                >
                  {copy.changes.map((change) => (
                    <div
                      key={change.entityPath}
                      className="workspace-setup__create-workspace-modal__copy__element"
                      role="listitem"
                    >
                      <ChangeTypeLetter
                        type={change.type}
                        label={
                          change.type === EntityChangeType.MODIFY
                            ? 'Replaced'
                            : undefined
                        }
                      />
                      <ElementPath entityPath={change.entityPath} />
                      <span className="workspace-setup__create-workspace-modal__copy__element__classifier">
                        {extractEntityNameFromPath(change.classifierPath)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <OtherProjectCopyDependencies
          copy={copy}
          projectName={projectName}
          isReadOnly={isReadOnly}
        />
      </>
    );
  },
);

const formatProjectSourceOptionLabel = (
  option: ProjectOption,
  meta: { context: 'menu' | 'value' },
): React.ReactNode => (
  <div className="workspace-source-option">
    {meta.context === 'value' && (
      <div className="workspace-source-option__icon">
        <SearchIcon />
      </div>
    )}
    <div className="workspace-source-option__name">{option.label}</div>
    {meta.context === 'menu' && (
      <div className="workspace-source-option__hint">
        {option.value.projectId}
      </div>
    )}
  </div>
);

const formatWorkspaceSourceOptionLabel = (
  option: WorkspaceOption,
  meta: { context: 'menu' | 'value' },
): React.ReactNode =>
  meta.context === 'menu' ? (
    formatWorkspaceOptionLabel(option)
  ) : (
    <div className="workspace-source-option">
      <div className="workspace-source-option__icon">
        {option.value.workspaceType === WorkspaceType.GROUP ? (
          <UsersIcon />
        ) : (
          <UserIcon />
        )}
      </div>
      <div className="workspace-source-option__name">{option.label}</div>
    </div>
  );

/**
 * Picks the workspace of another project to copy: the project, with a search
 * of its own, then one of its workspaces
 */
const OtherProjectSourceFields = observer(
  (props: {
    source: OtherProjectCopySourceState;
    copy: OtherProjectWorkspaceCopyState | undefined;
    isReadOnly: boolean;
  }) => {
    const { source, copy, isReadOnly } = props;
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const [searchText, setSearchText] = useState('');
    const debouncedSearchProjects = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(source.searchProjects(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 250),
      [applicationStore, source],
    );
    useEffect(
      () => (): void => debouncedSearchProjects.cancel(),
      [debouncedSearchProjects],
    );

    const onSearchTextChange = (
      value: string,
      actionChange: InputActionData,
    ): void => {
      if (actionChange.action === 'input-change' && value !== searchText) {
        setSearchText(value);
        debouncedSearchProjects.cancel();
        debouncedSearchProjects(value);
      }
    };
    const onProjectChange = (option: ProjectOption | null): void => {
      setSearchText('');
      if (option?.value !== source.project) {
        setupStore.setWorkspaceCopySource(undefined);
        flowResult(source.changeProject(option?.value)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const onWorkspaceChange = (option: WorkspaceOption | null): void => {
      if (option?.value !== copy?.source) {
        setupStore.setWorkspaceCopySource(option?.value, source.project);
      }
    };

    const project = source.project;
    const workspaceOptions = source.workspaces.map(buildWorkspaceOption);
    return (
      <>
        <div className="workspace-setup__create-workspace-modal__other-project">
          <div className="workspace-setup__create-workspace-modal__other-project__field">
            <div className="workspace-setup__create-workspace-modal__form__workspace--source__label">
              Project to copy from
            </div>
            <CustomSelectorInput
              className="workspace-setup__create-workspace-modal__form__workspace--source__selector"
              aria-label="Project to copy from"
              options={source.matchingProjects.map(buildProjectOption)}
              value={project ? buildProjectOption(project) : null}
              onChange={onProjectChange}
              inputValue={searchText}
              onInputChange={onSearchTextChange}
              filterOption={(): boolean => true}
              formatOptionLabel={formatProjectSourceOptionLabel}
              isLoading={source.searchProjectsState.isInProgress}
              noOptionsMessage={() =>
                source.searchError
                  ? `Can't search for projects: ${source.searchError}`
                  : source.searchProjectsState.isInProgress
                    ? 'Searching...'
                    : 'No projects found'
              }
              placeholder="Search for a project..."
              disabled={isReadOnly}
              isClearable={true}
              darkMode={darkMode}
            />
          </div>
          <div className="workspace-setup__create-workspace-modal__other-project__field">
            <div className="workspace-setup__create-workspace-modal__form__workspace--source__label">
              Workspace to copy
            </div>
            <CustomSelectorInput
              className="workspace-setup__create-workspace-modal__form__workspace--source__selector"
              aria-label="Workspace to copy"
              options={workspaceOptions}
              value={copy ? buildWorkspaceOption(copy.source) : null}
              onChange={onWorkspaceChange}
              formatOptionLabel={formatWorkspaceSourceOptionLabel}
              isLoading={source.loadWorkspacesState.isInProgress}
              placeholder={
                !project
                  ? 'Choose a project first'
                  : source.loadWorkspacesState.isInProgress
                    ? 'Loading workspaces...'
                    : source.loadWorkspacesState.hasSucceeded &&
                        !workspaceOptions.length
                      ? `${project.name} has no workspaces`
                      : 'Choose a workspace'
              }
              disabled={
                isReadOnly ||
                !project ||
                !source.loadWorkspacesState.hasSucceeded ||
                !workspaceOptions.length
              }
              darkMode={darkMode}
            />
          </div>
        </div>
        {source.loadWorkspacesError && project && (
          <div
            className="workspace-setup__create-workspace-modal__copy workspace-setup__create-workspace-modal__copy--error"
            role="alert"
          >
            {`Can't list the workspaces of ${project.name}: ${source.loadWorkspacesError}`}
          </div>
        )}
      </>
    );
  },
);

type WorkspaceCopyStep = {
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
};

const getOtherProjectCopySteps = (
  copy: OtherProjectWorkspaceCopyState,
): WorkspaceCopyStep[] => {
  const elementCount = copy.changes.length;
  const dependencyCount = copy.dependenciesToAdd.length;
  return [
    {
      label: `${copy.hasCopiedElements ? 'Copied' : 'Copy'} ${
        elementCount ? pluralize(elementCount, 'element') : 'the elements'
      } from ${copy.source.workspaceId} of ${copy.sourceProject.name}, as one commit`,
      status: copy.hasCopiedElements
        ? 'done'
        : copy.copyError
          ? 'failed'
          : copy.copyState.isInProgress
            ? 'active'
            : 'pending',
    },
    ...(dependencyCount
      ? [
          {
            label: `${copy.hasAddedDependencies ? 'Added' : 'Add'} ${pluralize(
              dependencyCount,
              'dependency',
              'dependencies',
            )} to the project configuration, as a second commit`,
            status: copy.hasAddedDependencies
              ? 'done'
              : copy.dependenciesError
                ? 'failed'
                : copy.addDependenciesState.isInProgress
                  ? 'active'
                  : 'pending',
          } satisfies WorkspaceCopyStep,
        ]
      : []),
  ];
};

const WorkspaceCopyProgress = observer(
  (props: { copy: WorkspaceCopyState; workspaceName: string }) => {
    const { copy, workspaceName } = props;
    // NOTE: the copy only runs once the workspace is created
    const isCreated =
      Boolean(copy.createdWorkspace) ||
      copy.copyState.isInProgress ||
      (copy instanceof OtherProjectWorkspaceCopyState &&
        copy.hasCopiedElements);
    const steps: WorkspaceCopyStep[] = [
      {
        label: `${isCreated ? 'Created' : 'Create'} the workspace ${workspaceName}`,
        status: isCreated ? 'done' : 'active',
      },
      ...(copy instanceof OtherProjectWorkspaceCopyState
        ? getOtherProjectCopySteps(copy)
        : [
            {
              label: `Copy ${pluralize(copy.changes.length, 'change')} from ${copy.source.workspaceId}, as one commit`,
              status: copy.copyError
                ? 'failed'
                : copy.copyState.isInProgress
                  ? 'active'
                  : 'pending',
            } satisfies WorkspaceCopyStep,
          ]),
    ];
    return (
      <div
        className="workspace-setup__create-workspace-modal__copy-progress"
        role="list"
        aria-label="Progress"
      >
        {steps.map((step) => (
          <div
            key={step.label}
            className={clsx(
              'workspace-setup__create-workspace-modal__copy-progress__step',
              `workspace-setup__create-workspace-modal__copy-progress__step--${step.status}`,
            )}
            role="listitem"
          >
            {step.status === 'done' && <CheckIcon />}
            {step.status === 'active' && <CircleNotchIcon />}
            {step.status === 'failed' && <TimesIcon />}
            {step.status === 'pending' && <EmptyCircleIcon />}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    );
  },
);

/**
 * What failed once the workspace was created: copying into it, or, for a
 * workspace of another project, adding the dependencies after the elements
 */
const describeCopyFailure = (
  copy: WorkspaceCopyState,
  workspaceId: string,
  projectName: string,
): {
  title: string;
  error: string | undefined;
  hint: string;
  retryLabel: string;
} => {
  if (
    copy instanceof OtherProjectWorkspaceCopyState &&
    copy.hasCopiedElements
  ) {
    return {
      title: `${workspaceId} was created with the copied elements, but adding the ${pluralize(
        copy.dependenciesToAdd.length,
        'dependency',
        'dependencies',
      )} failed.`,
      error: copy.dependenciesError,
      hint: 'The workspace has the copied elements. Try adding the dependencies again, or delete the workspace.',
      retryLabel: 'Retry dependencies',
    };
  }
  const changeCount = copy.changes.length;
  return {
    title: `${workspaceId} was created, but copying the ${
      !(copy instanceof OtherProjectWorkspaceCopyState)
        ? pluralize(changeCount, 'change')
        : changeCount
          ? pluralize(changeCount, 'element')
          : 'elements'
    } failed.`,
    error: copy.copyError,
    hint: `The workspace exists and starts from the latest version of ${
      copy.source.source ? `patch/${copy.source.source}` : projectName
    }. Try the copy again, or delete the workspace.`,
    retryLabel: 'Retry copy',
  };
};

export const CreateWorkspaceModal = observer(
  (props: { selectedProject: Project }) => {
    const { selectedProject } = props;
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useApplicationStore();
    const workspaceNameInputRef = useRef<HTMLInputElement>(null);
    const [workspaceName, setWorkspaceName] = useState('');
    const [isGroupWorkspace, setIsGroupWorkspace] = useState<boolean>(true);
    const [selectedSourceOption, setSelectedSourceOption] =
      useState<WorkspaceSourceOption | null>(buildHeadSourceOption);
    const copy = setupStore.workspaceCopyState;
    const isBusy =
      setupStore.createWorkspaceState.isInProgress ||
      setupStore.createOrImportProjectState.isInProgress;
    // the workspace was created, but copying into it failed: it may be tried
    // again, or the workspace deleted
    const copyFailed = Boolean(copy?.createdWorkspace);
    const isFromOtherProject =
      selectedSourceOption?.value === OTHER_PROJECT_WORKSPACE_SOURCE;
    const otherProjectCopy =
      copy instanceof OtherProjectWorkspaceCopyState ? copy : undefined;
    const copyFailure = copy?.createdWorkspace
      ? describeCopyFailure(
          copy,
          copy.createdWorkspace.workspaceId,
          selectedProject.name,
        )
      : undefined;

    // NOTE: a workspace created here, whose copy failed, is not a source
    const sourceWorkspaces = setupStore.workspaces.filter(
      (workspace) => workspace !== copy?.createdWorkspace,
    );
    const sourceOptions = [
      {
        label: 'Start from the project',
        options: [buildHeadSourceOption()].concat(
          setupStore.patches.map((p) => ({
            label: `patch/${p.patchReleaseVersionId.id}`,
            value: p,
          })),
        ),
      },
      ...(sourceWorkspaces.length
        ? [
            {
              label: `Copy a workspace in ${selectedProject.name}`,
              options: sourceWorkspaces.map((workspace) => ({
                label: workspace.workspaceId,
                value: workspace,
              })),
            },
          ]
        : []),
      OTHER_PROJECT_SOURCE_OPTION,
    ];

    const onSourceOptionChange = (val: WorkspaceSourceOption | null): void => {
      if (val?.value !== selectedSourceOption?.value) {
        setSelectedSourceOption(val);
        // NOTE: clearing the selection starts from HEAD
        setupStore.setWorkspaceCopySource(
          val?.value instanceof Workspace ? val.value : undefined,
        );
        setupStore.setOtherProjectCopySource(
          val?.value === OTHER_PROJECT_WORKSPACE_SOURCE,
        );
      }
    };

    const sourceLine = getWorkspaceSourceLine(selectedSourceOption);
    const workspaceAlreadyExists = Boolean(
      setupStore.workspaces.find(
        (workspace) =>
          workspace !== copy?.createdWorkspace &&
          workspace.workspaceId === workspaceName &&
          ((workspace.workspaceType === WorkspaceType.GROUP &&
            isGroupWorkspace) ||
            (workspace.workspaceType === WorkspaceType.USER &&
              !isGroupWorkspace)) &&
          workspace.source === sourceLine,
      ),
    );
    const createWorkspace = (): void => {
      if (
        workspaceName &&
        !copyFailed &&
        (!copy || copy.loadState.hasSucceeded) &&
        // NOTE: the workspace of another project to copy is yet to be picked
        !(isFromOtherProject && !copy) &&
        setupStore.currentProjectConfigurationStatus?.isConfigured
      ) {
        flowResult(
          setupStore.createWorkspace(
            selectedProject.projectId,
            sourceLine,
            workspaceName,
            isGroupWorkspace ? WorkspaceType.GROUP : WorkspaceType.USER,
            copy,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const retryCopy = (): void => {
      flowResult(setupStore.retryWorkspaceCopy()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const deleteCopiedWorkspace = (): void => {
      flowResult(setupStore.deleteCopiedWorkspace()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const toggleGroupWorkspace = (): void => {
      setIsGroupWorkspace(!isGroupWorkspace);
    };

    const formatSourceOptionLabel = (
      option: WorkspaceSourceOption,
      meta: { context: 'menu' | 'value' },
    ): React.ReactNode => {
      const value = option.value;
      if (value === OTHER_PROJECT_WORKSPACE_SOURCE) {
        return (
          <div className="workspace-source-option">
            <div className="workspace-source-option__icon">
              <SearchIcon />
            </div>
            <div className="workspace-source-option__name">
              {meta.context === 'menu'
                ? option.label
                : 'A workspace in another project'}
            </div>
          </div>
        );
      }
      if (value instanceof Workspace) {
        if (meta.context === 'menu') {
          return formatWorkspaceOptionLabel({ label: option.label, value });
        }
        return (
          <div className="workspace-source-option">
            <div className="workspace-source-option__icon">
              {value.workspaceType === WorkspaceType.GROUP ? (
                <UsersIcon />
              ) : (
                <UserIcon />
              )}
            </div>
            <div className="workspace-source-option__name">{option.label}</div>
            <div className="workspace-source-option__hint">
              {value.source
                ? `workspace on patch/${value.source} of ${selectedProject.name}`
                : `workspace in ${selectedProject.name}`}
            </div>
          </div>
        );
      }
      return (
        <div className="workspace-source-option">
          <div className="workspace-source-option__name">{option.label}</div>
          {meta.context === 'menu' && (
            <div className="workspace-source-option__hint">
              {value instanceof Patch
                ? `the latest version of the ${value.patchReleaseVersionId.id} patch`
                : 'the latest version, with no changes yet'}
            </div>
          )}
        </div>
      );
    };

    const handleEnter = (): void => {
      workspaceNameInputRef.current?.focus();
    };
    const onClose = (): void => {
      setupStore.setShowCreateWorkspaceModal(false);
    };

    return (
      <Dialog
        open={setupStore.showCreateWorkspaceModal}
        onClose={onClose}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
        classes={{ container: 'search-modal__container' }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="workspace-setup__create-workspace-modal"
        >
          <div className="modal__title">
            Create Workspace
            <DocumentationLink
              documentationKey={
                LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_WORKSPACE
              }
            />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createWorkspace();
            }}
          >
            <PanelLoadingIndicator
              isLoading={setupStore.createWorkspaceState.isInProgress}
            />
            <PanelForm className="workspace-setup__create-workspace-modal__form workspace-setup__create-workspace-modal__form__workspace">
              <PanelDivider />
              {copyFailure?.error !== undefined && (
                <div
                  className="workspace-setup__create-workspace-modal__copy-failure"
                  role="alert"
                >
                  <TimesCircleIcon className="workspace-setup__create-workspace-modal__copy-failure__icon" />
                  <div className="workspace-setup__create-workspace-modal__copy-failure__content">
                    <div className="workspace-setup__create-workspace-modal__copy-failure__title">
                      {copyFailure.title}
                    </div>
                    <div className="workspace-setup__create-workspace-modal__copy-failure__message">
                      {copyFailure.error}
                    </div>
                    <div>{copyFailure.hint}</div>
                  </div>
                </div>
              )}
              <PanelFormTextField
                ref={workspaceNameInputRef}
                name="Workspace Name"
                isReadOnly={isBusy || copyFailed}
                placeholder="MyWorkspace"
                fullWidth={true}
                className="workspace-setup__create-workspace-modal__form__workspace-name__input"
                value={workspaceName}
                update={(val: string | undefined) =>
                  setWorkspaceName(val ?? '')
                }
                errorMessage={
                  workspaceAlreadyExists
                    ? 'Workspace with same name already exists '
                    : ''
                }
              />
              <div className="workspace-setup__create-workspace-modal__form__workspace--source">
                <div className="workspace-setup__create-workspace-modal__form__workspace--source__label">
                  Workspace Source
                </div>
                <CustomSelectorInput
                  className="workspace-setup__create-workspace-modal__form__workspace--source__selector"
                  aria-label="Workspace Source"
                  options={sourceOptions}
                  onChange={onSourceOptionChange}
                  value={selectedSourceOption}
                  formatOptionLabel={formatSourceOptionLabel}
                  formatGroupLabel={(group: { label?: string }) => (
                    <span className="workspace-source-selector__group-label">
                      {group.label}
                    </span>
                  )}
                  components={{ MenuList: WorkspaceSourceMenuList }}
                  disabled={isBusy || copyFailed}
                  isClearable={true}
                  escapeClearsValue={true}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
              {isFromOtherProject && setupStore.otherProjectCopySource && (
                <OtherProjectSourceFields
                  source={setupStore.otherProjectCopySource}
                  copy={otherProjectCopy}
                  isReadOnly={isBusy || copyFailed}
                />
              )}
              {copy &&
                (copyFailed || setupStore.createWorkspaceState.isInProgress ? (
                  <WorkspaceCopyProgress
                    copy={copy}
                    workspaceName={workspaceName}
                  />
                ) : otherProjectCopy ? (
                  <OtherProjectCopySummary
                    copy={otherProjectCopy}
                    projectName={selectedProject.name}
                    isReadOnly={isBusy}
                  />
                ) : (
                  <WorkspaceCopySummary
                    copy={copy}
                    projectName={selectedProject.name}
                  />
                ))}
              <PanelFormBooleanField
                name="Group Workspace"
                prompt="Group workspaces can be accessed by all users in the project"
                value={isGroupWorkspace}
                isReadOnly={isBusy || copyFailed}
                update={toggleGroupWorkspace}
              />
            </PanelForm>
            <PanelFormActions>
              {copyFailed ? (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="btn btn--medium workspace-setup__create-workspace-modal__action"
                    onClick={deleteCopiedWorkspace}
                  >
                    Delete workspace
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="btn btn--dark workspace-setup__create-workspace-modal__action"
                    onClick={retryCopy}
                  >
                    {copyFailure?.retryLabel}
                  </button>
                </>
              ) : (
                <button
                  disabled={
                    isBusy ||
                    !workspaceName ||
                    Boolean(copy && !copy.loadState.hasSucceeded) ||
                    (isFromOtherProject && !copy)
                  }
                  className="btn btn--dark"
                >
                  Create
                </button>
              )}
            </PanelFormActions>
          </form>
        </Modal>
      </Dialog>
    );
  },
);
