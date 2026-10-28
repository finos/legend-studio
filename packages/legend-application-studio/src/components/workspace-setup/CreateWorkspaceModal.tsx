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

import { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
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
  ChevronDownIcon,
  ChevronRightIcon,
  CircleNotchIcon,
  EmptyCircleIcon,
  ExclamationTriangleIcon,
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
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/LegendStudioDocumentation.js';
import {
  DEFAULT_WORKSPACE_SOURCE,
  useWorkspaceSetupStore,
} from './WorkspaceSetup.js';
import { formatWorkspaceOptionLabel } from './WorkspaceSelectorUtils.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import type { WorkspaceCopyState } from '../../stores/workspace-setup/WorkspaceCopyState.js';

export interface PatchOption {
  label: string;
  value: Patch | string;
}

/**
 * Where a new workspace starts from: HEAD, a patch, or a workspace of the
 * project, whose changes it copies
 */
export interface WorkspaceSourceOption {
  label: string;
  value: PatchOption['value'] | Workspace;
}

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

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

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
}): React.ReactElement => (
  <span
    className={clsx(
      'workspace-setup__create-workspace-modal__copy__change-type',
      `workspace-setup__create-workspace-modal__copy__change-type--${props.type.toLowerCase()}`,
    )}
    title={CHANGE_TYPE_LABEL[props.type]}
  >
    {getChangeTypeIconFromChange(props.type)}
  </span>
);

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
                {copy.changes.map((change) => {
                  const [packagePath, name] = resolvePackagePathAndElementName(
                    change.entityPath,
                  );
                  return (
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
                      {copy.pathsAlsoChangedOnLine.has(change.entityPath) && (
                        <span className="workspace-setup__create-workspace-modal__copy__element__also-changed">
                          {`also changed in ${projectName}`}
                        </span>
                      )}
                      <span className="workspace-setup__create-workspace-modal__copy__element__classifier">
                        {extractEntityNameFromPath(change.classifierPath)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

const WorkspaceCopyProgress = observer(
  (props: { copy: WorkspaceCopyState; workspaceName: string }) => {
    const { copy, workspaceName } = props;
    const isCreated = Boolean(copy.createdWorkspace);
    const steps: {
      label: string;
      status: 'pending' | 'active' | 'done' | 'failed';
    }[] = [
      {
        label: `${isCreated ? 'Created' : 'Create'} the workspace ${workspaceName}`,
        status: isCreated ? 'done' : 'active',
      },
      {
        label: `Copy ${pluralize(copy.changes.length, 'change')} from ${copy.source.workspaceId}, as one commit`,
        status: copy.copyError
          ? 'failed'
          : copy.copyState.isInProgress
            ? 'active'
            : 'pending',
      },
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
    // the workspace was created, but copying into it failed
    const copyFailed = Boolean(copy?.createdWorkspace);

    // NOTE: a workspace created here, whose copy failed, is not a source
    const sourceWorkspaces = setupStore.workspaces.filter(
      (workspace) => workspace !== copy?.createdWorkspace,
    );
    const sourceGroups = [
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
    ];

    const onSourceOptionChange = (val: WorkspaceSourceOption | null): void => {
      if (val?.value !== selectedSourceOption?.value) {
        setSelectedSourceOption(val);
        // NOTE: clearing the selection starts from HEAD
        setupStore.setWorkspaceCopySource(
          val?.value instanceof Workspace ? val.value : undefined,
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
              {copy?.createdWorkspace && (
                <div
                  className="workspace-setup__create-workspace-modal__copy-failure"
                  role="alert"
                >
                  <TimesCircleIcon className="workspace-setup__create-workspace-modal__copy-failure__icon" />
                  <div className="workspace-setup__create-workspace-modal__copy-failure__content">
                    <div className="workspace-setup__create-workspace-modal__copy-failure__title">
                      {`${copy.createdWorkspace.workspaceId} was created, but copying the ${pluralize(
                        copy.changes.length,
                        'change',
                      )} failed.`}
                    </div>
                    {copy.copyError && (
                      <div className="workspace-setup__create-workspace-modal__copy-failure__message">
                        {copy.copyError}
                      </div>
                    )}
                    <div>
                      {`The workspace exists and starts from the latest version of ${
                        copy.source.source
                          ? `patch/${copy.source.source}`
                          : selectedProject.name
                      }. Try the copy again, or delete the workspace.`}
                    </div>
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
                  options={sourceGroups}
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
              {copy &&
                (copyFailed || setupStore.createWorkspaceState.isInProgress ? (
                  <WorkspaceCopyProgress
                    copy={copy}
                    workspaceName={workspaceName}
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
                    Retry copy
                  </button>
                </>
              ) : (
                <button
                  disabled={
                    isBusy ||
                    !workspaceName ||
                    Boolean(copy && !copy.loadState.hasSucceeded)
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
