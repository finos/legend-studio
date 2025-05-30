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
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  PencilEditIcon,
  PanelFormTextField,
} from '@finos/legend-art';
import React, { useRef, useState, useEffect } from 'react';
import { filterByType } from '@finos/legend-shared';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { action, flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import type { LakehouseAccessPoint } from '@finos/legend-graph';

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
        dataProductEditorState.addAccessPoint(id, description, 'default');
        handleClose();
      }
    };
    const handleEnter = (): void => {
      accessPointInputRef.current?.focus();
    };
    const disableCreateButton =
      id === '' ||
      id === undefined ||
      dataProductEditorState.accessPoints.map((e) => e.id).includes(id);
    const errors =
      id === ''
        ? `ID is empty`
        : dataProductEditorState.accessPoints
              .map((e) => e.id)
              .includes(id ?? '')
          ? `ID already exists`
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
        >
          <div className="modal__title">New Access Point</div>
          <div>
            <div className="panel__content__form__section__header__label">
              ID
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              ref={accessPointInputRef}
              spellCheck={false}
              value={id}
              onChange={handleIdChange}
              placeholder="Access Point ID"
              error={errors}
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
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Access Point Description"
              error={errors}
            />
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

interface DescriptionTextAreaProps {
  accessPoint: LakehouseAccessPoint;
  handleMouseOver: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseOut: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const DescriptionTextArea: React.FC<DescriptionTextAreaProps> = ({
  accessPoint,
  handleMouseOver,
  handleMouseOut,
}) => {
  return (
    <div onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
      {accessPoint.description}
    </div>
  );
};

const hoverIcon = () => {
  return (
    <div>
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

    const updateAccessPointDescription: React.ChangeEventHandler<
      HTMLTextAreaElement
    > = (event) => {
      action((accessPoint.description = event.target.value));
    };

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
              title="Click to edit description"
              className="access-point-editor__description-container"
            >
              <DescriptionTextArea
                accessPoint={accessPoint}
                handleMouseOver={handleMouseOver}
                handleMouseOut={handleMouseOut}
              />
              {isHovering && hoverIcon()}
            </div>
          )}
          <div className="access-point-editor__info">
            <div
              className={clsx('access-point-editor__type')}
              title={accessPoint.targetEnvironment}
            >
              <div className="access-point-editor__type__label">
                {accessPoint.targetEnvironment}
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
          onClick={() => dataProductEditorState.setAccessPointModal(true)}
          className="data-product-editor__splash-screen__label"
        >
          Add Access Point
        </div>
        <div className="data-product-editor__splash-screen__spacing"></div>
        <div
          onClick={() => dataProductEditorState.setAccessPointModal(true)}
          title="Add new Access Point"
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
            <ModalTitle title="Validation Error" />
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
    dataProductEditorState.setAccessPointModal(true);
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

  const updateDataProductTitle = action((val: string | undefined): void => {
    if (val === undefined) {
      return;
    }
    product.name = val;
  });

  const updateDataProductDescription = action(
    (val: string | undefined): void => {
      product.description = val;
    },
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
        <div className="panel" style={{ padding: '1rem' }}>
          <PanelFormTextField
            name="Title"
            value={product.name}
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
        </div>
        <div className="panel">
          <PanelHeader>
            <div className="panel__header__title">
              <div className="panel__header__title__label">access points</div>
            </div>
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
          <div style={{ overflow: 'auto' }}>
            <PanelContent>
              {dataProductEditorState.accessPointGroupStates.map(
                (groupState) => (
                  <div
                    key={groupState.value.id}
                    className="access-point-editor__group-container"
                  >
                    <div className="access-point-editor__group-container__title">
                      <div className="panel__header__title__content">
                        {groupState.value.id}
                      </div>
                    </div>
                    {groupState.accessPointStates
                      .filter(filterByType(LakehouseAccessPointState))
                      .map((apState) => (
                        <LakehouseDataProductAcccessPointEditor
                          key={apState.accessPoint.id}
                          isReadOnly={isReadOnly}
                          accessPointState={apState}
                        />
                      ))}
                  </div>
                ),
              )}
              {!accessPointStates.length && (
                <DataProductEditorSplashScreen
                  dataProductEditorState={dataProductEditorState}
                />
              )}
            </PanelContent>
          </div>
          {dataProductEditorState.accessPointModal && (
            <NewAccessPointAccessPOint
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
