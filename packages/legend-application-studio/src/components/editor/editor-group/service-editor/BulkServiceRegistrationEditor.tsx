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
  PanelFormBooleanField,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelHeader,
  PanelContent,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { ServiceExecutionMode } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { MASTER_SNAPSHOT_ALIAS } from '@finos/legend-server-depot';
import { LATEST_PROJECT_REVISION } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';

export const BulkServiceRegistrationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const globalBulkServiceRegistrationState =
    editorStore.globalBulkServiceRegistrationState;
  // env & execution server
  const envOptions =
    globalBulkServiceRegistrationState.serviceConfigState.options
      .filter((info) => info.env !== 'prod')
      .map((info) => ({
        label: info.env.toUpperCase(),
        value: info.env,
      }));
  const selectedEnvOption = globalBulkServiceRegistrationState
    .serviceConfigState.serviceEnv
    ? {
        label:
          globalBulkServiceRegistrationState.serviceConfigState.serviceEnv.toUpperCase(),
        value: globalBulkServiceRegistrationState.serviceConfigState.serviceEnv,
      }
    : null;
  const onServerEnvChange = (
    val: { label: string; value: string } | null,
  ): void => {
    globalBulkServiceRegistrationState.serviceConfigState.updateEnv(val?.value);
  };

  // execution mode
  const serviceTypesOptions =
    globalBulkServiceRegistrationState.serviceConfigState.executionModes
      .filter((mode) => mode !== ServiceExecutionMode.PROD)
      .map((mode) => ({
        label: prettyCONSTName(mode),
        value: mode,
      }));
  const selectedServiceType = globalBulkServiceRegistrationState
    .serviceConfigState.serviceExecutionMode
    ? {
        label: prettyCONSTName(
          globalBulkServiceRegistrationState.serviceConfigState
            .serviceExecutionMode,
        ),
        value:
          globalBulkServiceRegistrationState.serviceConfigState
            .serviceExecutionMode,
      }
    : null;
  const onServiceTypeSelectionChange = (
    val: { label: string; value: ServiceExecutionMode } | null,
  ): void => {
    globalBulkServiceRegistrationState.serviceConfigState.updateType(
      val?.value,
    );
  };

  // version
  const selectedVersion = globalBulkServiceRegistrationState.serviceConfigState
    .projectVersion
    ? {
        label:
          globalBulkServiceRegistrationState.serviceConfigState
            .projectVersion === MASTER_SNAPSHOT_ALIAS
            ? LATEST_PROJECT_REVISION
            : globalBulkServiceRegistrationState.serviceConfigState
                .projectVersion,
        value:
          globalBulkServiceRegistrationState.serviceConfigState.projectVersion,
      }
    : null;
  const onVersionSelectionChange = (
    val: { label: string; value: string } | null,
  ): void => {
    globalBulkServiceRegistrationState.serviceConfigState.setProjectVersion(
      val?.value,
    );
  };
  const versionPlaceholder =
    globalBulkServiceRegistrationState.serviceConfigState.versionOptions ===
    undefined
      ? `Only valid for ${prettyCONSTName(
          ServiceExecutionMode.SEMI_INTERACTIVE,
        )} and ${prettyCONSTName(ServiceExecutionMode.PROD)} service types`
      : !globalBulkServiceRegistrationState.serviceConfigState.versionOptions
            .length
        ? 'Project has no versions'
        : undefined;

  // activate
  const toggleActivatePostRegistration = (): void => {
    globalBulkServiceRegistrationState.setActivatePostRegistration(
      !globalBulkServiceRegistrationState.activatePostRegistration,
    );
  };

  // store model for full interactive
  const toggleUseStoreModel = (): void => {
    globalBulkServiceRegistrationState.serviceConfigState.setUseStoreModelWithFullInteractive(
      !globalBulkServiceRegistrationState.serviceConfigState
        .TEMPORARY__useStoreModel,
    );
  };

  const toggleUseGenerateLineage = (): void => {
    globalBulkServiceRegistrationState.serviceConfigState.setUseGenerateLineage(
      !globalBulkServiceRegistrationState.serviceConfigState
        .TEMPORARY__useGenerateLineage,
    );
  };

  // actions
  const registerService = (): void => {
    globalBulkServiceRegistrationState.setShowRegConfig(false);
    if (selectedEnvOption && selectedServiceType) {
      flowResult(globalBulkServiceRegistrationState.registerServices()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const disableRegistration =
    !selectedEnvOption ||
    !selectedServiceType ||
    globalBulkServiceRegistrationState.serviceConfigState.registrationState
      .isInProgress;

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_EDITOR}
      className="service-registration-editor"
    >
      <PanelHeader title="Register Service">
        <PanelHeaderActions>
          <PanelHeaderActionItem
            className="btn--dark model-loader__header__load-btn"
            onClick={registerService}
            disabled={disableRegistration}
            title="Register Service"
          >
            Register
          </PanelHeaderActionItem>
        </PanelHeaderActions>
      </PanelHeader>
      <PanelLoadingIndicator
        isLoading={
          globalBulkServiceRegistrationState.serviceConfigState
            .registrationState.isInProgress
        }
      />
      <PanelContent>
        <div className="panel__content__form">
          {globalBulkServiceRegistrationState.serviceConfigState
            .registrationState.message && (
            <div className="service-registration-editor__progress-msg">
              {`${globalBulkServiceRegistrationState.serviceConfigState.registrationState.message}...`}
            </div>
          )}

          <PanelFormBooleanField
            isReadOnly={false}
            value={globalBulkServiceRegistrationState.activatePostRegistration}
            name="Activate Service"
            prompt="Activates service after registration"
            update={(value: boolean | undefined): void =>
              toggleActivatePostRegistration()
            }
          />

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
          {globalBulkServiceRegistrationState.serviceConfigState
            .serviceExecutionMode === ServiceExecutionMode.FULL_INTERACTIVE && (
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
                        globalBulkServiceRegistrationState.serviceConfigState
                          .TEMPORARY__useStoreModel,
                    },
                  )}
                  tabIndex={-1}
                >
                  {globalBulkServiceRegistrationState.serviceConfigState
                    .TEMPORARY__useStoreModel ? (
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
            <PanelFormBooleanField
              isReadOnly={false}
              value={
                globalBulkServiceRegistrationState.serviceConfigState
                  .TEMPORARY__useGenerateLineage
              }
              name="Generate Lineage"
              prompt="Use Generate (slower)"
              update={(value: boolean | undefined): void =>
                toggleUseGenerateLineage()
              }
            />
          }
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Project Version
            </div>
            <div className="panel__content__form__section__header__prompt">
              The version of your project you want to use for registration. Only
              relevant for semi-interactive and production services.
            </div>
            <CustomSelectorInput
              options={
                globalBulkServiceRegistrationState.serviceConfigState
                  .versionOptions ?? []
              }
              onChange={onVersionSelectionChange}
              value={selectedVersion}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              disabled={
                globalBulkServiceRegistrationState.serviceConfigState
                  .versionOptions === undefined
              }
              placeholder={versionPlaceholder}
              isLoading={editorStore.sdlcState.isFetchingProjectVersions}
            />
          </div>
        </div>
      </PanelContent>
    </div>
  );
});
