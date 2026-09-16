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

import { observer } from 'mobx-react-lite';
import { useState, type CSSProperties } from 'react';
import {
  Dialog,
  LongArrowRightIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PencilEditIcon,
  PlusIcon,
  Tooltip,
} from '@finos/legend-art';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import type { RelationElementState } from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import { RelationElementEditor } from './RelationElementsDataEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

export interface RelationElementSampleValuesReadOnlySource {
  label: string;
  message?: string | undefined;
  onNavigate: () => void;
}

export const RelationElementSampleValuesEditor = observer(
  (props: {
    title: string;
    relationElementState: RelationElementState | undefined;
    isReadOnly: boolean;
    isBusy?: boolean | undefined;
    hideColumnDefinitions?: boolean | undefined;
    deleteConfirmMessage: string;
    onAdd: () => Promise<void> | void;
    onDelete: () => void;
    hasMismatch?: boolean | undefined;
    mismatchMessage?: string | undefined;
    readOnlySource?: RelationElementSampleValuesReadOnlySource | undefined;
  }) => {
    const {
      title,
      relationElementState,
      isReadOnly,
      isBusy,
      hideColumnDefinitions,
      deleteConfirmMessage,
      onAdd,
      onDelete,
      hasMismatch,
      mismatchMessage,
      readOnlySource,
    } = props;
    const editorStore = useEditorStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isEditMode = Boolean(relationElementState) || Boolean(readOnlySource);

    const closeModal = (): void => setIsModalOpen(false);

    const handleClick = (): void => {
      if (isEditMode) {
        setIsModalOpen(true);
        return;
      }
      Promise.resolve(onAdd())
        .then(() => setIsModalOpen(true))
        .catch(editorStore.applicationStore.alertUnhandledError);
    };

    const handleDelete = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: deleteConfirmMessage,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              onDelete();
              closeModal();
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const buttonStyle: CSSProperties = {
      cursor: isReadOnly ? 'not-allowed' : 'pointer',
    };
    if (relationElementState && !readOnlySource) {
      buttonStyle.border = hasMismatch
        ? '2px solid var(--color-red-300)'
        : '1px solid var(--color-blue-200)';
    }

    return (
      <>
        <button
          className="access-point-editor__sample-values-btn"
          onClick={handleClick}
          disabled={isReadOnly || isBusy}
          title={isEditMode ? 'Edit sample values' : 'Add sample values'}
          style={buttonStyle}
        >
          {isEditMode ? <PencilEditIcon /> : <PlusIcon />}
          <span>Sample Values</span>
        </button>
        {isModalOpen && (
          <Dialog
            open={isModalOpen}
            onClose={closeModal}
            classes={{
              root: 'editor-modal__root-container',
              container: 'editor-modal__container',
              paper: 'editor-modal__content',
            }}
          >
            <Modal
              className="editor-modal"
              darkMode={
                !editorStore.applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            >
              <ModalHeader title={title} />
              <ModalBody>
                <div
                  style={{
                    padding: 0,
                    height: '100%',
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                  }}
                >
                  {readOnlySource ? (
                    <div
                      style={{
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--color-light-grey-200)',
                          whiteSpace: 'nowrap',
                          fontSize: '1.3rem',
                          fontWeight: 600,
                        }}
                      >
                        {readOnlySource.message ??
                          'Sample Values already in Data Element'}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'var(--color-dark-grey-100)',
                          border: '1px solid var(--color-dark-grey-300)',
                          borderRadius: '0.2rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.3rem',
                            fontWeight: 600,
                            color: 'var(--color-light-grey-200)',
                          }}
                        >
                          {readOnlySource.label}
                        </span>
                        <button
                          className="btn--sm btn--dark"
                          onClick={readOnlySource.onNavigate}
                          tabIndex={-1}
                          title="Navigate to data element"
                          style={{
                            padding: '0.3rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <LongArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          color: 'var(--color-orange-200)',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          padding: '0.5rem',
                          marginBottom: '1rem',
                          textAlign: 'center',
                          backgroundColor: 'var(--color-orange-50)',
                          border: '2px solid var(--color-orange-200)',
                          borderRadius: '4px',
                        }}
                      >
                        DO NOT ADD SENSITIVE DATA
                      </div>
                      {relationElementState && (
                        <Tooltip
                          title={mismatchMessage ?? ''}
                          arrow={true}
                          placement="top"
                          disableHoverListener={!hasMismatch}
                        >
                          <div
                            style={{
                              border: hasMismatch
                                ? '2px solid var(--color-red-300)'
                                : 'none',
                              borderRadius: '4px',
                              padding: hasMismatch ? '0.5rem' : '0',
                            }}
                          >
                            <RelationElementEditor
                              relationElementState={relationElementState}
                              isReadOnly={isReadOnly}
                              {...(hideColumnDefinitions !== undefined
                                ? { hideColumnDefinitions }
                                : {})}
                            />
                          </div>
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {!readOnlySource && (
                  <ModalFooterButton
                    title="Delete sample values"
                    onClick={handleDelete}
                    text="Delete"
                    type="secondary"
                    disabled={isReadOnly}
                  />
                )}
                <ModalFooterButton
                  title="Close sample values editor"
                  onClick={closeModal}
                  text="Close"
                  type="secondary"
                />
              </ModalFooter>
            </Modal>
          </Dialog>
        )}
      </>
    );
  },
);
