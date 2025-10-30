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

import { useApplicationStore } from '@finos/legend-application';
import { generateReviewRoute } from '@finos/legend-application-studio';
import {
  Dialog,
  ExternalLinkSquareIcon,
  ModalTitle,
  Panel,
  PanelFullContent,
  PanelLoadingIndicator,
  ReviewIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { useServiceQueryEditorStore } from './ServiceQueryEditorStoreProvider.js';

const NewReviewModal = observer(() => {
  const editorStore = useServiceQueryEditorStore();
  const applicationStore = useApplicationStore();
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>(
    `Update query of service '${editorStore.service.path}'`,
  );
  const changeMessage: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    setMessage(event.target.value);

  // actions
  const handleEnter = (): void => messageInputRef.current?.focus();
  const submitReview = (): void => {
    if (message) {
      flowResult(
        editorStore.workspaceReviewState.createWorkspaceReview(message),
      )
        .then(() => editorStore.setShowSubmitReviewModal(false))
        .catch(applicationStore.alertUnhandledError);
    }
  };
  const onClose = (): void => editorStore.setShowSubmitReviewModal(false);

  return (
    <Dialog
      open={editorStore.showSubmitReviewModal}
      onClose={onClose}
      slotProps={{
        transition: {
          onEnter: handleEnter,
        },
        paper: {
          classes: {
            root: 'search-modal__inner-container',
          },
        },
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitReview();
        }}
        className="modal search-modal modal--dark"
      >
        <ModalTitle title="Submit for Review" />
        <Panel>
          <PanelLoadingIndicator
            isLoading={
              editorStore.workspaceReviewState.isCreatingWorkspaceReview
            }
          />
          <PanelFullContent>
            <div className="input-group">
              <input
                ref={messageInputRef}
                className="input input--dark input-group__input"
                value={message}
                onChange={changeMessage}
                placeholder="What is this change about?"
              />
              {!message && (
                <div className="input-group__error-message">
                  Review message must not be empty
                </div>
              )}
            </div>
          </PanelFullContent>
        </Panel>
        <div className="search-modal__actions">
          <button
            className="btn btn--dark"
            disabled={
              !message ||
              editorStore.projectConfigurationEditorState
                .containsSnapshotDependencies ||
              Boolean(editorStore.workspaceReviewState.workspaceReview) ||
              editorStore.workspaceReviewState.isCreatingWorkspaceReview
            }
            title={
              editorStore.projectConfigurationEditorState
                .containsSnapshotDependencies
                ? `Can't submit review: workspace contains unpublished dependencies`
                : undefined
            }
            onClick={submitReview}
          >
            Submit
          </button>
        </div>
      </form>
    </Dialog>
  );
});

export const ServiceQueryEditorReviewAction = observer(() => {
  const editorStore = useServiceQueryEditorStore();
  const applicationStore = useApplicationStore();
  const currentReview = editorStore.workspaceReviewState.workspaceReview;

  const showCreateReviewModal = (): void =>
    editorStore.setShowSubmitReviewModal(true);
  const visitReview = (): void => {
    if (currentReview) {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateReviewRoute(currentReview.projectId, currentReview.id),
        ),
      );
    }
  };

  return (
    <>
      {currentReview && (
        <button
          className="service-query-editor__header__action service-query-editor__review"
          title={`${currentReview.title}\n\nClick to see review`}
          onClick={visitReview}
        >
          <div className="service-query-editor__review__icon">
            <ReviewIcon />
          </div>
          <div className="service-query-editor__review__message">
            {currentReview.title}
          </div>
          <div className="service-query-editor__review__action">
            <ExternalLinkSquareIcon />
          </div>
        </button>
      )}
      {!currentReview && (
        <button
          className="service-query-editor__header__action service-query-editor__header__action--simple btn--dark"
          tabIndex={-1}
          disabled={Boolean(currentReview)}
          title="Submit for review"
          onClick={showCreateReviewModal}
        >
          <ReviewIcon />
          {editorStore.showSubmitReviewModal && <NewReviewModal />}
        </button>
      )}
    </>
  );
});
