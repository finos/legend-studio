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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActionState,
  assertErrorThrown,
  assertNonEmptyString,
  guaranteeNonNullable,
  LogEvent,
  uuid,
} from '@finos/legend-shared';
import {
  generateServiceManagementUrl,
  LEGEND_STUDIO_APP_EVENT,
} from '@finos/legend-application-studio';
import { createServiceElement } from '../../stores/studio/QueryProductionizerStore.js';
import {
  CheckSquareIcon,
  clsx,
  CustomSelectorInput,
  Dialog,
  Modal,
  ModalTitle,
  Panel,
  PanelDivider,
  PanelFullContent,
  PanelLoadingIndicator,
  SquareIcon,
} from '@finos/legend-art';
import {
  ActionAlertType,
  ActionAlertActionType,
} from '@finos/legend-application';
import {
  type VariableExpression,
  Multiplicity,
  RuntimePointer,
  ServiceExecutionMode,
  validate_ServicePattern,
} from '@finos/legend-graph';
import { type QueryEditorStore } from '@finos/legend-application-query';
import type { UserOption } from '../studio/QueryProductionizer.js';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import { resolveVersion } from '@finos/legend-server-depot';

const validURLParamMultiplicityList = [Multiplicity.ONE, Multiplicity.ZERO_ONE];

export const generateServiceURL = (
  urlPrefix: string | undefined,
  params: VariableExpression[] | undefined,
): string => {
  const paramNames = params
    ?.filter((p) => validURLParamMultiplicityList.includes(p.multiplicity))
    .map((e) => `{${e.name}}`);
  const paramSuffix = paramNames?.length ? `/${paramNames.join('/')}` : '';
  return `${urlPrefix ?? `/${uuid()}`}${paramSuffix}`;
};

export const ServiceRegisterModal = observer(
  (props: {
    editorStore: QueryEditorStore;
    onClose: () => void;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { editorStore, onClose, queryBuilderState } = props;
    const [registrationState] = useState(ActionState.create());
    const [text, setText] = useState('');
    const [activateService, setActivateService] = useState(true);
    const [servicePattern, setServicePattern] = useState(
      generateServiceURL(
        undefined,
        queryBuilderState.parametersState.parameterStates.map(
          (p) => p.parameter,
        ),
      ),
    );
    const [owners, setOwners] = useState<UserOption[]>([]);
    const [isServiceUrlPatternValid, setIsServiceUrlPatternValid] =
      useState(true);
    const onTextChange = (value: string): void => {
      if (value !== text) {
        setText(value);
      }
    };
    const onUserOptionChange = (options: UserOption[]): void => {
      setOwners(options);
    };

    const onChangeServicePattern: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setServicePattern(event.target.value);
      setIsServiceUrlPatternValid(!validate_ServicePattern(event.target.value));
    };
    const serverRegistrationOptions =
      editorStore.applicationStore.config.options
        .TEMPORARY__serviceRegistrationConfig;

    const envOptions = serverRegistrationOptions
      .filter((options) =>
        options.modes.includes(ServiceExecutionMode.SEMI_INTERACTIVE),
      )
      .map((info) => ({
        label: info.env.toUpperCase(),
        value: info.env,
      }));
    const [serviceEnv, setServiceEnv] = useState<string | undefined>(
      envOptions[0]?.value,
    );
    const selectedEnvOption = serviceEnv
      ? {
          label: serviceEnv.toUpperCase(),
          value: serviceEnv,
        }
      : null;
    const onServerEnvChange = (
      val: { label: string; value: string } | null,
    ): void => {
      setServiceEnv(val?.value);
    };
    const toggleActivateService = (): void =>
      setActivateService(!activateService);

    const darkMode =
      !editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    const registerService = editorStore.applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        const projectInfo = editorStore.getProjectInfo();
        if (
          registrationState.isInProgress ||
          !servicePattern ||
          !isServiceUrlPatternValid ||
          !selectedEnvOption ||
          !projectInfo ||
          !queryBuilderState.executionContextState.mapping ||
          !(
            queryBuilderState.executionContextState.runtimeValue instanceof
            RuntimePointer
          )
        ) {
          return;
        }
        try {
          registrationState.inProgress();
          const serverConfig = serverRegistrationOptions.find(
            (option) => option.env === selectedEnvOption.value,
          );
          registrationState.setMessage(`Registering service...`);
          const service = await createServiceElement(
            'model::QueryService',
            servicePattern,
            owners.map((o) => o.value),
            queryBuilderState.buildQuery(),
            queryBuilderState.executionContextState.mapping.path,
            queryBuilderState.executionContextState.runtimeValue
              .packageableRuntime.value.path,
            editorStore.graphManagerState,
          );

          const { groupId, artifactId, versionId } = projectInfo;

          const serviceRegistrationResult =
            await editorStore.graphManagerState.graphManager.registerService(
              service,
              editorStore.graphManagerState.graph,
              groupId,
              artifactId,
              resolveVersion(versionId),
              guaranteeNonNullable(serverConfig?.executionUrl),
              ServiceExecutionMode.SEMI_INTERACTIVE,
            );
          if (activateService) {
            registrationState.setMessage(`Activating service...`);
            await editorStore.graphManagerState.graphManager.activateService(
              guaranteeNonNullable(serverConfig?.executionUrl),
              serviceRegistrationResult.serviceInstanceId,
            );
          }
          assertNonEmptyString(
            serviceRegistrationResult.pattern,
            'Service registration pattern is missing or empty',
          );

          editorStore.applicationStore.alertService.setActionAlertInfo({
            message: `Service with pattern ${
              serviceRegistrationResult.pattern
            } registered ${activateService ? 'and activated ' : ''}`,
            prompt:
              'You can now launch and monitor the operation of your service',
            type: ActionAlertType.STANDARD,
            actions: [
              {
                label: 'Launch Service',
                type: ActionAlertActionType.PROCEED,
                handler: (): void => {
                  editorStore.applicationStore.navigationService.navigator.visitAddress(
                    generateServiceManagementUrl(
                      guaranteeNonNullable(serverConfig?.managementUrl),
                      serviceRegistrationResult.pattern,
                    ),
                  );
                },
                default: true,
              },
              {
                label: 'Close',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              },
            ],
          });
        } catch (error) {
          assertErrorThrown(error);
          editorStore.applicationStore.logService.error(
            LogEvent.create(
              LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE,
            ),
            error,
          );
          editorStore.applicationStore.notificationService.notifyError(error);
        } finally {
          registrationState.reset();
          registrationState.setMessage(undefined);
        }
      },
    );

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={darkMode} className="search-modal">
          <ModalTitle title="Register Service Semi-interactively..." />
          <Panel>
            <PanelLoadingIndicator isLoading={registrationState.isInProgress} />
            <PanelFullContent>
              <div className="service-register-modal__group__content">
                <div className="service-register-modal__input">
                  <div className="service-register-modal__input__label">
                    URL
                  </div>
                  <div className="input-group service-register-modal__input__input">
                    <input
                      className={clsx('input input--dark input-group__input', {
                        'input-group__input--error': Boolean(
                          !isServiceUrlPatternValid,
                        ),
                      })}
                      spellCheck={false}
                      placeholder="/my-service-url"
                      value={servicePattern}
                      onChange={onChangeServicePattern}
                    />
                    {!isServiceUrlPatternValid && (
                      <div className="input-group__error-message">
                        URL pattern is not valid
                      </div>
                    )}
                  </div>
                </div>
                <div className="service-register-modal__input">
                  <div className="service-register-modal__input__label">
                    OWNERS
                  </div>
                  <div className="input-group service-register-modal__input__selector">
                    <CustomSelectorInput
                      className="service-register-modal__input__service-owner__selector"
                      placeholder="Enter an owner..."
                      inputValue={text}
                      darkMode={darkMode}
                      onInputChange={onTextChange}
                      onChange={onUserOptionChange}
                      isMulti={true}
                      allowCreating={true}
                      value={owners}
                    />
                  </div>
                </div>
                <div className="service-register-modal__input">
                  <div className="service-register-modal__input__label">
                    Execution Server
                  </div>
                  <div className="input-group service-register-modal__input__selector">
                    <CustomSelectorInput
                      options={envOptions}
                      onChange={onServerEnvChange}
                      value={selectedEnvOption}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
                <div
                  className="service-register-modal__auto-activation__toggler"
                  onClick={toggleActivateService}
                >
                  <div className="panel__content__form__section__toggler">
                    <button
                      className={clsx(
                        'panel__content__form__section__toggler__btn',
                        {
                          'panel__content__form__section__toggler__btn--toggled':
                            activateService,
                        },
                      )}
                      tabIndex={-1}
                    >
                      {activateService ? <CheckSquareIcon /> : <SquareIcon />}
                    </button>
                    <div className="panel__content__form__section__toggler__prompt">
                      Activate service after registration
                    </div>
                  </div>
                </div>
              </div>
              <PanelDivider />
            </PanelFullContent>
          </Panel>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              onClick={registerService}
              disabled={!queryBuilderState.canBuildQuery}
              title={
                !queryBuilderState.canBuildQuery
                  ? 'Please fix query errors before registering query as service'
                  : undefined
              }
            >
              Register Service
            </button>
            <button className="btn btn--dark" onClick={onClose}>
              Close
            </button>
          </div>
        </Modal>
      </Dialog>
    );
  },
);
