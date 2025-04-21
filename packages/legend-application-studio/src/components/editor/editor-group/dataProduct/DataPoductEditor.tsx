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
} from '@finos/legend-art';
import { useRef, useState, useEffect } from 'react';
import { filterByType } from '@finos/legend-shared';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { flowResult } from 'mobx';

const NewAccessPointAccessPOint = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState: dataProductEditorState } = props;
    const accessPointInputRef = useRef<HTMLInputElement>(null);
    const [id, setId] = useState<string | undefined>(undefined);
    const handleIdChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setId(event.target.value);
    const handleClose = () => {
      dataProductEditorState.setAccessPointModal(false);
    };
    const handleSubmit = () => {
      if (id) {
        dataProductEditorState.addAccessPoint(id);
        handleClose();
      }
    };
    const handleEnter = (): void => {
      accessPointInputRef.current?.focus();
    };
    const disableCreateButton =
      id === '' ||
      id === undefined ||
      dataProductEditorState.accessPointStates
        .map((e) => e.accessPoint.id)
        .includes(id);
    const errors =
      id === ''
        ? `ID is empty`
        : dataProductEditorState.accessPointStates
              .map((e) => e.accessPoint.id)
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
                    lambdaEditorState.val.state
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

export const DataProductEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataProductEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataProductEditorState);
  const product = dataProductEditorState.product;
  const accessPointStates = dataProductEditorState.accessPointStates;
  const isReadOnly = dataProductEditorState.isReadOnly;
  const openNewModal = () => {
    dataProductEditorState.setAccessPointModal(true);
  };

  useEffect(() => {
    flowResult(dataProductEditorState.convertAccessPointsFuncObjects()).catch(
      dataProductEditorState.editorStore.applicationStore.alertUnhandledError,
    );
  }, [dataProductEditorState]);

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
            <div className="panel__header__title__content">{product.name}</div>
          </div>
        </div>
        <div className="panel">
          <PanelHeader>
            <div className="panel__header__title">
              <div className="panel__header__title__content">ACCESS POINTS</div>
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
          <PanelContent>
            {accessPointStates
              .filter(filterByType(LakehouseAccessPointState))
              .map((apState) => (
                <LakehouseDataProductAcccessPointEditor
                  key={apState.accessPoint.id}
                  isReadOnly={isReadOnly}
                  accessPointState={apState}
                />
              ))}
            {!accessPointStates.length && (
              <DataProductEditorSplashScreen
                dataProductEditorState={dataProductEditorState}
              />
            )}
          </PanelContent>
          {dataProductEditorState.accessPointModal && (
            <NewAccessPointAccessPOint
              dataProductEditorState={dataProductEditorState}
            />
          )}
        </div>
      </div>
    </div>
  );
});
