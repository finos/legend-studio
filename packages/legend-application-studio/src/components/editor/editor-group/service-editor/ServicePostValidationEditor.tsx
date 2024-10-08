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
  PostValidationAssertionState,
  PostValidationParameterState,
  PostValidationState,
  ServicePostValidationsState,
} from '../../../../stores/editor/editor-state/element-editor-state/service/ServicePostValidationState.js';
import {
  BlankPanelPlaceholder,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PURE_FunctionIcon,
  PanelContent,
  PanelFormTextField,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TimesIcon,
  clsx,
  Panel,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderActionItem,
  PlayIcon,
  PanelTabs,
} from '@finos/legend-art';
import type {
  PostValidation,
  PostValidationAssertionResult,
  PostValidationViolationsResultRow,
} from '@finos/legend-graph';
import { forwardRef, useEffect, useState } from 'react';
import {
  serviceValidation_setASsertionId,
  serviceValidation_setDescription,
} from '../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';

const ServicePostValidationAssertionEditor = observer(
  (props: { assertionState: PostValidationAssertionState }) => {
    const { assertionState } = props;
    const servicePostValidationState =
      assertionState.postValidationState.servicePostValidationState;
    const serviceEditorState = servicePostValidationState.serviceEditorState;
    const postValState = assertionState.postValidationState;
    const hasParserError = postValState.hasParserError;
    const isReadOnly = serviceEditorState.isReadOnly;
    const assertion = assertionState.assertion;
    const errorMessage =
      assertion.id === ''
        ? `assertion ID can't be empty`
        : assertion.id.includes(' ')
          ? `assertion ID can't include spaced`
          : undefined;

    return (
      <div className="service-post-validation-editor__parameters">
        <div className="service-post-validation-editor__header">
          <div className="service-post-validation-editor__header__label">
            <PURE_FunctionIcon />
            <div className="service-post-validation-editor__header__label__text">
              Assertion
            </div>
          </div>
          <div className="service-post-validation-editor__header__label__actions">
            <div className="service-post-validation-editor__header__label__action">
              <button
                className="service-post-validation-editor__remove-btn btn--dark btn--caution"
                title="Delete Assertion"
                disabled={isReadOnly}
                onClick={(): void =>
                  assertionState.postValidationState.deleteAssertion(assertion)
                }
                tabIndex={-1}
              >
                <TimesIcon />
              </button>
            </div>
          </div>
        </div>
        <PanelFormTextField
          name="ID"
          value={assertion.id}
          update={(value: string | undefined): void =>
            serviceValidation_setASsertionId(assertion, value ?? '')
          }
          errorMessage={errorMessage}
        />
        <div
          className={clsx(
            'service-post-validation-editor__lambda-editor__container',
            { backdrop__element: hasParserError },
          )}
        >
          <InlineLambdaEditor
            className="service-post-validation-editor__lambda-editor"
            disabled={isReadOnly || postValState.isRunningLambdaConversion}
            lambdaEditorState={assertionState}
            forceBackdrop={hasParserError}
          />
        </div>
      </div>
    );
  },
);

const ServicePostValidationParameterEditor = observer(
  (props: { paramState: PostValidationParameterState }) => {
    const { paramState } = props;
    const serviceEditorState =
      paramState.postValidationState.servicePostValidationState
        .serviceEditorState;
    const postValState = paramState.postValidationState;
    const hasParserError = postValState.hasParserError;
    const isReadOnly = serviceEditorState.isReadOnly;
    return (
      <div>
        <div className="service-post-validation-editor__header">
          <div className="service-post-validation-editor__header__label">
            <PURE_FunctionIcon />
            <div className="service-post-validation-editor__header__label__text">
              Parameter
            </div>
          </div>
          <div className="service-post-validation-editor__header__label__actions">
            <div className="service-post-validation-editor__header__label__action">
              <button
                className="service-post-validation-editor__remove-btn btn--dark btn--caution"
                title="Delete Assertion"
                disabled={isReadOnly}
                onClick={(): void =>
                  paramState.postValidationState.deleteParam(paramState)
                }
                tabIndex={-1}
              >
                <TimesIcon />
              </button>
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'service-post-validation-editor__lambda-editor__container',
            { backdrop__element: hasParserError },
          )}
        >
          <InlineLambdaEditor
            className="service-post-validation-editor__lambda-editor"
            disabled={isReadOnly || postValState.isRunningLambdaConversion}
            lambdaEditorState={paramState}
            forceBackdrop={hasParserError}
          />
        </div>
      </div>
    );
  },
);

const ServicePostValidationEditor = observer(
  (props: { postValidationState: PostValidationState }) => {
    const { postValidationState } = props;
    const serviceEditorState =
      postValidationState.servicePostValidationState.serviceEditorState;
    const editorStore = serviceEditorState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const isReadOnly = serviceEditorState.isReadOnly;
    const validation = postValidationState.validation;
    const addParameter = (): void => {
      flowResult(postValidationState.addParameter()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const addAssertion = (): void => {
      flowResult(postValidationState.addAssertion()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    useEffect(() => {
      flowResult(postValidationState.convertAssertionsLambdas()).catch(
        applicationStore.alertUnhandledError,
      );
      flowResult(postValidationState.convertParameterLambdas()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, postValidationState]);
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={150} minSize={28}>
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
        <ResizablePanel minSize={56}>
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={200} minSize={28}>
              <div className="service-test-data-editor panel">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      Parameters
                    </div>
                  </div>
                  <div className="panel__header__actions">
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      onClick={addParameter}
                      title="Add Parameter"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>

                <div className="service-test-data-editor__data">
                  {postValidationState.parametersState.map((aState) => (
                    <ServicePostValidationParameterEditor
                      key={aState.uuid}
                      paramState={aState}
                    />
                  ))}
                  {!validation.parameters.length && (
                    <BlankPanelPlaceholder
                      text="Add Parameter"
                      onClick={addParameter}
                      disabled={isReadOnly}
                      clickActionType="add"
                      tooltipText="Click to add parameter"
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="service-test-data-editor panel">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      Assertions
                    </div>
                  </div>
                  <div className="panel__header__actions">
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      onClick={addAssertion}
                      title="Add Assertion"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>
                <div className="service-test-data-editor__data">
                  {postValidationState.assertionStates.map((aState) => (
                    <ServicePostValidationAssertionEditor
                      key={aState.uuid}
                      assertionState={aState}
                    />
                  ))}
                  {!validation.assertions.length && (
                    <BlankPanelPlaceholder
                      text="Add Assertion"
                      onClick={addAssertion}
                      disabled={isReadOnly}
                      clickActionType="add"
                      tooltipText="Click to add assertion"
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
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
    const applicationStore = useApplicationStore();
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
    const runVal = (): void => {
      flowResult(validationState.runVal()).catch(
        applicationStore.alertUnhandledError,
      );
    };
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
        <div className="mapping-test-explorer__item__actions">
          <button
            className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
            onClick={runVal}
            disabled={validationState.runningPostValidationAction.isInProgress}
            tabIndex={-1}
            title={`Validate ${idx + 1}`}
          >
            {<PlayIcon />}
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const ServicePostValidationResultViewer = observer(
  (props: { result: PostValidationAssertionResult }) => {
    const { result } = props;

    const summaryType =
      result.violations.result.rows.length === 0 ? 'success' : 'fail';

    return (
      <div
        className={`testable-test-assertion-result__summary--${summaryType}`}
      >
        <div className="testable-test-assertion-result__summary-main">
          Assertion Result Summary ({summaryType})
        </div>
        <div className="testable-test-assertion-result__summary-info">
          Id: {result.id}
        </div>
        <div className="testable-test-assertion-result__summary-info">
          Message: {result.message}
        </div>
        <div className="testable-test-assertion-result__summary-info">
          Violations: {result.violations.result.rows.length}
        </div>
        {result.violations.result.rows.map(
          (row: PostValidationViolationsResultRow) => (
            <div
              key={result.id}
              className={`testable-test-assertion-result__summary testable-test-assertion-result__summary--${summaryType}`}
            >
              {row.values.map((value, valueIndex) => (
                <div
                  key={`${result.violations.result.columns[valueIndex]}-${value}`}
                  className="testable-test-assertion-result__summary-info"
                >
                  {result.violations.result.columns[valueIndex]}: {value}
                </div>
              ))}
            </div>
          ),
        )}
      </div>
    );
  },
);

const ServicePostValidationResultsViewer = observer(
  (props: {
    isInProgress: boolean;
    results: PostValidationAssertionResult[] | undefined;
  }) => {
    const { isInProgress, results } = props;

    return (
      <div className="testable-test-assertion-result__summary">
        {results
          ? results.map((result) => (
              <ServicePostValidationResultViewer
                key={result.id}
                result={result}
              />
            ))
          : isInProgress
            ? 'Post validation(s) running...'
            : 'Run post validation(s) to see results'}
      </div>
    );
  },
);

// TOD: Currently editor is a very basic editor. Can improve with the following:
// 1. generate parameters using the query parameters (verify that those parameter values are used for execution)
//  most likely the parameter values should be consistent with other parameter value shapes such as service tests
// 2. wire up engine api calls to generate validation as well as run the validations
export const ServicePostValidationsEditor = observer(
  (props: { validationState: ServicePostValidationsState }) => {
    const { validationState } = props;
    const serviceEditorState = validationState.serviceEditorState;
    const service = serviceEditorState.service;
    const isReadOnly = serviceEditorState.isReadOnly;
    enum POST_VALIDATION_TAB {
      SETUP = 'SETUP',
      ASSERTIONS = 'ASSERTIONS',
    }
    const [selectedTab, setSelectedTab] = useState(POST_VALIDATION_TAB.SETUP);
    const addPostValidation = (): void => validationState.addValidation();
    useEffect(() => {
      validationState.init();
    }, [validationState]);
    useEffect(() => {
      if (validationState.runningPostValidationAction.isInProgress) {
        setSelectedTab(POST_VALIDATION_TAB.ASSERTIONS);
      }
    }, [
      validationState.runningPostValidationAction.isInProgress,
      POST_VALIDATION_TAB.ASSERTIONS,
    ]);
    return (
      <div className="service-post-validation-editor">
        <PanelHeader title="Post validations" />
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <PanelHeader>
                <div className="panel__header__title">
                  <div className="panel__header__title__label">
                    Post Validations
                  </div>
                </div>
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    onClick={addPostValidation}
                    title="Add Post Validations"
                  >
                    <PlusIcon />
                  </PanelHeaderActionItem>
                </PanelHeaderActions>
              </PanelHeader>
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
              <Panel className="service-test-editor">
                <PanelTabs
                  tabs={Object.keys(POST_VALIDATION_TAB)}
                  selectedTab={selectedTab}
                  changeTab={(tab) => () =>
                    setSelectedTab(
                      POST_VALIDATION_TAB[
                        tab as keyof typeof POST_VALIDATION_TAB
                      ],
                    )
                  }
                  tabClassName="panel__header__tab"
                />
                {selectedTab === POST_VALIDATION_TAB.SETUP ? (
                  <PanelContent className="service-test-editor__content">
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
                  </PanelContent>
                ) : null}
                {selectedTab === POST_VALIDATION_TAB.ASSERTIONS ? (
                  <PanelContent>
                    <ServicePostValidationResultsViewer
                      isInProgress={
                        validationState.runningPostValidationAction.isInProgress
                      }
                      results={validationState.postValidationAssertionResults}
                    />
                  </PanelContent>
                ) : null}
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
