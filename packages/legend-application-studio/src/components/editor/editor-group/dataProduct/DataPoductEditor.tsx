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
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type AccessPointGroupState,
  type AccessPointState,
  DATA_PRODUCT_TAB,
  DataProductEditorState,
  generateUrlToDeployOnOpen,
  LakehouseAccessPointState,
} from '../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  clsx,
  LockIcon,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
  Dialog,
  TimesIcon,
  PlusIcon,
  PanelHeaderActionItem,
  RocketIcon,
  ListEditor,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  PencilEditIcon,
  PanelFormTextField,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  WarningIcon,
  PanelFormSection,
  useDragPreviewLayer,
  DragPreviewLayer,
  PanelDnDEntry,
  PanelEntryDragHandle,
  HomeIcon,
  QuestionCircleIcon,
  ErrorWarnIcon,
  GroupWorkIcon,
  CustomSelectorInput,
  Switch,
  BuildingIcon,
  Tooltip,
  InfoCircleIcon,
  ResizablePanelGroup,
  ResizablePanel,
  MarkdownTextViewer,
  ResizablePanelSplitter,
  EyeIcon,
  CloseEyeIcon,
  Checkbox,
  BugIcon,
} from '@finos/legend-art';
import React, {
  useRef,
  useState,
  useEffect,
  type ChangeEventHandler,
  useCallback,
} from 'react';
import { filterByType } from '@finos/legend-shared';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { action, flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  LakehouseTargetEnv,
  Email,
  type DataProduct,
  type LakehouseAccessPoint,
  StereotypeExplicitReference,
  type V1_DataProductArtifactAccessPointGroup,
  type V1_DataProductArtifactAccessPointImplementation,
  type V1_DataProductArtifactGeneration,
} from '@finos/legend-graph';
import {
  accessPointGroup_setDescription,
  accessPointGroup_setName,
  dataProduct_setDescription,
  dataProduct_setSupportInfoIfAbsent,
  dataProduct_setTitle,
  supportInfo_setDocumentationUrl,
  supportInfo_setWebsite,
  supportInfo_setFaqUrl,
  supportInfo_setSupportUrl,
  supportInfo_addEmail,
  supportInfo_deleteEmail,
  accessPoint_setClassification,
  accessPoint_setReproducible,
} from '../../../../stores/graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import { useDrag, useDrop } from 'react-dnd';
import {
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';

export enum AP_GROUP_MODAL_ERRORS {
  GROUP_NAME_EMPTY = 'Group Name is empty',
  GROUP_NAME_EXISTS = 'Group Name already exists',
  GROUP_DESCRIPTION_EMPTY = 'Group Description is empty',
  AP_NAME_EMPTY = 'Access Point Name is empty',
  AP_NAME_EXISTS = 'Access Point Name already exists',
  AP_DESCRIPTION_EMPTY = 'Access Point Description is empty',
}

export const AP_EMPTY_DESC_WARNING =
  'Click here to describe the data this access point produces';

const AP_DND_TYPE = 'ACCESS_POINT';
const AP_GROUP_DND_TYPE = 'ACCESS_POINT_GROUP';

export type AccessPointDragSource = {
  accessPointState: AccessPointState;
};

export type APGDragSource = {
  groupState: AccessPointGroupState;
};

const newNamePlaceholder = '';

interface HoverTextAreaProps {
  text: string;
  handleMouseOver: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseOut: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const HoverTextArea: React.FC<HoverTextAreaProps> = ({
  text: text,
  handleMouseOver,
  handleMouseOut,
  className,
}) => {
  return (
    <div
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      className={clsx(className)}
      style={{ whiteSpace: 'pre-line' }}
    >
      {text}
    </div>
  );
};

const hoverIcon = () => {
  return (
    <div data-testid={LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON}>
      <PencilEditIcon />
    </div>
  );
};

const AccessPointTitle = observer(
  (props: { accessPoint: LakehouseAccessPoint }) => {
    const { accessPoint } = props;
    const [editingName, setEditingName] = useState(
      accessPoint.id === newNamePlaceholder,
    );
    const handleNameEdit = () => setEditingName(true);
    const handleNameBlur = () => {
      if (accessPoint.id !== newNamePlaceholder) {
        setEditingName(false);
      }
    };
    const updateAccessPointName: React.ChangeEventHandler<HTMLTextAreaElement> =
      action((event) => {
        if (event.target.value.match(/^[0-9a-zA-Z_]+$/)) {
          accessPoint.id = event.target.value;
        }
      });

    return editingName ? (
      <textarea
        className="access-point-editor__name"
        spellCheck={false}
        value={accessPoint.id}
        onChange={updateAccessPointName}
        placeholder={'Access Point Name'}
        onBlur={handleNameBlur}
        style={{
          borderColor:
            accessPoint.id === newNamePlaceholder
              ? 'var(--color-red-300)'
              : 'transparent',
        }}
      />
    ) : (
      <div
        className="access-point-editor__name__label"
        onClick={handleNameEdit}
        title="Click to edit access point title"
        style={{ flex: '1 1 auto' }}
      >
        {accessPoint.id}
      </div>
    );
  },
);

const AccessPointClassification = observer(
  (props: {
    accessPoint: LakehouseAccessPoint;
    groupState: AccessPointGroupState;
  }) => {
    const { accessPoint, groupState } = props;
    const applicationStore = useEditorStore().applicationStore;
    const CHOOSE_CLASSIFICATION = 'Classification';
    const updateAccessPointClassificationTextbox: React.ChangeEventHandler<HTMLTextAreaElement> =
      action((event) => {
        accessPoint.classification = event.target.value;
      });

    const conditionalClassifications = (): string[] => {
      if (groupState.containsPublicStereotype) {
        return (
          applicationStore.config.options.dataProductConfig
            ?.publicClassifications ?? []
        );
      } else {
        return (
          applicationStore.config.options.dataProductConfig?.classifications ??
          []
        );
      }
    };

    const classificationOptions = [CHOOSE_CLASSIFICATION]
      .concat(conditionalClassifications())
      .map((classfication) => ({
        label: classfication,
        value: classfication,
      }));

    const updateAccessPointClassificationFromDropdown = action(
      (val: { label: string; value: string } | null): void => {
        accessPoint_setClassification(
          accessPoint,
          val?.value === CHOOSE_CLASSIFICATION ? undefined : val?.value,
        );
      },
    );

    const currentClassification =
      accessPoint.classification !== undefined
        ? {
            label: accessPoint.classification,
            value: accessPoint.classification,
          }
        : {
            label: CHOOSE_CLASSIFICATION,
            value: CHOOSE_CLASSIFICATION,
          };

    const classificationDocumentationLink = (): void => {
      const docLink =
        applicationStore.config.options.dataProductConfig?.classificationDoc;
      if (docLink) {
        applicationStore.navigationService.navigator.visitAddress(docLink);
      }
    };
    return (
      <div className="access-point-editor__classification">
        {classificationOptions.length > 1 ? (
          <div
            style={{
              borderWidth: 'thin',
              borderColor:
                currentClassification.label === CHOOSE_CLASSIFICATION
                  ? 'var(--color-red-300)'
                  : 'transparent',
            }}
          >
            <CustomSelectorInput
              className="explorer__new-element-modal__driver__dropdown"
              options={classificationOptions}
              onChange={updateAccessPointClassificationFromDropdown}
              value={currentClassification}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
        ) : (
          <textarea
            className="panel__content__form__section__input"
            spellCheck={false}
            value={accessPoint.classification ?? ''}
            onChange={updateAccessPointClassificationTextbox}
            placeholder="Add classification"
            style={{
              overflow: 'hidden',
              width: '125px',
              resize: 'none',
              padding: '0.25rem',
            }}
          />
        )}
        <Tooltip
          title="Learn more about data classification scheme here."
          arrow={true}
          placement={'top'}
        >
          <button onClick={classificationDocumentationLink}>
            <InfoCircleIcon />
          </button>
        </Tooltip>
      </div>
    );
  },
);

const AccessPointGenerationViewer = observer(
  (props: {
    accessPointState: LakehouseAccessPointState;
    generationOutput: string;
  }) => {
    const { accessPointState, generationOutput } = props;
    const editorStore = accessPointState.state.state.editorStore;
    const closeDebug = (): void => {
      accessPointState.setShowDebug(false);
    };

    return (
      <Dialog
        open={accessPointState.showDebug}
        onClose={closeDebug}
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
          <ModalHeader
            title={`${accessPointState.accessPoint.id} Plan Generation`}
          />
          <ModalBody>
            <div className="panel__content execution-plan-viewer__panel__content">
              <CodeEditor
                inputValue={generationOutput}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.JSON}
                hidePadding={true}
                hideMinimap={true}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              title="Close plan generation modal"
              onClick={closeDebug}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const LakehouseDataProductAcccessPointEditor = observer(
  (props: {
    accessPointState: LakehouseAccessPointState;
    isReadOnly: boolean;
  }) => {
    const { accessPointState } = props;
    const editorStore = useEditorStore();
    const accessPoint = accessPointState.accessPoint;
    const groupState = accessPointState.state;
    const lambdaEditorState = accessPointState.lambdaState;
    const propertyHasParserError = groupState.accessPointStates
      .filter(filterByType(LakehouseAccessPointState))
      .find((pm) => pm.lambdaState.parserError);
    const [editingDescription, setEditingDescription] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [debugOutput, setDebugOutput] = useState('');

    const handleDescriptionEdit = () => setEditingDescription(true);
    const handleDescriptionBlur = () => {
      setEditingDescription(false);
      setIsHovering(false);
    };
    const handleMouseOver: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHovering(true);
    };
    const handleMouseOut: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHovering(false);
    };
    const updateAccessPointDescription: React.ChangeEventHandler<HTMLTextAreaElement> =
      action((event) => {
        accessPoint.description = event.target.value;
      });
    const updateAccessPointTargetEnvironment = action(
      (targetEnvironment: LakehouseTargetEnv) => {
        accessPoint.targetEnvironment = targetEnvironment;
      },
    );

    const debugPlanGeneration = async (): Promise<void> => {
      try {
        const generatedArtifacts =
          await editorStore.graphManagerState.graphManager.generateArtifacts(
            editorStore.graphManagerState.graph,
            editorStore.graphEditorMode.getGraphTextInputOption(),
            [groupState.state.elementPath],
          );
        const dataProductExtension = 'dataProduct';
        const dataProductArtifact = generatedArtifacts.values.filter(
          (artifact) => artifact.extension === dataProductExtension,
        );
        const dataProductContent =
          dataProductArtifact[0]?.artifactsByExtensionElements[0]?.files[0]
            ?.content ?? null;

        if (dataProductContent) {
          const contentJson = JSON.parse(
            dataProductContent,
          ) as V1_DataProductArtifactGeneration;
          const apPlanGeneration = contentJson.accessPointGroups
            .find(
              (group: V1_DataProductArtifactAccessPointGroup) =>
                group.id === groupState.value.id,
            )
            ?.accessPointImplementations.find(
              (
                apImplementation: V1_DataProductArtifactAccessPointImplementation,
              ) => apImplementation.id === accessPoint.id,
            );

          setDebugOutput(JSON.stringify(apPlanGeneration, null, 2));
          accessPointState.setShowDebug(true);
        } else {
          throw new Error(
            'Could not find contents of this data product artifact',
          );
        }
      } catch (error) {
        editorStore.applicationStore.notificationService.notifyError(
          `Failed to fetch access point plan generation: ${error}`,
        );
      }
    };

    const handleRemoveAccessPoint = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: `Are you sure you want to delete Access Point ${accessPoint.id}?`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              groupState.deleteAccessPoint(accessPointState);
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

    //Drag and drop - reorder access points/move between groups
    const handleHover = useCallback(
      (item: AccessPointDragSource): void => {
        const draggingProperty = item.accessPointState;
        const hoveredProperty = accessPointState;
        groupState.swapAccessPoints(draggingProperty, hoveredProperty);
      },
      [accessPointState, groupState],
    );

    const [{ isBeingDraggedAP }, dropConnector] = useDrop<
      AccessPointDragSource,
      void,
      { isBeingDraggedAP: AccessPointState | undefined }
    >(
      () => ({
        accept: [AP_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedAP: monitor.getItem<AccessPointDragSource | null>()
            ?.accessPointState,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = accessPoint === isBeingDraggedAP?.accessPoint;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<AccessPointDragSource>(
        () => ({
          type: AP_DND_TYPE,
          item: () => ({
            accessPointState: accessPointState,
          }),
          collect: (monitor) => ({
            isDragging: monitor.isDragging(),
          }),
        }),
        [accessPointState],
      );
    dragConnector(ref);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="dnd__placeholder--light"></div>}
        showPlaceholder={isBeingDragged}
      >
        <div
          className={clsx('access-point-editor', {
            backdrop__element: propertyHasParserError,
          })}
        >
          <PanelEntryDragHandle
            dragSourceConnector={ref}
            isDragging={isBeingDragged}
            title={'Drag this Access Point to another group'}
            className="access-point-editor__dnd-handle"
          />
          <div style={{ flex: 1 }}>
            <div className="access-point-editor__metadata">
              <AccessPointTitle accessPoint={accessPoint} />
              <div className="access-point-editor__info">
                <div className="access-point-editor__reproducible">
                  <Checkbox
                    disabled={groupState.state.isReadOnly}
                    checked={accessPoint.reproducible ?? false}
                    onChange={() =>
                      accessPoint_setReproducible(
                        accessPoint,
                        !accessPoint.reproducible,
                      )
                    }
                    size="small"
                    style={{ padding: 0, margin: 0 }}
                  />
                  <Tooltip
                    title={
                      <div
                        style={{
                          maxWidth: '400px',
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                        }}
                      >
                        Marking as &quot;reproducible&quot; means consumers can
                        consistently retrieve the exact historical data as it
                        existed at any specific Lakehouse batch.
                      </div>
                    }
                    arrow={true}
                    placement={'top'}
                  >
                    <div>Reproducible</div>
                  </Tooltip>
                </div>
                {editorStore.applicationStore.config.options
                  .dataProductConfig && (
                  <AccessPointClassification
                    accessPoint={accessPoint}
                    groupState={groupState}
                  />
                )}
                <div
                  className={clsx('access-point-editor__type')}
                  title={'Change target environment'}
                >
                  <div className="access-point-editor__type__label">
                    {accessPoint.targetEnvironment}
                  </div>
                  <ControlledDropdownMenu
                    className="access-point-editor__dropdown"
                    content={
                      <MenuContent>
                        {Object.values(LakehouseTargetEnv).map(
                          (environment) => (
                            <MenuContentItem
                              key={environment}
                              className="btn__dropdown-combo__option"
                              onClick={() =>
                                updateAccessPointTargetEnvironment(environment)
                              }
                            >
                              {environment}
                            </MenuContentItem>
                          ),
                        )}
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'right',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'right',
                      },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </div>
              </div>
            </div>
            {editingDescription ? (
              <textarea
                className="panel__content__form__section__input"
                spellCheck={false}
                value={accessPoint.description ?? ''}
                onChange={updateAccessPointDescription}
                placeholder="Access Point description"
                onBlur={handleDescriptionBlur}
                style={{
                  resize: 'vertical',
                  padding: '0.25rem',
                  marginLeft: '0.5rem',
                  marginTop: '0.5rem',
                  height: 'auto',
                }}
              />
            ) : (
              <div
                onClick={handleDescriptionEdit}
                title="Click to edit access point description"
                className="access-point-editor__description-container"
              >
                {accessPoint.description ? (
                  <HoverTextArea
                    text={accessPoint.description}
                    handleMouseOver={handleMouseOver}
                    handleMouseOut={handleMouseOut}
                  />
                ) : (
                  <div
                    className="access-point-editor__group-container__description--warning"
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                  >
                    <WarningIcon />
                    {AP_EMPTY_DESC_WARNING}
                  </div>
                )}
                {isHovering && hoverIcon()}
              </div>
            )}
            <div className="access-point-editor__content">
              <div className="access-point-editor__generic-entry">
                <div className="access-point-editor__entry__container">
                  <div className="access-point-editor__entry">
                    <InlineLambdaEditor
                      className={'access-point-editor__lambda-editor'}
                      disabled={
                        lambdaEditorState.val.state.state
                          .isConvertingTransformLambdaObjects
                      }
                      lambdaEditorState={lambdaEditorState}
                      forceBackdrop={Boolean(lambdaEditorState.parserError)}
                    />
                  </div>
                </div>
                <button
                  className="access-point-editor__generic-entry__remove-btn__debug"
                  onClick={() => {
                    debugPlanGeneration().catch(
                      editorStore.applicationStore.alertUnhandledError,
                    );
                  }}
                  tabIndex={-1}
                  title="AP Plan Generation"
                >
                  <BugIcon />
                </button>
              </div>
            </div>
          </div>
          <button
            className="access-point-editor__generic-entry__remove-btn"
            onClick={() => {
              handleRemoveAccessPoint();
            }}
            tabIndex={-1}
            title="Remove"
          >
            <TimesIcon />
          </button>
          {accessPointState.showDebug && (
            <AccessPointGenerationViewer
              accessPointState={accessPointState}
              generationOutput={debugOutput}
            />
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);

const DataProductDeploymentResponseModal = observer(
  (props: { state: DataProductEditorState }) => {
    const { state } = props;
    const applicationStore = state.editorStore.applicationStore;
    const closeModal = (): void => state.setDeployResponse(undefined);
    return (
      <Dialog
        open={Boolean(state.deployResponse)}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        onClose={closeModal}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader>
            <ModalTitle title="Data Product Deployment Response" />
          </ModalHeader>
          <ModalBody>
            <PanelContent>
              <CodeEditor
                inputValue={JSON.stringify(
                  state.deployResponse?.content ?? {},
                  null,
                  2,
                )}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.JSON}
              />
            </PanelContent>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const AccessPointGroupPublicToggle = observer(
  (props: { groupState: AccessPointGroupState }) => {
    const { groupState } = props;

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      if (isChecked && groupState.publicStereotype) {
        annotatedElement_addStereotype(
          groupState.value,
          StereotypeExplicitReference.create(groupState.publicStereotype),
        );
      } else if (groupState.containsPublicStereotype) {
        annotatedElement_deleteStereotype(
          groupState.value,
          groupState.containsPublicStereotype,
        );
      }
    };
    return (
      <div className="access-point-editor__toggle">
        <Switch
          checked={Boolean(groupState.containsPublicStereotype)}
          onChange={handleSwitchChange}
          sx={{
            '& .MuiSwitch-track': {
              backgroundColor: groupState.containsPublicStereotype
                ? 'default'
                : 'var(--color-light-grey-400)',
            },
          }}
        />
        <BuildingIcon />
        Enterprise Data. Anyone at the firm can access this without approvals.
      </div>
    );
  },
);

const AccessPointGroupEditor = observer(
  (props: { groupState: AccessPointGroupState; isReadOnly: boolean }) => {
    const { groupState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const productEditorState = groupState.state;
    const [editingDescription, setEditingDescription] = useState(false);
    const [isHoveringDescription, setIsHoveringDescription] = useState(false);
    const [editingName, setEditingName] = useState(
      groupState.value.id === newNamePlaceholder,
    );
    const [isHoveringName, setIsHoveringName] = useState(false);

    const handleDescriptionEdit = () => setEditingDescription(true);
    const handleDescriptionBlur = () => {
      setEditingDescription(false);
      setIsHoveringDescription(false);
    };
    const handleMouseOverDescription: React.MouseEventHandler<
      HTMLDivElement
    > = () => {
      setIsHoveringDescription(true);
    };
    const handleMouseOutDescription: React.MouseEventHandler<
      HTMLDivElement
    > = () => {
      setIsHoveringDescription(false);
    };
    const updateGroupDescription = (val: string): void => {
      accessPointGroup_setDescription(groupState.value, val);
    };

    const handleNameEdit = () => setEditingName(true);
    const handleNameBlur = () => {
      if (groupState.value.id !== newNamePlaceholder) {
        setEditingName(false);
        setIsHoveringName(false);
      }
    };
    const handleMouseOverName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(true);
    };
    const handleMouseOutName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(false);
    };
    const updateGroupName = (val: string): void => {
      if (val.match(/^[0-9a-zA-Z_]+$/)) {
        accessPointGroup_setName(groupState.value, val);
      }
    };

    const handleRemoveAccessPointGroup = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: `Are you sure you want to delete Access Point Group ${groupState.value.id} and all of its Access Points?`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              productEditorState.deleteAccessPointGroup(groupState);
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

    const handleAddAccessPoint = () => {
      productEditorState.addAccessPoint(
        newNamePlaceholder,
        undefined,
        productEditorState.selectedGroupState ?? groupState,
      );
    };

    return (
      <div
        className="access-point-editor__group-container"
        data-testid={LEGEND_STUDIO_TEST_ID.ACCESS_POINT_GROUP_EDITOR}
      >
        <div className="access-point-editor__group-container__title-editor">
          {editingName ? (
            <textarea
              className="panel__content__form__section__input"
              spellCheck={false}
              value={groupState.value.id}
              onChange={(event) => updateGroupName(event.target.value)}
              placeholder="Access Point Group Name"
              onBlur={handleNameBlur}
              style={{
                overflow: 'hidden',
                resize: 'none',
                padding: '0.25rem',
                borderColor:
                  groupState.value.id === newNamePlaceholder
                    ? 'var(--color-red-300)'
                    : 'transparent',
                borderWidth: 'thin',
              }}
            />
          ) : (
            <div
              onClick={handleNameEdit}
              title="Click to edit group name"
              className="access-point-editor__group-container__title"
            >
              <HoverTextArea
                text={groupState.value.id}
                handleMouseOver={handleMouseOverName}
                handleMouseOut={handleMouseOutName}
                className="access-point-editor__group-container__title"
              />

              {isHoveringName && hoverIcon()}
            </div>
          )}
          <button
            className="access-point-editor__generic-entry__remove-btn--group"
            onClick={() => {
              handleRemoveAccessPointGroup();
            }}
            tabIndex={-1}
            title="Remove Access Point Group"
          >
            <TimesIcon />
          </button>
        </div>
        <div className="access-point-editor__group-container__description-editor">
          {editingDescription ? (
            <textarea
              className="panel__content__form__section__input"
              spellCheck={false}
              value={groupState.value.description ?? ''}
              onChange={(event) => updateGroupDescription(event.target.value)}
              placeholder="Provide a description for this Access Point Group"
              onBlur={handleDescriptionBlur}
              style={{
                overflow: 'hidden',
                padding: '0.25rem',
                height: 'auto',
              }}
            />
          ) : (
            <div
              onClick={handleDescriptionEdit}
              title="Click to edit group description"
              className="access-point-editor__description-container"
            >
              {groupState.value.description ? (
                <HoverTextArea
                  text={groupState.value.description}
                  handleMouseOver={handleMouseOverDescription}
                  handleMouseOut={handleMouseOutDescription}
                  className="access-point-editor__group-container__description"
                />
              ) : (
                <div
                  className="access-point-editor__group-container__description--warning"
                  onMouseOver={handleMouseOverDescription}
                  onMouseOut={handleMouseOutDescription}
                >
                  <WarningIcon />
                  Users request access at the access point group level. Click
                  here to add a meaningful description to guide users.
                </div>
              )}
              {isHoveringDescription && hoverIcon()}
            </div>
          )}
        </div>
        {editorStore.applicationStore.config.options.dataProductConfig && (
          <AccessPointGroupPublicToggle groupState={groupState} />
        )}
        <PanelHeader className="panel__header--access-point">
          <div className="panel__header__title">Access Points</div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={handleAddAccessPoint}
              disabled={isReadOnly}
              title="Create new access point"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        {groupState.accessPointStates.length === 0 && (
          <div
            className="access-point-editor__group-container__description--warning"
            style={{ color: 'var(--color-red-300)' }}
          >
            <WarningIcon />
            This group needs at least one access point defined.
          </div>
        )}
        <div style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
          {groupState.accessPointStates
            .filter(filterByType(LakehouseAccessPointState))
            .map((apState) => (
              <LakehouseDataProductAcccessPointEditor
                key={apState.uuid}
                isReadOnly={isReadOnly}
                accessPointState={apState}
              />
            ))}
        </div>
      </div>
    );
  },
);

const GroupTabRenderer = observer(
  (props: {
    group: AccessPointGroupState;
    dataProductEditorState: DataProductEditorState;
  }) => {
    const { group, dataProductEditorState } = props;
    const changeGroup = (newGroup: AccessPointGroupState): void => {
      dataProductEditorState.setSelectedGroupState(newGroup);
    };
    const selectedGroupState = dataProductEditorState.selectedGroupState;
    const ref = useRef<HTMLDivElement>(null);

    const groupError = (): boolean => {
      return (
        group.accessPointStates.length === 0 ||
        group.value.id === newNamePlaceholder ||
        Boolean(
          group.accessPointStates.find(
            (apState) => apState.accessPoint.id === newNamePlaceholder,
          ),
        )
      );
    };

    //Drag and Drop - reorder groups and accept access points from other groups
    const handleHover = useCallback(
      (item: APGDragSource): void => {
        const draggingProperty = item.groupState;
        const hoveredProperty = group;
        dataProductEditorState.swapAccessPointGroups(
          draggingProperty,
          hoveredProperty,
        );
      },
      [group, dataProductEditorState],
    );

    const [{ isOver }, dropConnector] = useDrop<
      APGDragSource | AccessPointDragSource,
      void,
      {
        isOver: boolean;
      }
    >(
      () => ({
        accept: [AP_GROUP_DND_TYPE, AP_DND_TYPE],
        hover: (item, monitor) => {
          const itemType = monitor.getItemType();
          if (itemType === AP_GROUP_DND_TYPE) {
            const groupItem = item as APGDragSource;
            handleHover(groupItem);
          }
        },
        drop: (item, monitor) => {
          const itemType = monitor.getItemType();
          if (itemType === AP_DND_TYPE) {
            const accessPointItem = item as AccessPointDragSource;
            group.addAccessPoint(accessPointItem.accessPointState);
            accessPointItem.accessPointState.state.deleteAccessPoint(
              accessPointItem.accessPointState,
            );
            accessPointItem.accessPointState.changeGroupState(group);
          }
        },
        collect: (monitor) => ({
          isBeingDraggedAPG:
            monitor.getItemType() === AP_GROUP_DND_TYPE
              ? monitor.getItem<APGDragSource | null>()?.groupState
              : undefined,
          isBeingDraggedAP:
            monitor.getItemType() === AP_DND_TYPE
              ? monitor.getItem<AccessPointDragSource | null>()
                  ?.accessPointState
              : undefined,
          isOver: monitor.isOver(),
        }),
      }),
      [handleHover],
    );

    const [, dragConnector, dragPreviewConnector] = useDrag<APGDragSource>(
      () => ({
        type: AP_GROUP_DND_TYPE,
        item: () => ({
          groupState: group,
        }),
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [group],
    );
    dragConnector(ref);
    dropConnector(ref);
    dragPreviewConnector(ref);

    return (
      <div
        ref={ref}
        key={group.uuid}
        onClick={(): void => changeGroup(group)}
        className={clsx('service-editor__tab', {
          'service-editor__tab--active': group === selectedGroupState,
        })}
        style={{
          backgroundColor: isOver
            ? 'var(--color-dark-grey-100)'
            : 'var(--color-dark-grey-50)',
        }}
      >
        {group.value.id}
        &nbsp;
        {groupError() && (
          <ErrorWarnIcon
            title="Resolve Access Point Group error(s)"
            style={{ color: 'var(--color-red-300)' }}
          />
        )}
      </div>
    );
  },
);

const AccessPointGroupTab = observer(
  (props: {
    dataProductEditorState: DataProductEditorState;
    isReadOnly: boolean;
  }) => {
    const { dataProductEditorState, isReadOnly } = props;
    const groupStates = dataProductEditorState.accessPointGroupStates;
    const selectedGroupState = dataProductEditorState.selectedGroupState;
    const handleAddAccessPointGroup = () => {
      const newGroup =
        dataProductEditorState.createGroupAndAdd(newNamePlaceholder);
      dataProductEditorState.setSelectedGroupState(newGroup);
    };

    const AccessPointDragPreviewLayer: React.FC = () => (
      <DragPreviewLayer
        labelGetter={(item: AccessPointDragSource): string => {
          return item.accessPointState.accessPoint.id;
        }}
        types={[AP_DND_TYPE]}
      />
    );

    const disableAddGroup = Boolean(
      dataProductEditorState.accessPointGroupStates.find(
        (group) => group.value.id === newNamePlaceholder,
      ),
    );

    return (
      <div className="panel" style={{ overflow: 'visible' }}>
        <AccessPointDragPreviewLayer />
        <div
          className="panel__content__form__section__header__label"
          style={{ paddingLeft: '1rem' }}
        >
          Access Point Groups
        </div>
        <PanelHeader>
          <div className="uml-element-editor__tabs">
            {groupStates.map((group) => {
              return (
                <GroupTabRenderer
                  key={group.uuid}
                  group={group}
                  dataProductEditorState={dataProductEditorState}
                />
              );
            })}
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={handleAddAccessPointGroup}
              disabled={isReadOnly || disableAddGroup}
              title={
                disableAddGroup
                  ? 'Provide all group names'
                  : 'Create new access point group'
              }
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </div>

          <PanelHeaderActions></PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          {selectedGroupState && (
            <AccessPointGroupEditor
              key={selectedGroupState.uuid}
              groupState={selectedGroupState}
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
        {dataProductEditorState.deployResponse && (
          <DataProductDeploymentResponseModal state={dataProductEditorState} />
        )}
      </div>
    );
  },
);

const DataProductSidebar = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState } = props;
    const sidebarTabs = [
      {
        label: DATA_PRODUCT_TAB.HOME,
        icon: <HomeIcon />,
      },
      {
        label: DATA_PRODUCT_TAB.APG,
        title: 'Access Point Groups',
        icon: <GroupWorkIcon />,
      },
      {
        label: DATA_PRODUCT_TAB.SUPPORT,
        icon: <QuestionCircleIcon />,
      },
    ];
    return (
      <div
        className="data-space__viewer__activity-bar"
        style={{ position: 'static', maxHeight: '100%' }}
      >
        <div className="data-space__viewer__activity-bar__items">
          {sidebarTabs.map((activity) => (
            <button
              key={activity.label}
              className={clsx('data-space__viewer__activity-bar__item', {
                'data-space__viewer__activity-bar__item--active':
                  dataProductEditorState.selectedTab === activity.label,
              })}
              onClick={() =>
                dataProductEditorState.setSelectedTab(activity.label)
              }
              tabIndex={-1}
              title={activity.title ?? activity.label}
              style={{
                flexDirection: 'column',
                fontSize: '12px',
                margin: '1rem 0rem',
              }}
            >
              {activity.icon}
              {activity.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
);

const HomeTab = observer(
  (props: { product: DataProduct; isReadOnly: boolean }) => {
    const { product, isReadOnly } = props;
    const updateDataProductTitle = (val: string | undefined): void => {
      dataProduct_setTitle(product, val ?? '');
    };
    const updateDataProductDescription: ChangeEventHandler<
      HTMLTextAreaElement
    > = (event) => {
      dataProduct_setDescription(product, event.target.value);
    };
    const [showPreview, setshowPreview] = useState(false);
    return (
      <div className="panel__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel>
            <PanelFormTextField
              name="Title"
              value={product.title}
              prompt="Provide a descriptive name for the Data Product to appear in Marketplace."
              update={updateDataProductTitle}
              placeholder="Enter title"
            />
            <div style={{ margin: '1rem' }}>
              <div
                className="panel__content__form__section__header__label"
                style={{ justifyContent: 'space-between', width: '45rem' }}
              >
                Description
                <button
                  className="btn__dropdown-combo__label"
                  onClick={() => setshowPreview(!showPreview)}
                  title={showPreview ? 'Hide Preview' : 'Preview Description'}
                  tabIndex={-1}
                  style={{
                    width: '12rem',
                    justifyContent: 'center',
                  }}
                >
                  {showPreview ? (
                    <>
                      <CloseEyeIcon className="btn__dropdown-combo__label__icon" />
                      <div className="btn__dropdown-combo__label__title">
                        Hide Preview
                      </div>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="btn__dropdown-combo__label__icon" />
                      <div className="btn__dropdown-combo__label__title">
                        Preview
                      </div>
                    </>
                  )}
                </button>
              </div>

              <div
                className="panel__content__form__section__header__prompt"
                style={{
                  color:
                    product.description === '' ||
                    product.description === undefined
                      ? 'var(--color-red-300)'
                      : 'var(--color-light-grey-400)',
                  width: '45rem',
                }}
              >
                Clearly describe the purpose, content, and intended use of the
                Data Product. Markdown is supported.
              </div>
              <textarea
                className="panel__content__form__section__textarea"
                spellCheck={false}
                disabled={isReadOnly}
                value={product.description}
                onChange={updateDataProductDescription}
                style={{
                  padding: '0.5rem',
                  width: '45rem',
                  height: '10rem',
                  borderColor:
                    product.description === '' ||
                    product.description === undefined
                      ? 'var(--color-red-300)'
                      : 'transparent',
                  resize: 'vertical',
                  maxHeight: '100%',
                  maxWidth: '100%',
                }}
              />
            </div>
          </ResizablePanel>
          {showPreview && <ResizablePanelSplitter />}
          {showPreview && (
            <ResizablePanel>
              <div className="text-element-editor__preview">
                <MarkdownTextViewer
                  value={{ value: product.description ?? '' }}
                  className="text-element-editor__preview__markdown"
                />
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    );
  },
);

const SupportTab = observer(
  (props: { product: DataProduct; isReadOnly: boolean }) => {
    const { product, isReadOnly } = props;
    const updateSupportInfoDocumentationUrl = (
      val: string | undefined,
    ): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setDocumentationUrl(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoWebsite = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setWebsite(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoFaqUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setFaqUrl(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoSupportUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setSupportUrl(product.supportInfo, val ?? '');
      }
    };

    const handleSupportInfoEmailAdd = (
      address: string,
      title: string,
    ): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_addEmail(product.supportInfo, new Email(address, title));
      }
    };

    const handleSupportInfoEmailRemove = (email: Email): void => {
      if (product.supportInfo) {
        supportInfo_deleteEmail(product.supportInfo, email);
      }
    };

    const SupportEmailComponent = observer(
      (supportEmailProps: { item: Email }): React.ReactElement => {
        const { item } = supportEmailProps;

        return (
          <div className="panel__content__form__section__list__item__rows">
            <div className="row">
              <label className="label">Address</label>
              <div className="textbox">{item.address}</div>
            </div>
            <div className="row">
              <label className="label">Title</label>
              <div className="textbox">{item.title}</div>
            </div>
          </div>
        );
      },
    );

    const NewSupportEmailComponent = observer(
      (newSupportEmailProps: { onFinishEditing: () => void }) => {
        const { onFinishEditing } = newSupportEmailProps;
        const [address, setAddress] = useState('');
        const [title, setTitle] = useState('');

        return (
          <div className="data-product-editor__support-info__new-email">
            <div className="panel__content__form__section__list__new-item__input">
              <input
                className="input input-group__input panel__content__form__section__input input--dark"
                type="email"
                placeholder="Enter email"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                }}
              />
            </div>
            <div className="panel__content__form__section__list__new-item__input">
              <input
                className="input input-group__input panel__content__form__section__input input--dark"
                type="title"
                placeholder="Enter title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </div>
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={() => {
                handleSupportInfoEmailAdd(address, title);
                setAddress('');
                setTitle('');
                onFinishEditing();
              }}
            >
              Save
            </button>
          </div>
        );
      },
    );

    return (
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          Support Information
        </div>
        <div className="panel__content__form__section__header__prompt">
          Configure support information for this Lakehouse Data Product.
        </div>
        <PanelFormTextField
          name="Documentation URL"
          value={product.supportInfo?.documentation?.url ?? ''}
          update={updateSupportInfoDocumentationUrl}
          placeholder="Enter Documentation URL"
        />
        <PanelFormTextField
          name="Website"
          value={product.supportInfo?.website?.url ?? ''}
          update={updateSupportInfoWebsite}
          placeholder="Enter Website"
        />
        <PanelFormTextField
          name="FAQ URL"
          value={product.supportInfo?.faqUrl?.url}
          update={updateSupportInfoFaqUrl}
          placeholder="Enter FAQ URL"
        />
        <PanelFormTextField
          name="Support URL"
          value={product.supportInfo?.supportUrl?.url ?? ''}
          update={updateSupportInfoSupportUrl}
          placeholder="Enter Support URL"
        />
        <ListEditor
          title="Emails"
          items={product.supportInfo?.emails}
          keySelector={(email: Email) => email.address + email.title}
          ItemComponent={SupportEmailComponent}
          NewItemComponent={NewSupportEmailComponent}
          handleRemoveItem={handleSupportInfoEmailRemove}
          isReadOnly={isReadOnly}
          emptyMessage="No emails specified"
        />
      </PanelFormSection>
    );
  },
);

export const DataProductEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataProductEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataProductEditorState);
  const product = dataProductEditorState.product;
  const isReadOnly = dataProductEditorState.isReadOnly;
  const auth = useAuth();

  const deployDataProduct = (): void => {
    // Trigger OAuth flow if not authenticated
    if (!auth.isAuthenticated) {
      // remove this redirect if we move to do oauth at the beginning of opening studio
      auth
        .signinRedirect({
          state: generateUrlToDeployOnOpen(dataProductEditorState),
        })
        .catch(editorStore.applicationStore.alertUnhandledError);
      return;
    }
    // Use the token for deployment
    const token = auth.user?.access_token;
    if (token) {
      flowResult(dataProductEditorState.deploy(token)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    } else {
      editorStore.applicationStore.notificationService.notifyError(
        'Authentication failed. No token available.',
      );
    }
  };

  const selectedActivity = dataProductEditorState.selectedTab;
  const renderActivivtyBarTab = (): React.ReactNode => {
    switch (selectedActivity) {
      case DATA_PRODUCT_TAB.HOME:
        return <HomeTab product={product} isReadOnly={isReadOnly} />;
      case DATA_PRODUCT_TAB.SUPPORT:
        return <SupportTab product={product} isReadOnly={isReadOnly} />;
      case DATA_PRODUCT_TAB.APG:
        return (
          <AccessPointGroupTab
            dataProductEditorState={dataProductEditorState}
            isReadOnly={isReadOnly}
          />
        );
      default:
        return null;
    }
  };

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_PRODUCT_EDITOR,
  );

  useEffect(() => {
    flowResult(dataProductEditorState.convertAccessPointsFuncObjects()).catch(
      dataProductEditorState.editorStore.applicationStore.alertUnhandledError,
    );
  }, [dataProductEditorState]);

  useEffect(() => {
    if (dataProductEditorState.deployOnOpen) {
      flowResult(dataProductEditorState.deploy(auth.user?.access_token)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }
  }, [
    auth,
    editorStore.applicationStore.alertUnhandledError,
    dataProductEditorState,
  ]);

  return (
    <div className="data-product-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">data product</div>
          </div>
          <PanelHeaderActions>
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={deployDataProduct}
                title={dataProductEditorState.deployValidationMessage}
                tabIndex={-1}
                disabled={!dataProductEditorState.deployValidationMessage}
              >
                <RocketIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">Deploy</div>
              </button>
            </div>
          </PanelHeaderActions>
        </div>

        <div
          className="panel"
          style={{ padding: '1rem', flexDirection: 'row' }}
        >
          <DataProductSidebar dataProductEditorState={dataProductEditorState} />

          {renderActivivtyBarTab()}
        </div>
      </div>
    </div>
  );
});
