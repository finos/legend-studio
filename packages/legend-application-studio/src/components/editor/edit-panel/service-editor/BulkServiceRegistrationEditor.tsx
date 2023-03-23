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
import {
  clsx,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
  PanelLoadingIndicator,
  Dialog,
  Modal,
  ModalBody,
  TimesIcon,
} from '@finos/legend-art';
import {
  filterByType,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_TEST_ID } from '../../../../application/LegendStudioTesting.js';
import {
  BulkRegistrationResultFail,
  BulkRegistrationResultSuccess,
  ServiceExecutionMode,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { Version } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { generateServiceManagementUrl } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';

export const BulkServiceRegistrationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const bulkServiceRegistrationState = editorStore.bulkServiceRegistrationState;
  // env & execution server
  const envOptions = bulkServiceRegistrationState.options
    .filter((info) => info.env !== 'prod')
    .map((info) => ({
      label: info.env.toUpperCase(),
      value: info.env,
    }));
  const selectedEnvOption = bulkServiceRegistrationState.serviceEnv
    ? {
        label: bulkServiceRegistrationState.serviceEnv.toUpperCase(),
        value: bulkServiceRegistrationState.serviceEnv,
      }
    : null;
  const onServerEnvChange = (
    val: { label: string; value: string } | null,
  ): void => {
    bulkServiceRegistrationState.updateEnv(val?.value);
  };

  // execution mode
  const serviceTypesOptions = bulkServiceRegistrationState.executionModes
    .filter((mode) => mode !== ServiceExecutionMode.PROD)
    .map((mode) => ({
      label: prettyCONSTName(mode),
      value: mode,
    }));
  const selectedServiceType = bulkServiceRegistrationState.serviceExecutionMode
    ? {
        label: prettyCONSTName(
          bulkServiceRegistrationState.serviceExecutionMode,
        ),
        value: bulkServiceRegistrationState.serviceExecutionMode,
      }
    : null;
  const onServiceTypeSelectionChange = (
    val: { label: ServiceExecutionMode; value: ServiceExecutionMode } | null,
  ): void => {
    bulkServiceRegistrationState.updateType(val?.value);
  };

  // version
  const selectedVersion = bulkServiceRegistrationState.projectVersion
    ? {
        label:
          bulkServiceRegistrationState.projectVersion instanceof Version
            ? bulkServiceRegistrationState.projectVersion.id.id
            : bulkServiceRegistrationState.projectVersion,
        value: bulkServiceRegistrationState.projectVersion,
      }
    : null;
  const onVersionSelectionChange = (
    val: { label: string; value: Version | string } | null,
  ): void => {
    bulkServiceRegistrationState.setProjectVersion(val?.value);
  };
  const versionPlaceholder =
    bulkServiceRegistrationState.versionOptions === undefined
      ? `Only valid for ${prettyCONSTName(
          ServiceExecutionMode.SEMI_INTERACTIVE,
        )} and ${prettyCONSTName(ServiceExecutionMode.PROD)} service types`
      : !bulkServiceRegistrationState.versionOptions.length
      ? 'Project has no versions'
      : undefined;

  // store model for full interactive
  const toggleUseStoreModel = (): void => {
    bulkServiceRegistrationState.setUseStoreModelWithFullInteractive(
      !bulkServiceRegistrationState.TEMPORARY__useStoreModel,
    );
  };

  const config = guaranteeNonNullable(
    bulkServiceRegistrationState.options.find(
      (info) => info.env === bulkServiceRegistrationState.serviceEnv,
    ),
  );

  // actions
  const registerService = (): void => {
    if (selectedEnvOption && selectedServiceType) {
      flowResult(bulkServiceRegistrationState.registerServices()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const closeModal = (): void => {
    editorStore.bulkServiceRegistrationState.setSuccessModal(false);
  };
  const disableRegistration =
    !selectedEnvOption ||
    !selectedServiceType ||
    bulkServiceRegistrationState.registrationState.isInProgress;

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_EDITOR}
      className="service-registration-editor"
    >
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">Register Service</div>
        </div>
        <div className="panel__header__actions">
          <div className="panel__header__action">
            <button
              className="btn--dark model-loader__header__load-btn"
              onClick={registerService}
              disabled={disableRegistration}
              tabIndex={-1}
              title="Register Service"
            >
              Register
            </button>
            <Dialog
              open={editorStore.bulkServiceRegistrationState.showSuccessModel}
            >
              <Modal
                darkMode={true}
                className="editor-modal bulk-service-registration__service__response"
              >
                <div className="bulk-service-registration__header">
                  <button
                    className="bulk-service-registration__header__action"
                    tabIndex={-1}
                    onClick={closeModal}
                  >
                    <TimesIcon />
                  </button>
                </div>
                <ModalBody>
                  <div className="bulk-service-registration__service__result__header">
                    Successful Services
                    {editorStore.bulkServiceRegistrationState.registrationResult
                      ?.filter(filterByType(BulkRegistrationResultSuccess))
                      .map((service) => (
                        <div
                          className="bulk-service-registration__service__link__label"
                          key={service.pattern}
                        >
                          <a
                            className="bulk-service-registration__service__link__label__service__link"
                            href={generateServiceManagementUrl(
                              config.managementUrl,
                              service.pattern,
                            )}
                          >
                            <div>{service.pattern}</div>
                          </a>
                        </div>
                      ))}
                  </div>
                  <div>
                    <div className="bulk-service-registration__service__result__header">
                      Failed Services
                    </div>
                    <div>
                      {editorStore.bulkServiceRegistrationState.registrationResult
                        ?.filter(filterByType(BulkRegistrationResultFail))
                        .map((service) => (
                          <div
                            key={service.errorMessage}
                            className="bulk-service-registration__service__link__label"
                          >
                            {service.errorMessage}
                          </div>
                        ))}
                    </div>
                  </div>
                </ModalBody>
              </Modal>
            </Dialog>
          </div>
        </div>
      </div>
      <PanelLoadingIndicator
        isLoading={bulkServiceRegistrationState.registrationState.isInProgress}
      />
      <div className="panel__content__form">
        {bulkServiceRegistrationState.registrationState.message && (
          <div className="service-registration-editor__progress-msg">
            {`${bulkServiceRegistrationState.registrationState.message}...`}
          </div>
        )}
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Execution Server
          </div>
          <div className="panel__content__form__section__header__prompt">
            The execution server where your service will be registered
          </div>
          <CustomSelectorInput
            options={envOptions}
            onChange={onServerEnvChange}
            value={selectedEnvOption}
            darkMode={true}
          />
        </div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Service Type
          </div>
          <div className="panel__content__form__section__header__prompt">
            The kind of service you want to register. Used to determine how the
            metadata will be fetched
          </div>
          <CustomSelectorInput
            options={serviceTypesOptions}
            onChange={onServiceTypeSelectionChange}
            value={selectedServiceType}
            darkMode={true}
          />
        </div>
        {bulkServiceRegistrationState.serviceExecutionMode ===
          ServiceExecutionMode.FULL_INTERACTIVE && (
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Store Model
            </div>
            <div
              className="panel__content__form__section__toggler"
              onClick={toggleUseStoreModel}
            >
              <button
                className={clsx('panel__content__form__section__toggler__btn', {
                  'panel__content__form__section__toggler__btn--toggled':
                    bulkServiceRegistrationState.TEMPORARY__useStoreModel,
                })}
                tabIndex={-1}
              >
                {bulkServiceRegistrationState.TEMPORARY__useStoreModel ? (
                  <CheckSquareIcon />
                ) : (
                  <SquareIcon />
                )}
              </button>
              <div className="panel__content__form__section__toggler__prompt">
                Use Store Model (slower)
              </div>
            </div>
          </div>
        )}
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Project Version
          </div>
          <div className="panel__content__form__section__header__prompt">
            The version of your project you want to use for registration. Only
            relevant for semi-interactive and production services.
          </div>
          <CustomSelectorInput
            options={bulkServiceRegistrationState.versionOptions ?? []}
            onChange={onVersionSelectionChange}
            value={selectedVersion}
            darkMode={true}
            disabled={bulkServiceRegistrationState.versionOptions === undefined}
            placeholder={versionPlaceholder}
            isLoading={editorStore.sdlcState.isFetchingProjectVersions}
          />
        </div>
      </div>
    </div>
  );
});
