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
  PanelDivider,
  InputWithInlineValidation,
  useResizeDetector,
  AccessPointIcon,
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
} from '@finos/legend-art';
import React, { useRef, useState, useEffect } from 'react';
import { filterByType } from '@finos/legend-shared';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { action, flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { LakehouseTargetEnv, Email } from '@finos/legend-graph';
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
} from '../../../../stores/graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

export enum AP_GROUP_MODAL_ERRORS {
  GROUP_NAME_EMPTY = 'Group Name is empty',
  GROUP_NAME_EXISTS = 'Group Name already exists',
  GROUP_DESCRIPTION_EMPTY = 'Group Description is empty',
  AP_NAME_EMPTY = 'Access Point Name is empty',
  AP_NAME_EXISTS = 'Access Point Name already exists',
  AP_DESCRIPTION_EMPTY = 'Access Point Description is empty',
}

export const AP_EMPTY_DESC_WARNING =
  'Describe the data this access point produces';

const NewAccessPointAccessPOint = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState: dataProductEditorState } = props;
    const accessPointInputRef = useRef<HTMLInputElement>(null);
    const [id, setId] = useState<string | undefined>(undefined);
    const handleIdChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setId(event.target.value);
    const [description, setDescription] = useState<string | undefined>(
      undefined,
    );
    const handleDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setDescription(event.target.value);
    const handleClose = () => {
      dataProductEditorState.setAccessPointModal(false);
    };
    const handleSubmit = () => {
      if (id) {
        const accessPointGroup =
          dataProductEditorState.editingGroupState ?? 'default';
        dataProductEditorState.addAccessPoint(
          id,
          description,
          accessPointGroup,
        );
        handleClose();
      }
    };
    const handleEnter = (): void => {
      accessPointInputRef.current?.focus();
    };
    const disableCreateButton =
      id === '' ||
      id === undefined ||
      description === '' ||
      description === undefined ||
      dataProductEditorState.accessPoints.map((e) => e.id).includes(id);
    const nameErrors =
      id === ''
        ? AP_GROUP_MODAL_ERRORS.AP_NAME_EMPTY
        : dataProductEditorState.accessPoints
              .map((e) => e.id)
              .includes(id ?? '')
          ? AP_GROUP_MODAL_ERRORS.AP_NAME_EXISTS
          : undefined;

    const descriptionErrors =
      description === ''
        ? AP_GROUP_MODAL_ERRORS.AP_DESCRIPTION_EMPTY
        : undefined;
    return (
      <Dialog
        open={true}
        onClose={handleClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className={clsx('modal search-modal', {
            'modal--dark': true,
          })}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div className="modal__title">New Access Point</div>
          <div>
            <div className="panel__content__form__section__header__label">
              Name
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              ref={accessPointInputRef}
              spellCheck={false}
              value={id ?? ''}
              onChange={handleIdChange}
              placeholder="Access Point Name"
              error={nameErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Description
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              spellCheck={false}
              value={description ?? ''}
              onChange={handleDescriptionChange}
              placeholder="Access Point Description"
              error={descriptionErrors}
            />
          </div>
          <div></div>
          <PanelDivider />
          <div className="search-modal__actions">
            <button
              className={clsx('btn btn--primary', {
                'btn--dark': true,
              })}
              disabled={disableCreateButton}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const NewAccessPointGroupModal = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState: dataProductEditorState } = props;
    const accessPointGroupInputRef = useRef<HTMLInputElement>(null);
    const [groupName, setGroupName] = useState<string | undefined>(undefined);
    const handleGroupNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setGroupName(event.target.value);
    const [groupDescription, setGroupDescription] = useState<
      string | undefined
    >(undefined);
    const handleGroupDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setGroupDescription(event.target.value);
    const [apName, setApName] = useState<string | undefined>(undefined);
    const handleApNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setApName(event.target.value);
    const [apDescription, setApDescription] = useState<string | undefined>(
      undefined,
    );
    const handleApDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setApDescription(event.target.value);
    const handleClose = () => {
      dataProductEditorState.setAccessPointGroupModal(false);
    };
    const handleEnter = (): void => {
      accessPointGroupInputRef.current?.focus();
    };

    const groupNameErrors =
      groupName === ''
        ? AP_GROUP_MODAL_ERRORS.GROUP_NAME_EMPTY
        : dataProductEditorState.accessPointGroupStates
              .map((e) => e.value.id)
              .includes(groupName ?? '')
          ? AP_GROUP_MODAL_ERRORS.GROUP_NAME_EXISTS
          : undefined;
    const groupDescriptionErrors =
      groupDescription === ''
        ? AP_GROUP_MODAL_ERRORS.GROUP_DESCRIPTION_EMPTY
        : undefined;
    const apNameErrors =
      apName === ''
        ? AP_GROUP_MODAL_ERRORS.AP_NAME_EMPTY
        : dataProductEditorState.accessPoints
              .map((e) => e.id)
              .includes(apName ?? '')
          ? AP_GROUP_MODAL_ERRORS.AP_NAME_EXISTS
          : undefined;
    const apDescriptionErrors =
      apDescription === ''
        ? AP_GROUP_MODAL_ERRORS.AP_DESCRIPTION_EMPTY
        : undefined;

    const disableCreateButton =
      !groupName ||
      !groupDescription ||
      !apName ||
      !apDescription ||
      Boolean(
        groupNameErrors ??
          groupDescriptionErrors ??
          apNameErrors ??
          apDescriptionErrors,
      );
    const handleSubmit = () => {
      if (!disableCreateButton && apName) {
        const createdGroup = dataProductEditorState.createGroupAndAdd(
          groupName,
          groupDescription,
        );
        dataProductEditorState.addAccessPoint(
          apName,
          apDescription,
          createdGroup,
        );
        handleClose();
      }
    };

    return (
      <Dialog
        open={true}
        onClose={handleClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className={clsx('modal search-modal', {
            'modal--dark': true,
          })}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div className="modal__title">New Access Point Group</div>
          <div>
            <div className="panel__content__form__section__header__label">
              Group Name
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              ref={accessPointGroupInputRef}
              spellCheck={false}
              value={groupName ?? ''}
              onChange={handleGroupNameChange}
              placeholder="Access Point Group Name"
              error={groupNameErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Group Description
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              spellCheck={false}
              value={groupDescription ?? ''}
              onChange={handleGroupDescriptionChange}
              placeholder="Access Point Group Description"
              error={groupDescriptionErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Access Point
            </div>
            <div className="new-access-point-group-modal">
              <div className="panel__content__form__section__header__label">
                Name
              </div>
              <InputWithInlineValidation
                className={clsx('input new-access-point-modal__id-input', {
                  'input--dark': true,
                })}
                spellCheck={false}
                value={apName ?? ''}
                onChange={handleApNameChange}
                placeholder="Access Point Name"
                error={apNameErrors}
              />
              <div className="panel__content__form__section__header__label">
                Description
              </div>
              <InputWithInlineValidation
                className={clsx('input new-access-point-modal__id-input', {
                  'input--dark': true,
                })}
                spellCheck={false}
                value={apDescription ?? ''}
                onChange={handleApDescriptionChange}
                placeholder="Access Point Description"
                error={apDescriptionErrors}
              />
            </div>
          </div>
          <PanelDivider />
          <div className="search-modal__actions">
            <button
              className={clsx('btn btn--primary', {
                'btn--dark': true,
              })}
              disabled={disableCreateButton}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

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

export const LakehouseDataProductAcccessPointEditor = observer(
  (props: {
    accessPointState: LakehouseAccessPointState;
    isReadOnly: boolean;
  }) => {
    const { accessPointState } = props;
    const accessPoint = accessPointState.accessPoint;
    const productEditorState = accessPointState.state;
    const lambdaEditorState = accessPointState.lambdaState;
    const propertyHasParserError = productEditorState.accessPointStates
      .filter(filterByType(LakehouseAccessPointState))
      .find((pm) => pm.lambdaState.parserError);
    const [editingDescription, setEditingDescription] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const handleEdit = () => setEditingDescription(true);
    const handleBlur = () => {
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

    return (
      <div
        className={clsx('access-point-editor', {
          backdrop__element: propertyHasParserError,
        })}
      >
        <div className="access-point-editor__metadata">
          <div className={clsx('access-point-editor__name', {})}>
            <div className="access-point-editor__name__label">
              {accessPoint.id}
            </div>
          </div>
          {editingDescription ? (
            <textarea
              className="panel__content__form__section__input"
              spellCheck={false}
              value={accessPoint.description ?? ''}
              onChange={updateAccessPointDescription}
              placeholder="Access Point description"
              onBlur={handleBlur}
              style={{
                overflow: 'hidden',
                resize: 'none',
                padding: '0.25rem',
              }}
            />
          ) : (
            <div
              onClick={handleEdit}
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
          <div className="access-point-editor__info">
            <div
              className={clsx('access-point-editor__type')}
              title={'Change target environment'}
            >
              <div className="access-point-editor__type__label">
                {accessPoint.targetEnvironment}
              </div>
              <div
                style={{
                  background: 'transparent',
                  height: '100%',
                  alignItems: 'center',
                  display: 'flex',
                }}
              >
                <ControlledDropdownMenu
                  className="access-point-editor__dropdown"
                  content={
                    <MenuContent>
                      {Object.values(LakehouseTargetEnv).map((environment) => (
                        <MenuContentItem
                          key={environment}
                          className="btn__dropdown-combo__option"
                          onClick={() =>
                            updateAccessPointTargetEnvironment(environment)
                          }
                        >
                          {environment}
                        </MenuContentItem>
                      ))}
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                  }}
                >
                  <CaretDownIcon />
                </ControlledDropdownMenu>
              </div>
            </div>
          </div>
        </div>
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
              className="access-point-editor__generic-entry__remove-btn"
              onClick={() => {
                productEditorState.deleteAccessPoint(accessPointState);
              }}
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const DataProductEditorSplashScreen = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState } = props;
    const logoWidth = 280;
    const logoHeight = 270;
    const [showLogo, setShowLogo] = useState(false);
    const { ref, height, width } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      setShowLogo((width ?? 0) > logoWidth && (height ?? 0) > logoHeight);
    }, [height, width]);

    return (
      <div ref={ref} className="data-product-editor__splash-screen">
        <div
          onClick={() => dataProductEditorState.setAccessPointGroupModal(true)}
          className="data-product-editor__splash-screen__label"
        >
          Add Access Point Group
        </div>
        <div className="data-product-editor__splash-screen__spacing"></div>
        <div
          onClick={() => dataProductEditorState.setAccessPointGroupModal(true)}
          title="Add new Access Point Group"
          className={clsx('data-product-editor__splash-screen__logo', {
            'data-product-editor__splash-screen__logo--hidden': !showLogo,
          })}
        >
          <AccessPointIcon />
        </div>
      </div>
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

const AccessPointGroupSection = observer(
  (props: { groupState: AccessPointGroupState; isReadOnly: boolean }) => {
    const { groupState, isReadOnly } = props;
    const productEditorState = groupState.state;
    const [editingDescription, setEditingDescription] = useState(false);
    const [isHoveringDescription, setIsHoveringDescription] = useState(false);
    const [editingName, setEditingName] = useState(false);
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
      setEditingName(false);
      setIsHoveringName(false);
    };
    const handleMouseOverName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(true);
    };
    const handleMouseOutName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(false);
    };
    const updateGroupName = (val: string): void => {
      if (val) {
        accessPointGroup_setName(groupState.value, val);
      }
    };

    const openNewModal = () => {
      productEditorState.setEditingGroupState(groupState);
      productEditorState.setAccessPointModal(true);
    };
    return (
      <div className="access-point-editor__group-container">
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
              productEditorState.deleteAccessPointGroup(groupState);
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
                resize: 'none',
                padding: '0.25rem',
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
                  Describe this access point group to clarify what users are
                  requesting access to. Entitlements are provisioned at the
                  group level.
                </div>
              )}
              {isHoveringDescription && hoverIcon()}
            </div>
          )}
        </div>
        <PanelHeader className="panel__header--access-point">
          <div className="panel__header__title">Access Points</div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={openNewModal}
              disabled={isReadOnly}
              title="Create new access point"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        {groupState.accessPointStates
          .filter(filterByType(LakehouseAccessPointState))
          .map((apState) => (
            <LakehouseDataProductAcccessPointEditor
              key={apState.accessPoint.id}
              isReadOnly={isReadOnly}
              accessPointState={apState}
            />
          ))}
        {productEditorState.accessPointModal && (
          <NewAccessPointAccessPOint
            dataProductEditorState={productEditorState}
          />
        )}
      </div>
    );
  },
);

export const DataProductEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataProductEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataProductEditorState);
  const product = dataProductEditorState.product;
  const accessPointStates = dataProductEditorState.accessPointGroupStates
    .map((e) => e.accessPointStates)
    .flat();
  const isReadOnly = dataProductEditorState.isReadOnly;
  const openNewModal = () => {
    dataProductEditorState.setAccessPointGroupModal(true);
  };
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

  const updateDataProductTitle = (val: string | undefined): void => {
    dataProduct_setTitle(product, val ?? '');
  };
  const updateDataProductDescription = (val: string | undefined): void => {
    dataProduct_setDescription(product, val ?? '');
  };

  const updateSupportInfoDocumentationUrl = (val: string | undefined): void => {
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

  const handleSupportInfoEmailAdd = (address: string, title: string): void => {
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
    (props: { item: Email }): React.ReactElement => {
      const { item } = props;

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
    (props: { onFinishEditing: () => void }) => {
      const { onFinishEditing } = props;
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
        <div className="panel" style={{ padding: '1rem', flex: 0 }}>
          <PanelFormTextField
            name="Title"
            value={product.title}
            prompt="Provide a title for this Lakehouse Data Product."
            update={updateDataProductTitle}
            placeholder="Enter title"
          />
          <PanelFormTextField
            name="Description"
            value={product.description}
            prompt="Provide a description for this Lakehouse Data Product."
            update={updateDataProductDescription}
            placeholder="Enter description"
          />
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Support Information
            </div>
            <div className="panel__content__form__section__header__prompt">
              Configure support information for this Lakehouse Data Product.
            </div>
            <PanelFormTextField
              name="Documentation URL"
              value={product.supportInfo?.documentationUrl ?? ''}
              update={updateSupportInfoDocumentationUrl}
              placeholder="Enter Documentation URL"
            />
            <PanelFormTextField
              name="Website"
              value={product.supportInfo?.website}
              update={updateSupportInfoWebsite}
              placeholder="Enter Website"
            />
            <PanelFormTextField
              name="FAQ URL"
              value={product.supportInfo?.faqUrl}
              update={updateSupportInfoFaqUrl}
              placeholder="Enter FAQ URL"
            />
            <PanelFormTextField
              name="Support URL"
              value={product.supportInfo?.supportUrl}
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
        </div>
        <div className="panel" style={{ overflow: 'auto' }}>
          <PanelHeader>
            <div className="panel__header__title">
              <div className="panel__header__title__label">
                access point groups
              </div>
            </div>
            <PanelHeaderActions>
              <PanelHeaderActionItem
                className="panel__header__action"
                onClick={openNewModal}
                disabled={isReadOnly}
                title="Create new access point group"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            </PanelHeaderActions>
          </PanelHeader>
          <PanelContent>
            <div
              style={{ overflow: 'auto', margin: '1rem', marginLeft: '1.5rem' }}
            >
              {dataProductEditorState.accessPointGroupStates.map(
                (groupState) =>
                  groupState.accessPointStates.length > 0 && (
                    <AccessPointGroupSection
                      key={groupState.uuid}
                      groupState={groupState}
                      isReadOnly={isReadOnly}
                    />
                  ),
              )}
            </div>
            {!accessPointStates.length && (
              <DataProductEditorSplashScreen
                dataProductEditorState={dataProductEditorState}
              />
            )}
          </PanelContent>

          {/* {dataProductEditorState.accessPointModal && (
            <NewAccessPointAccessPOint
              dataProductEditorState={dataProductEditorState}
            />
          )} */}
          {dataProductEditorState.accessPointGroupModal && (
            <NewAccessPointGroupModal
              dataProductEditorState={dataProductEditorState}
            />
          )}
          {dataProductEditorState.deployResponse && (
            <DataProductDeploymentResponseModal
              state={dataProductEditorState}
            />
          )}
        </div>
      </div>
    </div>
  );
});
