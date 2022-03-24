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
import { ServiceEditorState } from '../../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import {
  clsx,
  Dialog,
  PanelLoadingIndicator,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID';
import { ServiceExecutionMode } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { Version } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider';
import { useApplicationStore } from '@finos/legend-application';

export const ServiceRegistrationModalEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
  const registrationState = serviceState.registrationState;
  // service servers
  const envOptions = registrationState.options.map((info) => ({
    label: info.env.toUpperCase(),
    value: info.env,
  }));
  const selectedEnvOption = registrationState.serviceEnv
    ? {
        label: registrationState.serviceEnv.toUpperCase(),
        value: registrationState.serviceEnv,
      }
    : null;
  // service types
  const serviceTypesOptions = registrationState.executionModes.map((mode) => ({
    label: prettyCONSTName(mode),
    value: mode,
  }));
  const selectedServiceType = registrationState.serviceExecutionMode
    ? {
        label: prettyCONSTName(registrationState.serviceExecutionMode),
        value: registrationState.serviceExecutionMode,
      }
    : null;
  const onServiceTypeSelectionChange = (
    val: { label: ServiceExecutionMode; value: ServiceExecutionMode } | null,
  ): void => {
    registrationState.updateType(val?.value);
  };
  const onServerEnvChange = (
    val: { label: string; value: string } | null,
  ): void => {
    registrationState.updateEnv(val?.value);
  };
  // version Projection
  const selectedVersion = registrationState.projectVersion
    ? {
        label:
          registrationState.projectVersion instanceof Version
            ? registrationState.projectVersion.id.id
            : registrationState.projectVersion,
        value: registrationState.projectVersion,
      }
    : null;
  const onVersionSelectionChange = (
    val: { label: string; value: Version | string } | null,
  ): void => {
    registrationState.setProjectVersion(val?.value);
  };
  const versionPlaceholder =
    registrationState.versionOptions === undefined
      ? `Only valid for ${prettyCONSTName(
          ServiceExecutionMode.SEMI_INTERACTIVE,
        )} and ${prettyCONSTName(ServiceExecutionMode.PROD)} service types`
      : !registrationState.versionOptions.length
      ? 'Project has no versions'
      : undefined;
  // activate
  const toggleActivatePostRegistration = (): void => {
    registrationState.setActivatePostRegistration(
      !registrationState.activatePostRegistration,
    );
  };
  // actions
  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    if (selectedEnvOption && selectedServiceType) {
      flowResult(registrationState.registerService()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const closeModal = (): void => {
    registrationState.setShowModal(false);
  };
  const disableRegistration =
    !selectedEnvOption ||
    !selectedServiceType ||
    registrationState.registrationState.isInProgress;
  return (
    <Dialog
      open={registrationState.showModal}
      onClose={closeModal}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_MODAL}
        className="modal modal--dark service-registration-modal"
      >
        <div className="service-registration-modal__heading">
          <div className="service-registration-modal__heading__label">
            Register Service
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={registrationState.registrationState.isInProgress}
          />
          <div className="setup-create__form">
            <div className="panel__content__form">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Activate Service
                </div>
                <div
                  className="panel__content__form__section__toggler"
                  onClick={toggleActivatePostRegistration}
                >
                  <button
                    type="button"
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          registrationState.activatePostRegistration,
                      },
                    )}
                    tabIndex={-1}
                  >
                    {registrationState.activatePostRegistration ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Activates service after registering.
                  </div>
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Alloy Server
                </div>
                <div className="panel__content__form__section__header__prompt">
                  The server where your service will be registered
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
                  The kind of service you want to register. Used to determine
                  where the metadata will be fetched from.
                </div>
                <CustomSelectorInput
                  options={serviceTypesOptions}
                  onChange={onServiceTypeSelectionChange}
                  value={selectedServiceType}
                  darkMode={true}
                />
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Project Version
                </div>
                <div className="panel__content__form__section__header__prompt">
                  The version of your project you want to use for registration.
                  Only relevant for semi and prod service types.
                </div>
                <CustomSelectorInput
                  options={registrationState.versionOptions ?? []}
                  onChange={onVersionSelectionChange}
                  value={selectedVersion}
                  darkMode={true}
                  disabled={registrationState.versionOptions === undefined}
                  placeholder={versionPlaceholder}
                  isLoading={editorStore.sdlcState.isFetchingProjectVersions}
                />
              </div>
            </div>
          </div>
          <button
            disabled={disableRegistration}
            onClick={handleSubmit}
            className="btn btn--dark service-registration-modal__submit-btn u-pull-right"
          >
            Register
          </button>
        </form>
      </div>
    </Dialog>
  );
});
