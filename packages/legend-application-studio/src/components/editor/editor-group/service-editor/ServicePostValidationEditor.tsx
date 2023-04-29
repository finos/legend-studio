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
import type {
  PostValidationState,
  ServicePostValidationsState,
} from '../../../../stores/editor/editor-state/element-editor-state/service/ServicePostValidationState.js';
import {
  BlankPanelPlaceholder,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PanelContent,
  PanelFormTextField,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  clsx,
} from '@finos/legend-art';
import type { PostValidation } from '@finos/legend-graph';
import { forwardRef, useEffect, useState } from 'react';
import { serviceValidation_setDescription } from '../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';

const ServicePostValidationEditor = observer(
  (props: { postValidationState: PostValidationState }) => {
    const { postValidationState } = props;
    const validation = postValidationState.validation;

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={300} minSize={28}>
          <div className="service-test-data-editor panel">
            <div className="service-test-suite-editor__header">
              <div className="service-test-suite-editor__header__title">
                <div className="service-test-suite-editor__header__title__label">
                  General
                </div>
              </div>
            </div>
            <div className="service-test-data-editor__data">
              <PanelFormTextField
                name="Description"
                prompt="post validation description"
                value={validation.description}
                update={(value: string | undefined): void =>
                  serviceValidation_setDescription(validation, value ?? '')
                }
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}></ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const PostValidationContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      _delete: () => void;
      add: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { add, _delete } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={_delete}>Delete</MenuContentItem>
        <MenuContentItem onClick={add}>Add Post Validation</MenuContentItem>
      </MenuContent>
    );
  }),
);

export const PostValidationItem = observer(
  (props: {
    idx: number;
    postValidation: PostValidation;
    validationState: ServicePostValidationsState;
  }) => {
    const { postValidation, validationState, idx } = props;
    const serviceEditorState = validationState.serviceEditorState;
    const isReadOnly = serviceEditorState.isReadOnly;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isActive =
      validationState.selectedPostValidationState?.validation ===
      postValidation;

    const openVal = (): void =>
      validationState.changeValidation(postValidation);
    const add = (): void => validationState.addValidation();
    const _delete = (): void =>
      validationState.deleteValidation(postValidation);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    return (
      <ContextMenu
        className={clsx(
          'testable-test-explorer__item',
          {
            'testable-test-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={<PostValidationContextMenu add={add} _delete={_delete} />}
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-explorer__item__label')}
          onClick={openVal}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__text">
            {`validation ${idx + 1}`}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

export const ServicePostValidationsEditor = observer(
  (props: { validationState: ServicePostValidationsState }) => {
    const { validationState } = props;
    const serviceEditorState = validationState.serviceEditorState;
    const service = serviceEditorState.service;
    const isReadOnly = serviceEditorState.isReadOnly;
    const addPostValidation = (): void => validationState.addValidation();
    useEffect(() => {
      validationState.init();
    }, [validationState]);
    return (
      <div className="service-registration-editor">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">Post Validations</div>
          </div>
          <div className="panel__header__actions">
            <div className="panel__header__action"></div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">
                    Post Validations
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addPostValidation}
                    title="Add Post Validations"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                {service.postValidations.map((postValidation, _idx) => (
                  <PostValidationItem
                    key={postValidation.hashCode}
                    postValidation={postValidation}
                    validationState={validationState}
                    idx={_idx}
                  />
                ))}
                {!service.postValidations.length && (
                  <BlankPanelPlaceholder
                    text="Add Post Validation"
                    onClick={addPostValidation}
                    disabled={isReadOnly}
                    clickActionType="add"
                    tooltipText="Click to add post validation"
                  />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <div className="panel service-test-editor">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--tests-suites">
                      suite
                    </div>
                  </div>
                </div>
                <div className="service-test-editor__content">
                  {validationState.selectedPostValidationState && (
                    <ServicePostValidationEditor
                      postValidationState={
                        validationState.selectedPostValidationState
                      }
                    />
                  )}
                  {!service.postValidations.length && (
                    <BlankPanelPlaceholder
                      text="Add Post Validation"
                      onClick={addPostValidation}
                      disabled={isReadOnly}
                      clickActionType="add"
                      tooltipText="Click to add post validation"
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
