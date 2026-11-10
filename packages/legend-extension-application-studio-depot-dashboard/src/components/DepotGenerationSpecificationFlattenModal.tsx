/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  CheckCircleIcon,
  CircleIcon,
  CircleNotchIcon,
  Dialog,
  ExternalLinkIcon,
  MinusCircleIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  TimesCircleIcon,
  WarningIcon,
} from '@finos/legend-art';
import {
  generateEditorRoute,
  generateReviewRoute,
} from '@finos/legend-application-studio';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  DEPOT_FLATTEN_STEP_STATUS,
  type DepotFlattenStep,
  type DepotGenerationSpecificationFlattenState,
} from '../stores/DepotGenerationSpecificationFlattenState.js';

const FlattenStepIcon = (props: { status: DEPOT_FLATTEN_STEP_STATUS }) => {
  switch (props.status) {
    case DEPOT_FLATTEN_STEP_STATUS.RUNNING:
      return <CircleNotchIcon className="spinning" />;
    case DEPOT_FLATTEN_STEP_STATUS.DONE:
      return <CheckCircleIcon style={{ color: '#22c55e' }} />;
    case DEPOT_FLATTEN_STEP_STATUS.SKIPPED:
      return <MinusCircleIcon style={{ opacity: 0.6 }} />;
    case DEPOT_FLATTEN_STEP_STATUS.FAILED:
      return <TimesCircleIcon style={{ color: '#ef4444' }} />;
    default:
      return <CircleIcon style={{ opacity: 0.3 }} />;
  }
};

const FlattenStepRow = observer((props: { step: DepotFlattenStep }) => {
  const { step } = props;
  return (
    <li
      data-testid="depot-flatten-step"
      data-status={step.status}
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        padding: '0.4rem 0',
      }}
    >
      <span style={{ display: 'flex', paddingTop: '0.15rem' }}>
        <FlattenStepIcon status={step.status} />
      </span>
      <span>
        <div
          style={{
            fontWeight: 500,
            opacity:
              step.status === DEPOT_FLATTEN_STEP_STATUS.PENDING ? 0.6 : 1,
          }}
        >
          {step.step}
          {step.status === DEPOT_FLATTEN_STEP_STATUS.SKIPPED && ' (skipped)'}
        </div>
        {step.message && (
          <div
            style={{
              opacity: 0.75,
              fontSize: '1.2rem',
              wordBreak: 'break-word',
            }}
          >
            {step.message}
          </div>
        )}
      </span>
    </li>
  );
});

const ExternalLink = (props: { href: string; children: React.ReactNode }) => (
  <a
    href={props.href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      color: '#3b82f6',
      textDecoration: 'underline',
    }}
  >
    {props.children}
    <ExternalLinkIcon />
  </a>
);

/**
 * The steps of flattening a generation specification, one by one. While they
 * run the modal cannot be closed.
 */
export const DepotGenerationSpecificationFlattenModal = observer(
  (props: {
    flattenState: DepotGenerationSpecificationFlattenState;
    onClose: () => void;
  }) => {
    const { flattenState, onClose } = props;
    const applicationStore = flattenState.store.applicationStore;
    const navigator = applicationStore.navigationService.navigator;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const { review, workspace } = flattenState;
    const studioReviewUrl = review
      ? navigator.generateAddress(
          generateReviewRoute(flattenState.projectId, review.id),
        )
      : undefined;
    const studioWorkspaceUrl = workspace
      ? navigator.generateAddress(
          generateEditorRoute(
            flattenState.projectId,
            undefined,
            workspace.workspaceId,
            WorkspaceType.GROUP,
          ),
        )
      : undefined;
    const start = (): void => {
      flowResult(flattenState.run()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const close = (): void => {
      if (flattenState.canClose) {
        onClose();
      }
    };

    return (
      <Dialog
        open={true}
        onClose={close}
        disableEscapeKeyDown={!flattenState.canClose}
        slotProps={{
          paper: { style: { width: '72rem', maxWidth: '90vw' } },
        }}
      >
        <Modal darkMode={darkMode} className="modal--scrollable">
          <ModalHeader>
            <ModalTitle title="Flatten Generation Stages" />
          </ModalHeader>
          <ModalBody>
            <div style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>
                {flattenState.path}
              </div>
              <div style={{ opacity: 0.75 }}>
                {flattenState.projectId} · {flattenState.entityState.gaProject}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                Puts every generation element of this specification into one
                stage, on the project&apos;s master. Each change is a commit in
                a new group workspace, and a review is opened for people to
                approve: nothing is merged.
              </div>
              {!flattenState.canSubmitReview && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem',
                    color: '#f59e0b',
                  }}
                >
                  <WarningIcon />
                  Your actions on this project do not include Submit review: the
                  last step may fail, leaving the workspace for you to finish.
                </div>
              )}
            </div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {flattenState.steps.map((step) => (
                <FlattenStepRow key={step.step} step={step} />
              ))}
            </ol>
            {studioReviewUrl && review && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <ExternalLink href={studioReviewUrl}>
                  Open the review in Studio
                </ExternalLink>
                {review.webURL && (
                  <ExternalLink href={review.webURL}>
                    Open the merge request in GitLab
                  </ExternalLink>
                )}
              </div>
            )}
            {flattenState.runningState.hasFailed && studioWorkspaceUrl && (
              <div style={{ marginTop: '1rem' }}>
                <ExternalLink href={studioWorkspaceUrl}>
                  Open the workspace in Studio to finish by hand
                </ExternalLink>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {flattenState.runningState.isInInitialState && (
              <ModalFooterButton
                text="Start"
                title={
                  flattenState.canStart
                    ? 'Create the workspace and the review'
                    : 'Nothing to flatten on master'
                }
                disabled={!flattenState.canStart}
                onClick={start}
                darkMode={darkMode}
              />
            )}
            <ModalFooterButton
              text="Close"
              type="secondary"
              disabled={!flattenState.canClose}
              onClick={close}
              darkMode={darkMode}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
