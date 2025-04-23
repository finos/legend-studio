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
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  PlusIcon,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PanelListSelectorItem,
  ControlledDropdownMenu,
  ResizablePanelSplitterLine,
  PanelContent,
  Panel,
  Badge,
  PanelListSelectorItemLabel,
  PanelFormBooleanField,
  PanelHeaderActions,
  PanelForm,
  PURE_FunctionIcon,
  LongArrowRightIcon,
  PanelLoadingIndicator,
  PanelFormValidatedTextField,
  TimesIcon,
  clsx,
  PanelHeader,
} from '@finos/legend-art';
import {
  type PostDeploymentAction,
  Profile,
  StereotypeExplicitReference,
  type StereotypeReference,
  type TaggedValue,
  generateFunctionPrettyName,
  stub_Profile,
  stub_Stereotype,
  stub_Tag,
  stub_TaggedValue,
  validate_ServicePattern,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  HostedServiceFunctionActivatorEditorState,
  ACTIVATOR_EDITOR_TAB,
} from '../../../../stores/editor/editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
import {
  hostedService_setAutoActivateUpdates,
  hostedService_setDocumentation,
  hostedService_setPattern,
  hostedService_removePatternParameter,
  hostedService_setStoreModel,
  hostedServices_deleteAction,
} from '../../../../stores/graph-modifier/DSL_FunctionActivator_GraphModifierHelper.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { prettyCONSTName } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { ActivatorOwnershipForm } from './ActivatorFormComponents.js';
import {
  annotatedElement_addStereotype,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteStereotype,
  annotatedElement_deleteTaggedValue,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { useDrop } from 'react-dnd';
import {
  TaggedValueDragPreviewLayer,
  TaggedValueEditor,
} from '../uml-editor/TaggedValueEditor.js';
import {
  StereotypeDragPreviewLayer,
  StereotypeSelector,
} from '../uml-editor/StereotypeSelector.js';
import type { DSL_Service_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Service_LegendStudioApplicationPlugin_Extension.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import type { LegendStudioApplicationPlugin } from '../../../../stores/LegendStudioApplicationPlugin.js';

const renderEditorPostAction = (
  postDeploymentAction: PostDeploymentAction,
  isReadOnly: boolean,
  plugins: LegendStudioApplicationPlugin[],
  activatorState: HostedServiceFunctionActivatorEditorState,
): React.ReactNode => {
  const extraPostDeploymentActionEditorRenderers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Service_LegendStudioApplicationPlugin_Extension
      ).getExtraActionEditorRenderers?.() ?? [],
  );
  for (const editorRenderer of extraPostDeploymentActionEditorRenderers) {
    if (postDeploymentAction.properties) {
      const editor = editorRenderer(
        postDeploymentAction.properties,
        activatorState,
        isReadOnly,
        postDeploymentAction,
      );
      if (editor) {
        return editor;
      }
    }
  }
  return (
    <UnsupportedEditorPanel
      isReadOnly={true}
      text="Can't display action in form mode"
    />
  );
};
const HostedServicesActionEditor = observer(
  (props: {
    activatorState: HostedServiceFunctionActivatorEditorState;
    isReadOnly: boolean;
  }) => {
    const { activatorState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const plugins = editorStore.pluginManager.getApplicationPlugins();
    const editorState = editorStore.tabManagerState.getCurrentEditorState(
      HostedServiceFunctionActivatorEditorState,
    );
    const deleteAction =
      (action: PostDeploymentAction, index: number): (() => void) =>
      (): void => {
        hostedServices_deleteAction(editorState.activator, index);
      };
    const postDeploymentActionOptions = plugins
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Service_LegendStudioApplicationPlugin_Extension
          ).getExtraPostDeploymentTypes?.() ?? [],
      )
      .map((type) => ({
        value: type,
        label: type,
      }));

    const addAction =
      (actionType: string): (() => void) =>
      (): void => {
        const extraActions = plugins.flatMap(
          (plugin) =>
            (
              plugin as DSL_Service_LegendStudioApplicationPlugin_Extension
            ).getExtraActionCreators?.() ?? [],
        );
        for (const creator of extraActions) {
          creator(
            actionType,
            activatorState.activator,
            editorStore.changeDetectionState.observerContext,
          );
        }
      };
    const selectAction = (postDeploymentAction: PostDeploymentAction): void => {
      editorState.setSelectedAction(postDeploymentAction);
    };

    const getPostDeploymentActionLabel = (
      postDeploymentAction: PostDeploymentAction,
    ): string => {
      const extraPostDeploymentActionClassifier = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Service_LegendStudioApplicationPlugin_Extension
          ).getExtraPostDeploymentActionClassifierGetters?.() ?? [],
      );
      for (const classify of extraPostDeploymentActionClassifier) {
        if (postDeploymentAction.properties) {
          const label = classify(postDeploymentAction.properties);
          if (label) {
            return label;
          }
        }
      }
      return 'unknown type';
    };

    return (
      <div className="action-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <div className="action-editor__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={200} minSize={100}>
                  <Panel>
                    <PanelHeader title="actions">
                      <PanelHeaderActions>
                        <ControlledDropdownMenu
                          title="Create action"
                          className="panel__header__action"
                          disabled={isReadOnly}
                          content={postDeploymentActionOptions.map(
                            (postDeploymentActionType) => (
                              <MenuContentItem
                                key={postDeploymentActionType.value}
                                onClick={addAction(
                                  postDeploymentActionType.value,
                                )}
                              >
                                New {postDeploymentActionType.label} Action
                              </MenuContentItem>
                            ),
                          )}
                          menuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'right',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'right',
                            },
                            elevation: 7,
                          }}
                        >
                          <PlusIcon />
                        </ControlledDropdownMenu>
                      </PanelHeaderActions>
                    </PanelHeader>
                    <PanelContent>
                      {editorState.activator.actions.map((actionItem, idx) => (
                        <ContextMenu
                          key={actionItem.hashCode}
                          disabled={isReadOnly}
                          content={
                            <MenuContent>
                              <MenuContentItem
                                onClick={deleteAction(actionItem, idx)}
                              >
                                Delete
                              </MenuContentItem>
                            </MenuContent>
                          }
                          menuProps={{ elevation: 7 }}
                        >
                          <PanelListSelectorItem
                            onSelect={() => selectAction(actionItem)}
                            isSelected={
                              actionItem === editorState.selectedAction
                            }
                          >
                            <PanelListSelectorItemLabel
                              title={`Action ${idx + 1}`}
                            />
                            <Badge
                              className="badge--right"
                              title={getPostDeploymentActionLabel(actionItem)}
                            />
                          </PanelListSelectorItem>
                        </ContextMenu>
                      ))}
                    </PanelContent>
                  </Panel>
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel>
                  {editorState.selectedAction &&
                    renderEditorPostAction(
                      editorState.selectedAction,
                      isReadOnly,
                      plugins,
                      editorState,
                    )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const HostedServiceFunctionActivatorEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    HostedServiceFunctionActivatorEditorState,
  );
  const activatorElement = editorState.element;
  const isReadOnly = editorState.isReadOnly;
  const selectedTab = editorState.selectedTab;
  const activator = editorState.activator;
  let addButtonTitle = '';
  switch (selectedTab) {
    case ACTIVATOR_EDITOR_TAB.TAGGED_VALUES:
      addButtonTitle = 'Add tagged value';
      break;
    case ACTIVATOR_EDITOR_TAB.STEREOTYPES:
      addButtonTitle = 'Add stereotype';
      break;
    default:
      break;
  }

  // Tagged Values
  const add = (): void => {
    if (!isReadOnly) {
      if (selectedTab === ACTIVATOR_EDITOR_TAB.TAGGED_VALUES) {
        annotatedElement_addTaggedValue(
          activatorElement,
          stub_TaggedValue(stub_Tag(stub_Profile())),
        );
      } else if (selectedTab === ACTIVATOR_EDITOR_TAB.STEREOTYPES) {
        annotatedElement_addStereotype(
          activatorElement,
          StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
        );
      }
    }
  };
  const handleDropTaggedValue = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addTaggedValue(
          activatorElement,
          stub_TaggedValue(stub_Tag(item.data.packageableElement)),
        );
      }
    },
    [activatorElement, isReadOnly],
  );
  const [{ isTaggedValueDragOver }, taggedValueDropConnector] = useDrop<
    ElementDragSource,
    void,
    { isTaggedValueDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropTaggedValue(item),
      collect: (monitor) => ({
        isTaggedValueDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropTaggedValue],
  );
  const taggedValueRef = useRef<HTMLInputElement>(null);
  taggedValueDropConnector(taggedValueRef);

  // Stereotype
  const handleDropStereotype = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addStereotype(
          activatorElement,
          StereotypeExplicitReference.create(
            stub_Stereotype(item.data.packageableElement),
          ),
        );
      }
    },
    [activatorElement, isReadOnly],
  );
  const [{ isStereotypeDragOver }, stereotypeDropConnector] = useDrop<
    ElementDragSource,
    void,
    { isStereotypeDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropStereotype(item),
      collect: (monitor) => ({
        isStereotypeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropStereotype],
  );
  const stereotypeRef = useRef<HTMLInputElement>(null);
  stereotypeDropConnector(stereotypeRef);

  const _deleteStereotype =
    (val: StereotypeReference): (() => void) =>
    (): void =>
      annotatedElement_deleteStereotype(activatorElement, val);
  const _deleteTaggedValue =
    (val: TaggedValue): (() => void) =>
    (): void =>
      annotatedElement_deleteTaggedValue(activatorElement, val);
  const changeTab =
    (tab: ACTIVATOR_EDITOR_TAB): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);

  const visitFunction = (): void =>
    editorState.editorStore.graphEditorMode.openElement(
      activator.function.value,
    );
  const validate = (): void => {
    flowResult(editorState.validate()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const deploy = (): void => {
    flowResult(editorState.deployToSandbox()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  const changeDocumentation: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (!isReadOnly) {
      hostedService_setDocumentation(activator, event.target.value);
    }
  };

  const toggleUseStoreModel = (): void => {
    hostedService_setStoreModel(activator, !activator.storeModel);
  };

  const toggleAutoActivateUpdates = (): void => {
    hostedService_setAutoActivateUpdates(
      activator,
      !activator.autoActivateUpdates,
    );
  };

  const getValidationMessage = (inputPattern: string): string | undefined => {
    const patternValidationResult = validate_ServicePattern(inputPattern);
    return patternValidationResult
      ? patternValidationResult.messages[0]
      : undefined;
  };

  //Pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState(activator.pattern);

  const updatePattern = (newPattern: string): void => {
    if (!isReadOnly) {
      hostedService_setPattern(activator, newPattern);
    }
  };

  const removePatternParameter =
    (val: string): (() => void) =>
    (): void => {
      hostedService_removePatternParameter(activator, val);
      setPattern(activator.pattern);
    };

  useEffect(() => {
    patternRef.current?.focus();
  }, [editorState]);

  return (
    <div className="hosted-service-function-activator-editor">
      <Panel>
        <PanelHeader title="Rest Service Application" />
        <PanelLoadingIndicator
          isLoading={Boolean(
            editorState.validateState.isInProgress ||
              editorState.deployState.isInProgress,
          )}
        />
        <div className="panel__header function-editor__tabs__header">
          <div className="function-editor__tabs">
            {Object.values(ACTIVATOR_EDITOR_TAB).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('function-editor__tab', {
                  'function-editor__tab--active': tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
          {selectedTab !== ACTIVATOR_EDITOR_TAB.DEFINITION && (
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              onClick={add}
              tabIndex={-1}
              title={addButtonTitle}
            >
              <PlusIcon />
            </button>
          )}
        </div>
        <PanelContent>
          {selectedTab === ACTIVATOR_EDITOR_TAB.DEFINITION && (
            <div>
              <div className="hosted-service-function-activator-editor__header">
                <div className="hosted-service-function-activator-editor__header__label">
                  Rest Service Activator
                </div>
                <div className="hosted-service-function-activator-editor__header__actions">
                  <button
                    className="hosted-service-function-activator-editor__header__actions__action hosted-service-function-activator-editor__header__actions__action--primary"
                    onClick={validate}
                    disabled={editorState.validateState.isInProgress}
                    tabIndex={-1}
                    title="Click Validate to verify your activator before deployment"
                  >
                    Validate
                  </button>
                  <button
                    className="hosted-service-function-activator-editor__header__actions__action hosted-service-function-activator-editor__header__actions__action--primary"
                    onClick={deploy}
                    disabled={editorState.deployState.isInProgress}
                    title="Deploy to sandbox"
                    tabIndex={-1}
                  >
                    Deploy to Sandbox
                  </button>
                </div>
              </div>
              <PanelForm>
                <PanelFormValidatedTextField
                  ref={patternRef}
                  name="URL Pattern"
                  isReadOnly={isReadOnly}
                  className="service-editor__pattern__input"
                  errorMessageClassName="service-editor__pattern__input"
                  prompt={
                    <>
                      Specifies the URL pattern of the service (e.g. /myService/
                      <span className="service-editor__pattern__example__param">{`{param}`}</span>
                      )
                    </>
                  }
                  update={(value: string | undefined): void => {
                    updatePattern(value ?? '');
                  }}
                  validate={getValidationMessage}
                  value={pattern}
                />
              </PanelForm>
              <PanelForm>
                <div className="panel__content__form__section service-editor__parameters">
                  <div className="panel__content__form__section__header__label">
                    Parameters
                  </div>
                  <div className="panel__content__form__section__header__prompt">
                    URL parameters (each must be surrounded by curly braces)
                    will be passed as arguments for the execution query. Note
                    that if the service is configured to use multi-execution,
                    one of the URL parameters must be chosen as the execution
                    key.
                  </div>
                  <div className="service-editor__parameters__list">
                    {!activator.patternParameters.length && (
                      <div className="service-editor__parameters__list__empty">
                        No parameter
                      </div>
                    )}
                    {Boolean(activator.patternParameters.length) &&
                      activator.patternParameters.map((parameter) => (
                        <div
                          key={parameter}
                          className="service-editor__parameter"
                        >
                          <div className="service-editor__parameter__text">
                            {parameter}
                          </div>
                          <div className="service-editor__parameter__actions">
                            <button
                              className="service-editor__parameter__action"
                              disabled={isReadOnly}
                              onClick={removePatternParameter(parameter)}
                              title="Remove parameter"
                              tabIndex={-1}
                            >
                              <TimesIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </PanelForm>
              <PanelForm>
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Function
                  </div>
                </div>
                <div className="hosted-service-function-activator-editor__configuration__items">
                  <div className="hosted-service-function-activator-editor__configuration__item">
                    <div className="btn--sm hosted-service-function-activator-editor__configuration__item__label">
                      <PURE_FunctionIcon />
                    </div>
                    <input
                      className="panel__content__form__section__input"
                      spellCheck={false}
                      disabled={true}
                      value={generateFunctionPrettyName(
                        activator.function.value,
                        {
                          fullPath: true,
                          spacing: false,
                        },
                      )}
                    />
                    <button
                      className="btn--dark btn--sm hosted-service-function-activator-editor__configuration__item__btn"
                      onClick={visitFunction}
                      tabIndex={-1}
                      title="See Function"
                    >
                      <LongArrowRightIcon />
                    </button>
                  </div>
                </div>
              </PanelForm>
              <PanelForm>
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Documentation
                  </div>
                  <div className="panel__content__form__section__header__prompt">{`Provide a brief description of the service's functionalities and usage`}</div>
                  <textarea
                    className="panel__content__form__section__textarea service-editor__documentation__input"
                    spellCheck={false}
                    disabled={isReadOnly}
                    value={activator.documentation}
                    onChange={changeDocumentation}
                  />
                </div>
              </PanelForm>
              <PanelForm>
                <PanelFormBooleanField
                  isReadOnly={isReadOnly}
                  value={activator.autoActivateUpdates}
                  name="Auto Activate Updates"
                  prompt="Specifies if the new generation should be automatically activated;
          only valid when latest revision is selected upon service
          registration"
                  update={toggleAutoActivateUpdates}
                />
              </PanelForm>
              <PanelForm>
                <PanelFormBooleanField
                  isReadOnly={isReadOnly}
                  value={activator.storeModel}
                  name="Store Model"
                  prompt="Use Store Model (slower)"
                  update={toggleUseStoreModel}
                />
              </PanelForm>
              <PanelForm>
                <ActivatorOwnershipForm
                  activator={activator}
                  isReadOnly={isReadOnly}
                />
              </PanelForm>
            </div>
          )}
          {selectedTab === ACTIVATOR_EDITOR_TAB.TAGGED_VALUES && (
            <div
              ref={taggedValueRef}
              className={clsx('panel__content__lists', {
                'panel__content__lists--dnd-over':
                  isTaggedValueDragOver && !isReadOnly,
              })}
            >
              <TaggedValueDragPreviewLayer />
              {activatorElement.taggedValues.map((taggedValue) => (
                <TaggedValueEditor
                  annotatedElement={activatorElement}
                  key={taggedValue._UUID}
                  taggedValue={taggedValue}
                  deleteValue={_deleteTaggedValue(taggedValue)}
                  isReadOnly={isReadOnly}
                  darkTheme={true}
                />
              ))}
            </div>
          )}
          {selectedTab === ACTIVATOR_EDITOR_TAB.STEREOTYPES && (
            <div
              ref={stereotypeRef}
              className={clsx('panel__content__lists', {
                'panel__content__lists--dnd-over':
                  isStereotypeDragOver && !isReadOnly,
              })}
            >
              <StereotypeDragPreviewLayer />
              {activatorElement.stereotypes.map((stereotype) => (
                <StereotypeSelector
                  key={stereotype.value._UUID}
                  annotatedElement={activatorElement}
                  stereotype={stereotype}
                  deleteStereotype={_deleteStereotype(stereotype)}
                  isReadOnly={isReadOnly}
                  darkTheme={true}
                />
              ))}
            </div>
          )}
          {selectedTab === ACTIVATOR_EDITOR_TAB.ACTIONS && (
            <div className={clsx('panel__content__lists')}>
              <HostedServicesActionEditor
                activatorState={editorState}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
