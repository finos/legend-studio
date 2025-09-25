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
  ModelAccessPointGroupState,
} from '../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  BugIcon,
  BuildingIcon,
  CaretDownIcon,
  Checkbox,
  CloseEyeIcon,
  clsx,
  compressImage,
  ControlledDropdownMenu,
  CustomSelectorInput,
  Dialog,
  DragPreviewLayer,
  ErrorWarnIcon,
  EyeIcon,
  GroupWorkIcon,
  HomeIcon,
  IconSelectorGrid,
  IconSelectorIcons,
  InfoCircleIcon,
  ListEditor,
  LockIcon,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  PanelContent,
  PanelDnDEntry,
  PanelEntryDragHandle,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PencilEditIcon,
  PlusIcon,
  QuestionCircleIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  RocketIcon,
  Switch,
  TimesIcon,
  Tooltip,
  UploadIcon,
  useDragPreviewLayer,
  WarningIcon,
  LongArrowRightIcon,
  PURE_MappingIcon,
  GitBranchIcon,
  ListIcon,
} from '@finos/legend-art';
import {
  type ChangeEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { filterByType, guaranteeType } from '@finos/legend-shared';
import { InlineLambdaEditor, LineageViewer } from '@finos/legend-query-builder';
import { action, flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  type DataProduct,
  type LakehouseAccessPoint,
  type V1_DataProductArtifactAccessPointGroup,
  type V1_DataProductArtifactAccessPointImplementation,
  type V1_DataProductArtifactGeneration,
  type Mapping,
  type PackageableRuntime,
  type DataProductRuntimeInfo,
  type PackageableElement,
  type DataProductElementScope,
  type DataProductElement,
  DataProductEmbeddedImageIcon,
  DataProductLibraryIcon,
  Email,
  LakehouseTargetEnv,
  StereotypeExplicitReference,
  V1_DataProductIconLibraryId,
  validate_PureExecutionMapping,
  V1_PureGraphManager,
  V1_RemoteEngine,
  V1_DataProduct,
} from '@finos/legend-graph';
import {
  accessPoint_setClassification,
  accessPoint_setReproducible,
  accessPointGroup_setDescription,
  accessPointGroup_setName,
  dataProduct_setDescription,
  dataProduct_setIcon,
  dataProduct_setSupportInfoIfAbsent,
  dataProduct_setTitle,
  supportInfo_addEmail,
  supportInfo_deleteEmail,
  supportInfo_setDocumentationUrl,
  supportInfo_setFaqUrl,
  supportInfo_setLinkLabel,
  runtimeInfo_setId,
  runtimeInfo_setDescription,
  supportInfo_setSupportUrl,
  supportInfo_setWebsite,
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
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  DataProductViewerState,
  ProductViewer,
} from '@finos/legend-extension-dsl-data-product';

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

export const LakehouseDataProductAccessPointEditor = observer(
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
    const generateLineage = editorStore.applicationStore.guardUnhandledError(
      () => flowResult(accessPointState.generateLineage()),
    );
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
                <ControlledDropdownMenu
                  className="access-point-editor__dropdown"
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={() => {
                          debugPlanGeneration().catch(
                            editorStore.applicationStore.alertUnhandledError,
                          );
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                          }}
                        >
                          <BugIcon /> <span>AP Plan Generation</span>
                        </div>
                      </MenuContentItem>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={generateLineage}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              transform: 'rotate(90deg)',
                            }}
                          >
                            <GitBranchIcon />
                          </span>
                          <span>Lineage Viewer</span>
                        </div>
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                  }}
                >
                  <div
                    className="access-point-editor__generic-entry__remove-btn__debug"
                    tabIndex={-1}
                    title="Access Point Tools"
                    style={{
                      background: 'var(--color-blue-200)',
                      borderRadius: '4px',
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ListIcon />
                  </div>
                </ControlledDropdownMenu>
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
              </div>
            </div>
            {<LineageViewer lineageState={accessPointState.lineageState} />}
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

export const CompatibleRuntimesEditor = observer(
  (props: { groupState: ModelAccessPointGroupState }) => {
    const { groupState } = props;
    const group = groupState.value;

    const handleSelectRuntime = (runtime: DataProductRuntimeInfo) => {
      groupState.setDefaultRuntime(runtime);
    };

    // Event handlers
    const handleAddRuntime = (option: {
      label: string;
      value: PackageableRuntime;
    }): void => {
      if (typeof option.value === 'object') {
        groupState.addCompatibleRuntime(option.value);
      }
    };

    const handleRemoveRuntime = (runtime: DataProductRuntimeInfo): void => {
      groupState.removeCompatibleRuntime(runtime);
    };

    const handleRuntimeTitleChange = (
      runtimeInfo: DataProductRuntimeInfo,
      value: string | undefined,
    ): void => {
      runtimeInfo_setId(runtimeInfo, value ?? '');
    };

    const handleRuntimeDescriptionChange = (
      runtimeInfo: DataProductRuntimeInfo,
      value: string | undefined,
    ): void => {
      runtimeInfo_setDescription(runtimeInfo, value);
    };

    // ListEditor component renderers
    const RuntimeComponent = observer(
      (runtimeComponentProps: {
        item: DataProductRuntimeInfo;
      }): React.ReactElement => {
        const { item } = runtimeComponentProps;

        return (
          <>
            <div className="panel__content__form__section__list__item__content">
              <div className="panel__content__form__section__header__label">
                Default?
              </div>
              <input
                type="radio"
                name="defaultRuntimeRadio"
                value={item.id}
                checked={group.defaultRuntime === item}
                onChange={() => handleSelectRuntime(item)}
              />
            </div>
            <div className="panel__content__form__section__list__item__content">
              <div className="panel__content__form__section__header__label">
                Runtime
              </div>
              <div className="panel__content__form__section__list__item__content__title">
                {item.runtime.value.path}
              </div>
            </div>
            <div className="panel__content__form__section__list__item__form">
              <PanelFormTextField
                name="Title"
                value={item.id}
                update={(value) => handleRuntimeTitleChange(item, value)}
                placeholder="Enter title"
                className="dataSpace-editor__general__diagrams__title"
              />
              <PanelFormTextField
                name="Description"
                value={item.description ?? ''}
                update={(value) => handleRuntimeDescriptionChange(item, value)}
                placeholder="Enter description"
                className="dataSpace-editor__general__diagrams__description"
              />
            </div>
          </>
        );
      },
    );

    const NewRuntimeComponent = observer(
      (newRuntimeProps: {
        onFinishEditing: () => void;
      }): React.ReactElement => {
        const { onFinishEditing } = newRuntimeProps;

        return (
          <div className="panel__content__form__section__list__new-item__input">
            <CustomSelectorInput
              options={groupState.getCompatibleRuntimeOptions()}
              onChange={(event: {
                label: string;
                value: PackageableRuntime;
              }) => {
                onFinishEditing();
                handleAddRuntime(event);
              }}
              placeholder="Select a runtime to add..."
              darkMode={true}
            />
          </div>
        );
      },
    );

    return (
      <ListEditor
        title="Compatible Runtimes"
        prompt="Add compatible runtimes to include in this Data Product. Set a title and description for each runtime."
        items={group.compatibleRuntimes}
        keySelector={(element: DataProductRuntimeInfo) =>
          element.runtime.value.path
        }
        ItemComponent={RuntimeComponent}
        NewItemComponent={NewRuntimeComponent}
        handleRemoveItem={handleRemoveRuntime}
        isReadOnly={groupState.state.isReadOnly}
        emptyMessage="No runtimes specified"
        emptyClassName="data-product-editor__empty-runtime"
      />
    );
  },
);

export const FeaturedElementsEditor = observer(
  (props: { groupState: ModelAccessPointGroupState; isReadOnly: boolean }) => {
    const { groupState, isReadOnly } = props;
    const group = groupState.value;

    // Event handlers
    const handleAddElement = (option: {
      label: string;
      value: DataProductElement;
    }): void => {
      if (typeof option.value === 'object') {
        groupState.addFeaturedElement(option.value);
      }
    };

    const handleRemoveElement = (element: DataProductElementScope): void => {
      groupState.removeFeaturedElement(element);
    };

    const handleElementExcludeChange = (
      element: DataProductElementScope,
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      groupState.excludeFeaturedElement(element, event.target.checked);
    };

    // ListEditor component renderers
    const ElementComponent = observer(
      (elementComponentProps: {
        item: DataProductElementScope;
      }): React.ReactElement => {
        const { item } = elementComponentProps;

        return (
          <div className="data-product-editor__element-item">
            <div className="panel__content__form__section__list__item__content__label">
              {item.element.value.path}
            </div>
            <div className="panel__content__form__section__list__item__content__actions">
              <div className="panel__content__form__section__list__item__content__actions-exclude">
                <Checkbox
                  disabled={isReadOnly}
                  checked={item.exclude ?? false}
                  onChange={(event) => handleElementExcludeChange(item, event)}
                  size="small"
                  className="panel__content__form__section__list__item__content__actions-exclude__btn"
                />
                <span className="panel__content__form__section__list__item__content__actions__label">
                  Exclude
                </span>
              </div>
            </div>
          </div>
        );
      },
    );

    const NewElementComponent = observer(
      (newElementProps: { onFinishEditing: () => void }) => {
        const { onFinishEditing } = newElementProps;

        return (
          <div className="panel__content__form__section__list__new-item__input">
            <CustomSelectorInput
              options={groupState.getFeaturedElementOptions()}
              onChange={(event: {
                label: string;
                value: DataProductElement;
              }) => {
                onFinishEditing();
                handleAddElement(event);
              }}
              placeholder="Select an element to add..."
              darkMode={true}
            />
          </div>
        );
      },
    );

    return (
      <ListEditor
        title="Featured Elements"
        prompt="Add classes and associations to display under Models Documentation. Use the exclude checkbox to exclude certain elements from this Data Product entirely."
        items={group.featuredElements}
        keySelector={(element: DataProductElementScope) =>
          element.element.value.path
        }
        ItemComponent={ElementComponent}
        NewItemComponent={NewElementComponent}
        handleRemoveItem={handleRemoveElement}
        isReadOnly={isReadOnly}
        emptyMessage="No elements specified"
      />
    );
  },
);

const ModelAccessPointGroupEditor = observer(
  (props: { groupState: ModelAccessPointGroupState; isReadOnly: boolean }) => {
    const { groupState, isReadOnly } = props;
    const editorStore = useEditorStore();

    // mapping
    const mapping = groupState.value.mapping;
    const isMappingEmpty = validate_PureExecutionMapping(
      groupState.value.mapping.value,
    );
    const mappingOptions =
      groupState.state.editorStore.graphManagerState.usableMappings.map(
        buildElementOption,
      );
    const selectedMappingOption = {
      value: mapping.value,
      label: mapping.value.path === '' ? '(none)' : mapping.value.path,
    } as PackageableElementOption<Mapping>;
    const onMappingChange = (val: PackageableElementOption<Mapping>): void => {
      if (val.value !== mapping.value) {
        groupState.setMapping(val.value);
      }
    };

    const visitElement = (element: PackageableElement): void => {
      editorStore.graphEditorMode.openElement(element);
    };

    return (
      <div className="data-product-editor__model-apg-editor">
        <div className="data-product-editor__model-apg-editor__label">
          Mapping
        </div>
        <div
          className="service-execution-editor__configuration__item"
          style={{ padding: '0 1rem' }}
        >
          <div className="btn--sm service-execution-editor__configuration__item__label">
            <PURE_MappingIcon />
          </div>
          <CustomSelectorInput
            className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
            disabled={isReadOnly}
            options={mappingOptions}
            onChange={onMappingChange}
            value={selectedMappingOption}
            darkMode={
              !groupState.state.editorStore.applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            hasError={Boolean(isMappingEmpty)}
          />
          <button
            className="btn--dark btn--sm service-execution-editor__configuration__item__btn"
            onClick={() => {
              visitElement(groupState.value.mapping.value);
            }}
            tabIndex={-1}
            title="See mapping"
            disabled={Boolean(isMappingEmpty)}
          >
            <LongArrowRightIcon />
          </button>
        </div>
        <CompatibleRuntimesEditor groupState={groupState} />
        <FeaturedElementsEditor
          groupState={groupState}
          isReadOnly={isReadOnly}
        />
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
          {!groupState.state.modelledDataProduct && (
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
          )}
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
        {groupState instanceof ModelAccessPointGroupState && (
          <ModelAccessPointGroupEditor
            groupState={groupState}
            isReadOnly={isReadOnly}
          />
        )}
        <PanelHeader className="panel__header--access-point">
          <div className="panel__header__title">Access Points</div>
          <PanelHeaderActions>
            {/* TODO: remove disabling this button for MAPG when Function Access Points are ready */}
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={handleAddAccessPoint}
              disabled={isReadOnly || productEditorState.modelledDataProduct}
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
              <LakehouseDataProductAccessPointEditor
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
        role="tab"
      >
        {group.value.id}
        &nbsp;
        {group.hasErrors() && (
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
            {!dataProductEditorState.modelledDataProduct && (
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
            )}
          </div>
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

const IconPreviewComponent = observer((props: { dataProduct: DataProduct }) => {
  const { dataProduct } = props;

  if (dataProduct.icon instanceof DataProductLibraryIcon) {
    const iconId = dataProduct.icon.iconId;
    const IconComponent = IconSelectorIcons[iconId];
    return (
      <div className="data-product-editor__icon-preview">
        {IconComponent ? <IconComponent /> : 'No icon selected'}
      </div>
    );
  } else if (dataProduct.icon instanceof DataProductEmbeddedImageIcon) {
    return (
      <img
        src={dataProduct.icon.imageUrl}
        alt="Data Product Image"
        className="data-product-editor__icon-preview__image"
      />
    );
  }
  return (
    <div className="data-product-editor__icon-preview">
      <div className="data-product-editor__icon-preview__no-icon">
        No icon selected
      </div>
    </div>
  );
});

const IconSelectorComponent = observer(
  (props: { dataProduct: DataProduct; isReadOnly: boolean }) => {
    const { dataProduct, isReadOnly } = props;

    const handleChange = (iconId: string | undefined): void => {
      if (iconId === undefined) {
        dataProduct_setIcon(dataProduct, undefined);
      } else {
        const _dataProductLibraryIcon = new DataProductLibraryIcon(
          V1_DataProductIconLibraryId.REACT_ICONS,
          iconId,
        );
        dataProduct_setIcon(dataProduct, _dataProductLibraryIcon);
      }
    };

    return (
      <IconSelectorGrid
        iconId={
          dataProduct.icon instanceof DataProductLibraryIcon
            ? dataProduct.icon.iconId
            : undefined
        }
        onChange={handleChange}
        isReadOnly={isReadOnly}
        disableHighlightNoneOption={
          dataProduct.icon instanceof DataProductEmbeddedImageIcon
        }
      />
    );
  },
);

const ImageSelectorComponent = observer(
  (props: { dataProduct: DataProduct; isReadOnly: boolean }) => {
    const { dataProduct, isReadOnly } = props;

    const editorStore = useEditorStore();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const imageConfig =
      editorStore.applicationStore.config.options.dataProductConfig
        ?.imageConfig;

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file = event.target.files?.[0];
      if (file) {
        try {
          // Check file size first
          const fileSizeKB = file.size / 1024;
          if (fileSizeKB > (imageConfig?.maxUploadSizeKB ?? 1024 * 5)) {
            // 5MB limit by default
            editorStore.applicationStore.notificationService.notifyError(
              `File size must be less than ${imageConfig?.maxUploadSizeKB ?? 1024 * 5}KB`,
            );
            return;
          }

          const compressedImage = await compressImage(
            file,
            imageConfig?.maxSizeKB ?? 128,
            imageConfig?.maxDimension ?? 800,
          );
          const dataProductEmbeddedImageIcon = new DataProductEmbeddedImageIcon(
            compressedImage,
          );
          dataProduct_setIcon(dataProduct, dataProductEmbeddedImageIcon);
        } catch {
          editorStore.applicationStore.notificationService.notifyError(
            'Failed to process image. Please try a different file.',
          );
        }
      }
    };

    return (
      <div>
        <div className="panel__content__form__section__header__prompt">
          Upload an image to represent this Data Product in the marketplace.
        </div>
        <div className="data-product-editor__image-selector__container">
          <input
            id="data-product-image-upload"
            name="data-product-image-upload"
            type="file"
            accept="image/*"
            disabled={isReadOnly}
            onChange={(event) => {
              // eslint-disable-next-line no-void
              void handleFileChange(event);
            }}
            className="data-product-editor__image-selector__input"
            value={
              dataProduct.icon instanceof DataProductEmbeddedImageIcon
                ? ''
                : undefined
            }
            ref={imageInputRef}
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="data-product-editor__image-selector__upload-btn btn btn--dark"
          >
            <UploadIcon /> Upload File
          </button>
          <div className="data-product-editor__image-selector__hint">
            Supported formats: PNG, JPG, JPEG, GIF (max{' '}
            {(imageConfig?.maxUploadSizeKB ?? 1024 * 5) / 1024}MB)
          </div>
        </div>
      </div>
    );
  },
);

const DataProductIconEditor = observer(
  (props: { product: DataProduct; isReadOnly: boolean }) => {
    const { product, isReadOnly } = props;

    return (
      <div className="panel__content__form__section data-product-editor__icon-editor">
        <div className="panel__content__form__section__header__label">
          Icon/Image
        </div>
        <IconPreviewComponent dataProduct={product} />
        <IconSelectorComponent dataProduct={product} isReadOnly={isReadOnly} />
        <div
          className="panel__content__form__section__header__prompt"
          style={{ marginBottom: 0 }}
        >
          <b>or</b>
        </div>
        <ImageSelectorComponent dataProduct={product} isReadOnly={isReadOnly} />
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

    return (
      <div className="panel__content">
        <div className="data-product-editor__home-tab">
          <PanelFormTextField
            name="Title"
            value={product.title}
            prompt="Provide a descriptive name for the Data Product to appear in Marketplace."
            update={updateDataProductTitle}
            placeholder="Enter title"
          />
          <div className="panel__content__form__section">
            <div
              className="panel__content__form__section__header__label"
              style={{ justifyContent: 'space-between', width: '45rem' }}
            >
              Description
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
          <DataProductIconEditor product={product} isReadOnly={isReadOnly} />
        </div>
      </div>
    );
  },
);

const SupportTab = observer(
  (props: {
    dataProductEditorState: DataProductEditorState;
    isReadOnly: boolean;
  }) => {
    const { dataProductEditorState, isReadOnly } = props;
    const product = dataProductEditorState.product;
    const updateSupportInfoDocumentationUrl = (
      val: string | undefined,
    ): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setDocumentationUrl(product.supportInfo, val ?? '');
      }
      if (!val) {
        dataProductEditorState.clearSupportInfo();
      }
    };
    const updateSupportInfoDocumentationLabel = (
      val: string | undefined,
    ): void => {
      if (product.supportInfo?.documentation) {
        supportInfo_setLinkLabel(product.supportInfo.documentation, val);
      }
    };

    const updateSupportInfoWebsite = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setWebsite(product.supportInfo, val ?? '');
      }
      if (!val) {
        dataProductEditorState.clearSupportInfo();
      }
    };
    const updateSupportInfoWebsiteLabel = (val: string | undefined): void => {
      if (product.supportInfo?.website) {
        supportInfo_setLinkLabel(product.supportInfo.website, val);
      }
    };

    const updateSupportInfoFaqUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setFaqUrl(product.supportInfo, val ?? '');
      }
      if (!val) {
        dataProductEditorState.clearSupportInfo();
      }
    };
    const updateSupportInfoFaqLabel = (val: string | undefined): void => {
      if (product.supportInfo?.faqUrl) {
        supportInfo_setLinkLabel(product.supportInfo.faqUrl, val);
      }
    };

    const updateSupportInfoSupportUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setSupportUrl(product.supportInfo, val ?? '');
      }
      if (!val) {
        dataProductEditorState.clearSupportInfo();
      }
      const supportLabelOptions = ['Keystone', 'Jira', 'ServiceNow'];
      supportLabelOptions.forEach((derivedLabel) => {
        if (
          val?.includes(derivedLabel.toLowerCase()) &&
          product.supportInfo?.supportUrl
        ) {
          supportInfo_setLinkLabel(
            product.supportInfo.supportUrl,
            derivedLabel,
          );
        }
      });
    };
    const updateSupportInfoSupportLabel = (val: string | undefined): void => {
      if (product.supportInfo?.supportUrl) {
        supportInfo_setLinkLabel(product.supportInfo.supportUrl, val);
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
      if (product.supportInfo?.emails.length === 0) {
        dataProductEditorState.clearSupportInfo();
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
      <div className="data-product-editor__support-info">
        <div className="panel__content__form__section__header__label">
          Support Information
        </div>
        <div className="panel__content__form__section__header__prompt">
          Configure support information for this Lakehouse Data Product.
        </div>
        <div className="data-product-editor__support-info__link-container">
          <PanelFormTextField
            className="data-product-editor__support-info__input"
            name="Documentation"
            prompt="URL"
            value={product.supportInfo?.documentation?.url ?? ''}
            update={updateSupportInfoDocumentationUrl}
            placeholder="Documentation URL"
          />
          <PanelFormTextField
            className="data-product-editor__support-info__input"
            name=""
            prompt="Label"
            isReadOnly={!Boolean(product.supportInfo?.documentation)}
            value={product.supportInfo?.documentation?.label ?? ''}
            update={updateSupportInfoDocumentationLabel}
            placeholder="Documentation Label"
          />
        </div>

        <div className="data-product-editor__support-info__link-container">
          <PanelFormTextField
            name="Website"
            prompt="URL"
            value={product.supportInfo?.website?.url ?? ''}
            update={updateSupportInfoWebsite}
            placeholder="Website URL"
          />
          <PanelFormTextField
            name=""
            prompt="Label"
            isReadOnly={!Boolean(product.supportInfo?.website)}
            value={product.supportInfo?.website?.label ?? ''}
            update={updateSupportInfoWebsiteLabel}
            placeholder="Website Label"
          />
        </div>

        <div className="data-product-editor__support-info__link-container">
          <PanelFormTextField
            name="FAQ"
            prompt="URL"
            value={product.supportInfo?.faqUrl?.url}
            update={updateSupportInfoFaqUrl}
            placeholder="FAQ URL"
          />
          <PanelFormTextField
            name=""
            prompt="Label"
            isReadOnly={!Boolean(product.supportInfo?.faqUrl)}
            value={product.supportInfo?.faqUrl?.label}
            update={updateSupportInfoFaqLabel}
            placeholder="FAQ Label"
          />
        </div>

        <div className="data-product-editor__support-info__link-container">
          <PanelFormTextField
            name="Support"
            prompt="URL"
            value={product.supportInfo?.supportUrl?.url ?? ''}
            update={updateSupportInfoSupportUrl}
            placeholder="Support URL"
          />
          <PanelFormTextField
            name=""
            prompt="Label"
            isReadOnly={!Boolean(product.supportInfo?.supportUrl)}
            value={product.supportInfo?.supportUrl?.label}
            update={updateSupportInfoSupportLabel}
            placeholder="Support Label"
          />
        </div>

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
      </div>
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
  const [showPreview, setshowPreview] = useState(false);

  const dataProductViewerState = useMemo(() => {
    const v1_dataProduct = guaranteeType(
      guaranteeType(
        editorStore.graphManagerState.graphManager,
        V1_PureGraphManager,
      ).elementToProtocol(product),
      V1_DataProduct,
    );
    const graphManager = guaranteeType(
      guaranteeType(
        editorStore.graphManagerState.graphManager,
        V1_PureGraphManager,
      ).engine,
      V1_RemoteEngine,
    );
    return new DataProductViewerState(
      v1_dataProduct,
      editorStore.applicationStore,
      graphManager.getEngineServerClient(),
      editorStore.graphManagerState,
      editorStore.applicationStore.config.options.dataProductConfig,
      undefined,
      {},
    );
  }, [editorStore.applicationStore, editorStore.graphManagerState, product]);

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
        return (
          <SupportTab
            dataProductEditorState={dataProductEditorState}
            isReadOnly={isReadOnly}
          />
        );
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
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel>{renderActivivtyBarTab()}</ResizablePanel>
            {showPreview && <ResizablePanelSplitter />}
            {showPreview && (
              <ResizablePanel>
                <div className="theme__hc-light">
                  <ProductViewer productViewerState={dataProductViewerState} />
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
});
