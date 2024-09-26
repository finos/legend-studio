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
import { forwardRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  ContextMenu,
  PanelContent,
  PURE_ServiceIcon,
  clsx,
  PlayIcon,
  Dialog,
  Modal,
  TimesIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  TimesCircleIcon,
  EmptyCircleIcon,
  MenuContentItem,
  MenuContent,
  ModalBody,
  ModalHeader,
  ModalFooter,
  ModalFooterButton,
  CheckSquareIcon,
  SquareIcon,
} from '@finos/legend-art';
import {
  type GlobalBulkServiceRegistrationState,
  REGISTRATION_RESULT,
  getServiceRegistrationResult,
  type BulkServiceRegistrationState,
} from '../../../stores/editor/sidebar-state/BulkServiceRegistrationState.js';
import { BulkServiceRegistrationEditor } from '../editor-group/service-editor/BulkServiceRegistrationEditor.js';
import { guaranteeNonNullable, noop } from '@finos/legend-shared';
import {
  ServiceRegistrationFail,
  type ServiceRegistrationResult,
  ServiceRegistrationSuccess,
} from '@finos/legend-graph';
import { generateServiceManagementUrl } from '../../../stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { useApplicationStore } from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

export const getRegistrationStatusIcon = (
  isSelected: boolean,
  registrationResult: REGISTRATION_RESULT,
): React.ReactNode => {
  if (registrationResult === REGISTRATION_RESULT.SUCCESS) {
    return (
      <div
        title="Service registered successfully"
        className="bulk-service-registration__item__link__content__status__indicator bulk-service-registration__item__link__content__status__indicator--succeeded"
      >
        <CheckCircleIcon />
      </div>
    );
  } else if (
    registrationResult === REGISTRATION_RESULT.IN_PROGRESS &&
    isSelected
  ) {
    return (
      <div
        title="Service registration in progress"
        className="bulk-service-registration__item__link__content__status__indicator bulk-service-registration__item__link__content__status__indicator--in-progress"
      >
        <CircleNotchIcon />
      </div>
    );
  } else if (registrationResult === REGISTRATION_RESULT.FAILED) {
    return (
      <div
        title="Service Registration Failed"
        className="bulk-service-registration__item__link__content__status__indicator bulk-service-registration__item__link__content__status__indicator--failed"
      >
        <TimesCircleIcon />
      </div>
    );
  } else {
    return (
      <div
        title="Service is not registered"
        className="bulk-service-registration__item__link__content__status__indicator bulk-service-registration__item__link__content__status__indicator--unknown"
      >
        <EmptyCircleIcon />
      </div>
    );
  }
};

const ServiceContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      globalServiceRegistrationState: GlobalBulkServiceRegistrationState;
      serviceState: BulkServiceRegistrationState;
    }
  >(function ServiceContextMenu(props, ref) {
    const { serviceState, globalServiceRegistrationState } = props;
    const applicationStore = useApplicationStore();
    return (
      <MenuContent>
        {serviceState.registrationResult instanceof
          ServiceRegistrationSuccess && (
          <MenuContentItem
            onClick={(): void => {
              const config = guaranteeNonNullable(
                globalServiceRegistrationState.serviceConfigState.options.find(
                  (info) =>
                    info.env ===
                    globalServiceRegistrationState.serviceConfigState
                      .serviceEnv,
                ),
              );
              applicationStore.navigationService.navigator.visitAddress(
                generateServiceManagementUrl(
                  config.managementUrl,
                  serviceState.service.pattern,
                ),
              );
            }}
          >
            Launch Service
          </MenuContentItem>
        )}
        {serviceState.registrationResult instanceof ServiceRegistrationFail && (
          <MenuContentItem
            onClick={() =>
              globalServiceRegistrationState.setFailingView(
                serviceState.registrationResult as ServiceRegistrationFail,
              )
            }
          >
            View Error
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const ServiceFailViewer = observer(
  (props: {
    globalBulkServiceRegistrationState: GlobalBulkServiceRegistrationState;
    failure: ServiceRegistrationResult | undefined;
  }) => {
    const { globalBulkServiceRegistrationState, failure } = props;
    const applicationStore =
      globalBulkServiceRegistrationState.editorStore.applicationStore;
    const closeLogViewer = (): void =>
      globalBulkServiceRegistrationState.setFailingView(undefined);
    return (
      <Dialog
        open={Boolean(failure)}
        onClose={closeLogViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader title={guaranteeNonNullable(failure?.service).path} />
          <ModalBody>
            {failure instanceof ServiceRegistrationFail && (
              <CodeEditor
                inputValue={failure.errorMessage}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.TEXT}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Close"
              onClick={closeLogViewer}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const RegisterService = observer(
  (props: {
    globalBulkServiceRegistrationState: GlobalBulkServiceRegistrationState;
  }) => {
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const services = editorStore.graphManagerState.graph.ownServices;
    const toggleSelectAllServices = (): void => {
      editorStore.globalBulkServiceRegistrationState.toggleSelectAllServices(
        !editorStore.globalBulkServiceRegistrationState.selectAllServices,
      );
      editorStore.globalBulkServiceRegistrationState.setSelectAll(
        editorStore.globalBulkServiceRegistrationState.selectAllServices,
      );
    };

    const selectService = (
      serviceState: BulkServiceRegistrationState,
    ): void => {
      serviceState.toggleIsSelected();
      editorStore.globalBulkServiceRegistrationState.toggleSelectAllServices(
        editorStore.globalBulkServiceRegistrationState.bulkServiceRegistrationStates.filter(
          (bulkServiceState) => bulkServiceState.isSelected,
        ).length ===
          editorStore.globalBulkServiceRegistrationState
            .bulkServiceRegistrationStates.length,
      );
    };

    useEffect(() => {
      editorStore.globalBulkServiceRegistrationState.init();
    }, [editorStore.globalBulkServiceRegistrationState]);

    const serviceItems = (): React.ReactNode => (
      <>
        {editorStore.globalBulkServiceRegistrationState.bulkServiceRegistrationStates.map(
          (serviceState) => (
            <ContextMenu
              key={serviceState.service._UUID}
              content={
                <ServiceContextMenu
                  globalServiceRegistrationState={
                    editorStore.globalBulkServiceRegistrationState
                  }
                  serviceState={serviceState}
                />
              }
            >
              <div className={clsx('side-bar__panel__item')}>
                <div
                  className={clsx(
                    'bulk-service-registration__service__container bulk-service-registration__explorer__service__container',
                  )}
                >
                  <div className="bulk-service-registration__services-tree__node__icon__type">
                    {getRegistrationStatusIcon(
                      serviceState.isSelected,
                      getServiceRegistrationResult(
                        editorStore.globalBulkServiceRegistrationState
                          .isServiceRegistering.isInProgress,
                        serviceState.registrationResult,
                      ),
                    )}
                  </div>
                  <div className="bulk-service-registration__explorer__service__result__icon__type">
                    <PURE_ServiceIcon />
                  </div>
                  <div className="bulk-service-registration__item__link__content">
                    <div className="bulk-service-registration__item__link__content__id">
                      {serviceState.service.name}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={clsx(
                    'bulk-service-registration__section__toggler__btn',
                    {
                      'bulk-service-registration__section__toggler__btn--toggled':
                        serviceState.isSelected,
                    },
                  )}
                  onClick={() => {
                    selectService(serviceState);
                  }}
                  tabIndex={-1}
                >
                  {serviceState.isSelected ? (
                    <CheckSquareIcon />
                  ) : (
                    <SquareIcon />
                  )}
                </button>
              </div>
            </ContextMenu>
          ),
        )}
      </>
    );

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.BULK_REGISTRATION}
        className="panel bulk-service-registration"
      >
        <div className="panel__header side-bar__header">
          <div className="panel__header__title bulk-service-registration__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              REGISTER SERVICES
            </div>
          </div>
          <button
            className="panel__header__action bulk-service-registration__service__header__action bulk-service-registration__play-btn"
            onClick={() =>
              editorStore.globalBulkServiceRegistrationState.setShowRegConfig(
                true,
              )
            }
            tabIndex={-1}
            title="Register All Services"
          >
            <PlayIcon />
          </button>
          <Dialog
            onClose={noop}
            open={
              editorStore.globalBulkServiceRegistrationState
                .showRegistrationConfig
            }
          >
            <Modal
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              className={clsx(
                'editor-modal bulk-service-registration__service__editor',
              )}
            >
              <div className="bulk-service-registration__header">
                <div className="bulk-service-registration__header__actions"></div>
                <button
                  className="bulk-service-registration__header__action"
                  tabIndex={-1}
                  onClick={() =>
                    editorStore.globalBulkServiceRegistrationState.setShowRegConfig(
                      false,
                    )
                  }
                >
                  <TimesIcon />
                </button>
              </div>
              <div className="bulk-service-registration__panel__content__form">
                <BulkServiceRegistrationEditor />
              </div>
            </Modal>
          </Dialog>
        </div>
        <div className="panel__header side-bar__header">
          <div className="panel__header__title bulk-service-registration__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              Select All
            </div>
          </div>
          <button
            type="button"
            className={clsx(
              'panel__header__action bulk-service-registration__section__toggler__btn',
              {
                'panel__header__action bulk-service-registration__section__toggler__btn--toggled':
                  editorStore.globalBulkServiceRegistrationState
                    .selectAllServices,
              },
            )}
            onClick={toggleSelectAllServices}
            tabIndex={-1}
          >
            {editorStore.globalBulkServiceRegistrationState
              .selectAllServices ? (
              <CheckSquareIcon />
            ) : (
              <SquareIcon />
            )}
          </button>
        </div>
        <div className="panel__content side-bar__content">
          <div className="panel side-bar__panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">SERVICES</div>
              </div>
              <div
                className="bulk-service-registration__header__changes-count"
                data-testid={
                  LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
                }
              >
                {
                  editorStore.globalBulkServiceRegistrationState.bulkServiceRegistrationStates.filter(
                    (serviceState) => serviceState.isSelected,
                  ).length
                }{' '}
                / {services.length}
              </div>
            </div>
            <PanelContent>{serviceItems()}</PanelContent>
            {editorStore.globalBulkServiceRegistrationState.failingView && (
              <ServiceFailViewer
                globalBulkServiceRegistrationState={
                  editorStore.globalBulkServiceRegistrationState
                }
                failure={
                  editorStore.globalBulkServiceRegistrationState.failingView
                }
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);
