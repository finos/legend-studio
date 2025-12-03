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
import { useEditorStore } from '../EditorStoreProvider.js';
import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import {
  PanelFormSection,
  PanelFormValidatedTextField,
  PanelHeader,
  PanelContent,
  Panel,
  clsx,
  Dialog,
  CheckCircleIcon,
  ModalBody,
  ModalFooterButton,
  ModalFooter,
  ModalHeader,
  Modal,
  ModalTitle,
  PanelDivider,
  CircleNotchIcon,
  PauseCircleIcon,
  TimesCircleIcon,
  BanIcon,
  QuestionCircleIcon,
  MenuContent,
  MenuContentItem,
  ContextMenu,
  PanelForm,
  PanelFormBooleanField,
  TrashIcon,
  PlusIcon,
  CogIcon,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  type BuildLog,
  type BuildPhaseActionState,
  BuildPhaseStatus,
  type DeployProjectResponse,
  LogType,
  MetadataRequestOptions,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';

const BuildOverrideEditor = observer(
  (props: {
    buildOverrides: Record<string, string>;
    onUpdate: (overrides: Record<string, string>) => void;
  }) => {
    const { buildOverrides, onUpdate } = props;
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const handleAddOverride = () => {
      if (newKey.trim() && newValue.trim()) {
        onUpdate({
          ...buildOverrides,
          [newKey.trim()]: newValue.trim(),
        });
        setNewKey('');
        setNewValue('');
      }
    };

    const handleDeleteOverride = (key: string) => {
      const updatedOverrides = { ...buildOverrides };
      delete updatedOverrides[key];
      onUpdate(updatedOverrides);
    };

    const handleUpdateOverride = (key: string, value: string) => {
      onUpdate({
        ...buildOverrides,
        [key]: value,
      });
    };

    return (
      <div className="build-override-editor">
        <div className="build-override-editor__header">
          <span className="build-override-editor__title">Build Overrides</span>
          <span className="build-override-editor__description">
            Key-value pairs to override build parameters
          </span>
        </div>

        {/* Existing overrides */}
        <div className="build-override-editor__list">
          {Object.entries(buildOverrides).map(([key, value]) => (
            <div key={key} className="build-override-editor__item">
              <div className="build-override-editor__item__fields">
                <PanelFormValidatedTextField
                  name={`override-key-${key}`}
                  prompt="Key"
                  value={key}
                  update={(val) => {
                    if (val && val !== key && val.trim()) {
                      const newOverrides = { ...buildOverrides };
                      delete newOverrides[key];
                      newOverrides[val.trim()] = value;
                      onUpdate(newOverrides);
                    }
                  }}
                />
                <PanelFormValidatedTextField
                  name={`override-value-${key}`}
                  prompt="Value"
                  value={value}
                  update={(val) => handleUpdateOverride(key, val ?? '')}
                />
              </div>
              <button
                className="build-override-editor__delete-btn"
                onClick={() => handleDeleteOverride(key)}
                title="Delete override"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {/* Add new override */}
        <div className="build-override-editor__add">
          <div className="build-override-editor__add__title">
            Add New Override
          </div>
          <div className="build-override-editor__add__fields">
            <PanelFormValidatedTextField
              name="new-override-key"
              prompt="Key"
              value={newKey}
              update={(val: string | undefined) => setNewKey(val ?? '')}
            />
            <PanelFormValidatedTextField
              name="new-override-value"
              prompt="Value"
              value={newValue}
              update={(val: string | undefined) => setNewValue(val ?? '')}
            />
            <button
              className="build-override-editor__add-btn"
              onClick={handleAddOverride}
              disabled={!newKey.trim() || !newValue.trim()}
              title="Add override"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const DevMetadataOptionsModal = observer(
  (props: {
    isOpen: boolean;
    onClose: () => void;
    options: MetadataRequestOptions;
    onSave: (options: MetadataRequestOptions) => void;
  }) => {
    const { isOpen, onClose, options, onSave } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;

    const [includeArtifacts, setIncludeArtifacts] = useState(
      options.includeArtifacts ?? false,
    );
    const [buildOverrides, setBuildOverrides] = useState(
      options.buildOverrides ?? {},
    );

    useEffect(() => {
      if (isOpen) {
        setIncludeArtifacts(options.includeArtifacts ?? false);
        setBuildOverrides(options.buildOverrides ?? {});
      }
    }, [isOpen, options]);

    const handleSave = () => {
      const updatedOptions = new MetadataRequestOptions();
      updatedOptions.includeArtifacts = includeArtifacts;
      updatedOptions.buildOverrides =
        Object.keys(buildOverrides).length > 0 ? buildOverrides : undefined;
      onSave(updatedOptions);
      onClose();
    };

    const handleCancel = () => {
      setIncludeArtifacts(options.includeArtifacts ?? false);
      setBuildOverrides(options.buildOverrides ?? {});
      onClose();
    };

    if (!isOpen) {
      return null;
    }

    return (
      <Dialog
        open={isOpen}
        onClose={handleCancel}
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
          className="editor-modal dev-metadata-options-modal"
        >
          <ModalHeader>
            <ModalTitle title="Deployment Configuration" />
          </ModalHeader>
          <ModalBody className="dev-metadata-options-modal__body">
            <PanelForm>
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Artifact Settings
                </div>
                <PanelFormBooleanField
                  name="includeArtifacts"
                  prompt="Include Artifacts"
                  value={includeArtifacts}
                  update={(val: boolean | undefined) =>
                    setIncludeArtifacts(Boolean(val))
                  }
                  isReadOnly={false}
                />
                <div className="panel__content__form__section__desc">
                  When enabled, includes generated artifacts in the deployment
                </div>
              </PanelFormSection>

              <PanelFormSection>
                <BuildOverrideEditor
                  buildOverrides={buildOverrides}
                  onUpdate={setBuildOverrides}
                />
              </PanelFormSection>
            </PanelForm>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Cancel"
              onClick={handleCancel}
              type="secondary"
            />
            <ModalFooterButton
              text="Save Configuration"
              onClick={handleSave}
              type="primary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const getPhaseStatusIcon = (status: BuildPhaseStatus): ReactNode => {
  switch (status) {
    case BuildPhaseStatus.NOT_STARTED:
      return (
        <div
          title="Phase not started"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--not-started"
        >
          <PauseCircleIcon />
        </div>
      );
    case BuildPhaseStatus.IN_PROGRESS:
      return (
        <div
          title="Phase in progress"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--in-progress"
        >
          <CircleNotchIcon />
        </div>
      );
    case BuildPhaseStatus.SUCCESS:
      return (
        <div
          title="Phase succeeded"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--success"
        >
          <CheckCircleIcon />
        </div>
      );
    case BuildPhaseStatus.FAIL:
      return (
        <div
          title="Phase failed"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    case BuildPhaseStatus.SKIPPED:
      return (
        <div
          title="Phase skipped"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--skipped"
        >
          <BanIcon />
        </div>
      );
    default:
      return (
        <div
          title="Phase status unknown"
          className="deployment-phase__status__indicator deployment-phase__status__indicator--unknown"
        >
          <QuestionCircleIcon />
        </div>
      );
  }
};

const PhaseLogsViewer = observer(
  (props: { phase: BuildPhaseActionState; onClose: () => void }) => {
    const { phase, onClose } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;

    const formatLogs = (logs: BuildLog[]): string => {
      return logs
        .map((log) => {
          const prefix = log.logType ? `[${log.logType}]` : '';
          const title = log.title ? `${log.title}: ` : '';
          return `${prefix} ${title}${log.log}`;
        })
        .join('\n');
    };

    const logs = phase.logs ? formatLogs(phase.logs) : 'No logs available';

    return (
      <Dialog
        open={true}
        onClose={onClose}
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
          <ModalHeader>
            <ModalTitle title={`Logs for Phase: ${phase.phase}`} />
          </ModalHeader>
          <ModalBody>
            <CodeEditor
              inputValue={logs}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.TEXT}
              extraEditorOptions={{
                wordWrap: 'on',
              }}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Close"
              onClick={onClose}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const PhaseContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      phase: BuildPhaseActionState;
      onViewLogs: () => void;
    }
  >(function PhaseContextMenu(props, ref) {
    const { phase, onViewLogs } = props;
    const hasLogs = phase.logs && phase.logs.length > 0;

    return (
      <MenuContent>
        {hasLogs && (
          <MenuContentItem onClick={onViewLogs}>
            View Logs ({phase.logs?.length} entries)
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const DeploymentPhaseNode = observer(
  (props: {
    phase: BuildPhaseActionState;
    onViewLogs: (phase: BuildPhaseActionState) => void;
  }) => {
    const { phase, onViewLogs } = props;
    const statusIcon = getPhaseStatusIcon(phase.status);
    const hasLogs = phase.logs && phase.logs.length > 0;
    const errorLogs =
      phase.logs?.filter((log) => log.logType === LogType.ERROR).length ?? 0;
    const warnLogs =
      phase.logs?.filter((log) => log.logType === LogType.WARN).length ?? 0;

    return (
      <ContextMenu
        content={
          <PhaseContextMenu
            phase={phase}
            onViewLogs={() => onViewLogs(phase)}
          />
        }
        menuProps={{ elevation: 7 }}
      >
        <div className="deployment-phase__node">
          <div className="deployment-phase__node__icon">{statusIcon}</div>
          <div className="deployment-phase__node__content">
            <div className="deployment-phase__node__title">{phase.phase}</div>
            <div className="deployment-phase__node__details">
              <span
                className={`deployment-phase__status deployment-phase__status--${phase.status.toLowerCase()}`}
              >
                {phase.status}
              </span>
              {phase.message && (
                <span className="deployment-phase__message">
                  {phase.message}
                </span>
              )}
              {hasLogs && (
                <span className="deployment-phase__logs-count">
                  {errorLogs > 0 && (
                    <span className="logs-count logs-count--error">
                      {errorLogs} errors
                    </span>
                  )}
                  {warnLogs > 0 && (
                    <span className="logs-count logs-count--warn">
                      {warnLogs} warnings
                    </span>
                  )}
                  <span className="logs-count logs-count--total">
                    {phase.logs?.length} logs
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const DeploymentStatusPanel = observer(
  (props: { deploymentResponse: DeployProjectResponse }) => {
    const { deploymentResponse } = props;
    const [selectedPhaseForLogs, setSelectedPhaseForLogs] =
      useState<BuildPhaseActionState | null>(null);

    const handleViewLogs = (phase: BuildPhaseActionState) => {
      setSelectedPhaseForLogs(phase);
    };

    const closeLogsViewer = () => {
      setSelectedPhaseForLogs(null);
    };

    return (
      <div className="deployment-status-panel">
        <div className="deployment-status-panel__header">
          <div className="deployment-status-panel__title">
            Deployment Status
          </div>
          <div
            className={`deployment-status-panel__final-status deployment-status-panel__final-status--${deploymentResponse.finalStatus.toLowerCase()}`}
          >
            {getPhaseStatusIcon(deploymentResponse.finalStatus)}
            <span>{deploymentResponse.finalStatus}</span>
          </div>
        </div>

        <PanelDivider />

        {/* Project Details */}
        <div className="deployment-status-panel__project-details">
          <div className="deployment-status-panel__section-title">
            Project Details
          </div>
          <div className="deployment-status-panel__details-grid">
            <div className="detail-item">
              <span className="detail-label">Group ID:</span>
              <span className="detail-value">
                {deploymentResponse.projectDetails.groupId}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Artifact ID:</span>
              <span className="detail-value">
                {deploymentResponse.projectDetails.artifactId}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Version:</span>
              <span className="detail-value">
                {deploymentResponse.projectDetails.version}
              </span>
            </div>
          </div>
        </div>

        <PanelDivider />

        {/* Phases */}
        {deploymentResponse.phaseStates &&
          deploymentResponse.phaseStates.length > 0 && (
            <div className="deployment-status-panel__phases">
              <div className="deployment-status-panel__section-title">
                Deployment Phases ({deploymentResponse.phaseStates.length})
              </div>
              <div className="deployment-phases-list">
                {deploymentResponse.phaseStates.map((phase) => (
                  <DeploymentPhaseNode
                    key={`${phase.phase}`}
                    phase={phase}
                    onViewLogs={handleViewLogs}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Logs Viewer Modal */}
        {selectedPhaseForLogs && (
          <PhaseLogsViewer
            phase={selectedPhaseForLogs}
            onClose={closeLogsViewer}
          />
        )}
      </div>
    );
  },
);

export const DevMetadataPanel = observer(() => {
  const editorStore = useEditorStore();
  const devMetadataState = editorStore.devMetadataState;
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const handlePush = (): void => {
    flowResult(devMetadataState.push()).catch(
      editorStore.applicationStore.alertUnhandledError,
    );
  };

  const handleSaveOptions = (newOptions: MetadataRequestOptions): void => {
    devMetadataState.setOptions(newOptions);
  };

  const isPushing = devMetadataState.pushState.isInProgress;

  return (
    <Panel>
      <PanelHeader className="side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label side-bar__header__title__content">
            Push to Dev
          </div>
        </div>
      </PanelHeader>
      <PanelContent>
        <PanelFormSection>
          <div className="dev-metadata-panel__project-info">
            <div className="dev-metadata-panel__info-header">
              Project Information
            </div>
            <div className="dev-metadata-panel__info-content">
              <div className="dev-metadata-panel__info-row">
                <span className="dev-metadata-panel__info-label">
                  Group ID:
                </span>
                <span className="dev-metadata-panel__info-value">
                  {devMetadataState.projectGAV?.groupId ?? 'Not available'}
                </span>
              </div>
              <div className="dev-metadata-panel__info-row">
                <span className="dev-metadata-panel__info-label">
                  Artifact ID:
                </span>
                <span className="dev-metadata-panel__info-value">
                  {devMetadataState.projectGAV?.artifactId ?? 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </PanelFormSection>

        <PanelDivider />
        <PanelFormSection>
          <div className="dev-metadata-panel__push-section">
            <div className="dev-metadata-panel__push-header">
              <div className="dev-metadata-panel__push-title-row">
                <div className="panel__content__form__section__header__label">
                  Deploy Metadata
                </div>
                <button
                  className="dev-metadata-panel__settings-btn"
                  onClick={() => setIsOptionsModalOpen(true)}
                  title="Configure deployment options"
                  disabled={isPushing}
                >
                  <CogIcon />
                </button>
              </div>
              <div className="dev-metadata-panel__push-description">
                {isPushing
                  ? 'Pushing metadata to dev environment...'
                  : 'Push current workspace metadata to dev'}
              </div>
            </div>
            <button
              onClick={handlePush}
              type="submit"
              className={clsx('btn btn--primary dev-metadata-panel__push-btn', {
                'btn--loading': isPushing,
                'btn--disabled': isPushing,
              })}
              disabled={isPushing}
              title={
                isPushing
                  ? 'Pushing metadata...'
                  : 'Push metadata to development environment'
              }
            >
              <div className="btn__content">
                {isPushing && (
                  <CircleNotchIcon className="dev-metadata-panel__push-btn__spinner" />
                )}
                <div className="btn__content__label">
                  {isPushing ? 'Pushing...' : 'Push to Dev'}
                </div>
              </div>
            </button>

            {isPushing && (
              <div className="dev-metadata-panel__loading-overlay">
                <div className="dev-metadata-panel__loading-content">
                  <CircleNotchIcon className="dev-metadata-panel__loading-spinner" />
                  <div className="dev-metadata-panel__loading-text">
                    Deploying metadata to development environment...
                  </div>
                </div>
              </div>
            )}
          </div>
        </PanelFormSection>
        <PanelFormSection>
          {devMetadataState.result && (
            <>
              <PanelDivider />
              <DeploymentStatusPanel
                deploymentResponse={devMetadataState.result}
              />
            </>
          )}
        </PanelFormSection>
        <DevMetadataOptionsModal
          isOpen={isOptionsModalOpen}
          onClose={() => setIsOptionsModalOpen(false)}
          options={devMetadataState.options}
          onSave={handleSaveOptions}
        />
      </PanelContent>
    </Panel>
  );
});
