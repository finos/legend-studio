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
import { ServiceEditorState } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import {
  clsx,
  PanelLoadingIndicator,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { ServiceExecutionMode } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { MASTER_SNAPSHOT_ALIAS } from '@finos/legend-server-depot';
import { LATEST_PROJECT_REVISION } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';

export const ServiceRegistrationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const serviceState =
    editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
  const registrationState = serviceState.registrationState;

  // env & execution server
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
  const onServerEnvChange = (
    val: { label: string; value: string } | null,
  ): void => {
    registrationState.updateEnv(val?.value);
  };

  // execution mode
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
    val: { label: string; value: ServiceExecutionMode } | null,
  ): void => {
    registrationState.updateType(val?.value);
  };

  // version
  const selectedVersion = registrationState.projectVersion
    ? {
        label:
          registrationState.projectVersion === MASTER_SNAPSHOT_ALIAS
            ? LATEST_PROJECT_REVISION
            : registrationState.projectVersion,
        value: registrationState.projectVersion,
      }
    : null;
  const onVersionSelectionChange = (
    val: { label: string; value: string } | null,
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

  // store model for full interactive
  const toggleUseStoreModel = (): void => {
    registrationState.setUseStoreModelWithFullInteractive(
      !registrationState.TEMPORARY__useStoreModel,
    );
  };

  const toggleUseGenerateLineage = (): void => {
    registrationState.setUseGenerateLineage(
      !registrationState.TEMPORARY__useGenerateLineage,
    );
  };

  const toggleUseGenerateOpenApi = (): void => {
    registrationState.setUseGenerateOpenApi(
      !registrationState.TEMPORARY__useGenerateOpenApi,
    );
  };

  // actions
  const registerService = (): void => {
    if (selectedEnvOption && selectedServiceType) {
      flowResult(registrationState.registerService()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const disableRegistration =
    !selectedEnvOption ||
    !selectedServiceType ||
    registrationState.registrationState.isInProgress;

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
          </div>
        </div>
      </div>
      <PanelLoadingIndicator
        isLoading={registrationState.registrationState.isInProgress}
      />
      <div className="panel__content">
        <div className="panel__content__form">
          {registrationState.registrationState.message && (
            <div className="service-registration-editor__progress-msg">
              {`${registrationState.registrationState.message}...`}
            </div>
          )}
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Activate Service
            </div>
            <div
              className="panel__content__form__section__toggler"
              onClick={toggleActivatePostRegistration}
            >
              <button
                className={clsx('panel__content__form__section__toggler__btn', {
                  'panel__content__form__section__toggler__btn--toggled':
                    registrationState.activatePostRegistration,
                })}
                tabIndex={-1}
              >
                {registrationState.activatePostRegistration ? (
                  <CheckSquareIcon />
                ) : (
                  <SquareIcon />
                )}
              </button>
              <div className="panel__content__form__section__toggler__prompt">
                Activates service after registration
              </div>
            </div>
          </div>
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
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Service Type
            </div>
            <div className="panel__content__form__section__header__prompt">
              The kind of service you want to register. Used to determine how
              the metadata will be fetched
            </div>
            <CustomSelectorInput
              options={serviceTypesOptions}
              onChange={onServiceTypeSelectionChange}
              value={selectedServiceType}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
          {registrationState.serviceExecutionMode ===
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
                  className={clsx(
                    'panel__content__form__section__toggler__btn',
                    {
                      'panel__content__form__section__toggler__btn--toggled':
                        registrationState.TEMPORARY__useStoreModel,
                    },
                  )}
                  tabIndex={-1}
                >
                  {registrationState.TEMPORARY__useStoreModel ? (
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
          {
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Generate Lineage
              </div>
              <div
                className="panel__content__form__section__toggler"
                onClick={toggleUseGenerateLineage}
              >
                <button
                  className={clsx(
                    'panel__content__form__section__toggler__btn',
                    {
                      'panel__content__form__section__toggler__btn--toggled':
                        registrationState.TEMPORARY__useGenerateLineage,
                    },
                  )}
                  tabIndex={-1}
                >
                  {registrationState.TEMPORARY__useGenerateLineage ? (
                    <CheckSquareIcon />
                  ) : (
                    <SquareIcon />
                  )}
                </button>
                <div className="panel__content__form__section__toggler__prompt">
                  Generate Lineage (slower)
                </div>
              </div>
            </div>
          }
          {registrationState.serviceExecutionMode ===
            ServiceExecutionMode.PROD && (
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Generate Open Api
              </div>
              <div
                className="panel__content__form__section__toggler"
                onClick={toggleUseGenerateOpenApi}
              >
                <button
                  className={clsx(
                    'panel__content__form__section__toggler__btn',
                    {
                      'panel__content__form__section__toggler__btn--toggled':
                        registrationState.TEMPORARY__useGenerateOpenApi,
                    },
                  )}
                  tabIndex={-1}
                >
                  {registrationState.TEMPORARY__useGenerateOpenApi ? (
                    <CheckSquareIcon />
                  ) : (
                    <SquareIcon />
                  )}
                </button>
                <div className="panel__content__form__section__toggler__prompt">
                  Generate Open Api
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
              options={registrationState.versionOptions ?? []}
              onChange={onVersionSelectionChange}
              value={selectedVersion}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              disabled={registrationState.versionOptions === undefined}
              placeholder={versionPlaceholder}
              isLoading={
                editorStore.sdlcState.fetchPublishedProjectVersionsState
                  .isInProgress
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
});
