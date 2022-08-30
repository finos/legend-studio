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
  type RelationalDatabaseConnectionValueState,
  CORE_AUTHENTICATION_STRATEGY_TYPE,
  CORE_DATASOURCE_SPEC_TYPE,
  RELATIONAL_DATABASE_TAB_TYPE,
} from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  clsx,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
  TimesIcon,
  ErrorIcon,
  PencilIcon,
} from '@finos/legend-art';
import { capitalize, prettyCONSTName } from '@finos/legend-shared';
import {
  type RelationalDatabaseConnection,
  type Store,
  DatabaseType,
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
  MiddleTierUsernamePasswordAuthenticationStrategy,
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  DatabricksDatasourceSpecification,
  StaticDatasourceSpecification,
  BigQueryDatasourceSpecification,
  RedshiftDatasourceSpecification,
  PackageableElementExplicitReference,
  SpannerDatasourceSpecification,
} from '@finos/legend-graph';
import { runInAction } from 'mobx';
import type { LegendStudioApplicationPlugin } from '../../../../stores/LegendStudioApplicationPlugin.js';
import type { StoreRelational_LegendStudioApplicationPlugin_Extension } from '../../../../stores/StoreRelational_LegendStudioApplicationPlugin_Extension.js';
import { DatabaseBuilder } from './DatabaseBuilder.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  EDITOR_LANGUAGE,
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import { connection_setStore } from '../../../../stores/graphModifier/DSLMapping_GraphModifierHelper.js';
import {
  apiTokenAuthenticationStrategy_setApiToken,
  bigQueryDatasourceSpecification_setDefaultDataset,
  bigQueryDatasourceSpecification_setProjectId,
  bigQueryDatasourceSpecification_setProxyHost,
  bigQueryDatasourceSpecification_setProxyPort,
  databricksDatasourceSpecification_setHostName,
  databricksDatasourceSpecification_setHttpPath,
  databricksDatasourceSpecification_setPort,
  databricksDatasourceSpecification_setProtocol,
  dBConnection_setQuoteIdentifiers,
  dBConnection_setType,
  delegatedKerberosAuthenticationStrategy_setServerPrincipal,
  embeddedH2DatasourceSpecification_setAutoServerMode,
  embeddedH2DatasourceSpecification_setDatabaseName,
  embeddedH2DatasourceSpecification_setDirectory,
  localH2DatasourceSpecification_setTestDataSetupSqls,
  oAuthAuthenticationStrategy_setOauthKey,
  oAuthAuthenticationStrategy_setScopeName,
  redshiftDatasourceSpecification_setClusterID,
  redshiftDatasourceSpecification_setDatabaseName,
  redshiftDatasourceSpecification_setEndpointURL,
  redshiftDatasourceSpecification_setHost,
  redshiftDatasourceSpecification_setPort,
  redshiftDatasourceSpecification_setRegion,
  snowflakeDatasourceSpec_setAccountName,
  snowflakeDatasourceSpec_setAccountType,
  snowflakeDatasourceSpec_setCloudType,
  snowflakeDatasourceSpec_setDatabaseName,
  snowflakeDatasourceSpec_setNonProxyHosts,
  snowflakeDatasourceSpec_setOrganization,
  snowflakeDatasourceSpec_setProxyHost,
  snowflakeDatasourceSpec_setProxyPort,
  snowflakeDatasourceSpec_setQuotedIdentifiersIgnoreCase,
  snowflakeDatasourceSpec_setRegion,
  snowflakeDatasourceSpec_setRole,
  snowflakeDatasourceSpec_setWarehouseName,
  snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference,
  snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference,
  snowflakePublicAuthenticationStrategy_setPublicUserName,
  spannerDatasourceSpecification_setDatabaseId,
  spannerDatasourceSpecification_setHost,
  spannerDatasourceSpecification_setInstanceId,
  spannerDatasourceSpecification_setPort,
  spannerDatasourceSpecification_setProjectId,
  staticDatasourceSpecification_setDatabaseName,
  staticDatasourceSpecification_setHost,
  staticDatasourceSpecification_setPort,
  usernamePasswordAuthenticationStrategy_setBaseVaultReference,
  usernamePasswordAuthenticationStrategy_setPasswordVaultReference,
  usernamePasswordAuthenticationStrategy_setUserNameVaultReference,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setAdditionalGcpScopes,
  middleTierUsernamePasswordAuthenticationStrategy_setVaultReference,
} from '../../../../stores/graphModifier/StoreRelational_GraphModifierHelper.js';

/**
 * NOTE: this is a WIP we did to quickly assemble a modular UI for relational database connection editor
 * This is subjected to change and review, especially in terms in UX.
 */

// TODO: consider to move this to shared
export const ConnectionEditor_BooleanEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    value: boolean | undefined;
    isReadOnly: boolean;
    update: (value: boolean | undefined) => void;
  }) => {
    const { value, propertyName, description, isReadOnly, update } = props;
    const toggle = (): void => {
      if (!isReadOnly) {
        update(!value);
      }
    };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {capitalize(propertyName)}
        </div>
        <div
          className={clsx('panel__content__form__section__toggler', {
            'panel__content__form__section__toggler--disabled': isReadOnly,
          })}
          onClick={toggle}
        >
          <button
            className={clsx('panel__content__form__section__toggler__btn', {
              'panel__content__form__section__toggler__btn--toggled': value,
            })}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {value ? <CheckSquareIcon /> : <SquareIcon />}
          </button>
          <div className="panel__content__form__section__toggler__prompt">
            {description}
          </div>
        </div>
      </div>
    );
  },
);

// TODO: consider to move this to shared
export const ConnectionEditor_StringEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    value: string | undefined;
    isReadOnly: boolean;
    update: (value: string | undefined) => void;
  }) => {
    const { value, propertyName, description, isReadOnly, update } = props;
    const displayValue = value ?? '';
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      update(updatedValue);
    };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {capitalize(propertyName)}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <input
          className="panel__content__form__section__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={displayValue}
          onChange={changeValue}
        />
      </div>
    );
  },
);

// TODO: consider to move this to shared
export const ConnectionEditor_TextEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    value: string | undefined;
    isReadOnly: boolean;
    language: EDITOR_LANGUAGE;
    update: (value: string | undefined) => void;
  }) => {
    const { value, propertyName, description, isReadOnly, language, update } =
      props;

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {capitalize(propertyName)}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <div className="panel__content__form__section__text-editor">
          <StudioTextInputEditor
            inputValue={value ?? ''}
            updateInput={update}
            isReadOnly={isReadOnly}
            language={language}
          />
        </div>
      </div>
    );
  },
);

// TODO: consider to move this to shared
export const ConnectionEditor_ArrayEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    values: string[];
    isReadOnly: boolean;
    update: (updatedValues: string[]) => void;
  }) => {
    const { propertyName, description, values, isReadOnly, update } = props;
    const arrayValues = values;
    // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
    const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
    const [itemValue, setItemValue] = useState<string>('');
    const showAddItemInput = (): void => setShowEditInput(true);
    const showEditItemInput =
      (value: string, idx: number): (() => void) =>
      (): void => {
        setItemValue(value);
        setShowEditInput(idx);
      };
    const hideAddOrEditItemInput = (): void => {
      setShowEditInput(false);
      setItemValue('');
    };
    const changeItemInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setItemValue(event.target.value);
    const addValue = (): void => {
      if (itemValue && !isReadOnly && !arrayValues.includes(itemValue)) {
        update(arrayValues.concat([itemValue]));
      }
      hideAddOrEditItemInput();
    };
    const updateValue =
      (idx: number): (() => void) =>
      (): void => {
        if (itemValue && !isReadOnly && !arrayValues.includes(itemValue)) {
          runInAction(() => {
            arrayValues[idx] = itemValue;
          });
          update(arrayValues);
        }
        hideAddOrEditItemInput();
      };
    const deleteValue =
      (idx: number): (() => void) =>
      (): void => {
        if (!isReadOnly) {
          runInAction(() => arrayValues.splice(idx, 1));
          update(arrayValues);
          // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
          if (typeof showEditInput === 'number' && showEditInput > idx) {
            setShowEditInput(showEditInput - 1);
          }
        }
      };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {capitalize(propertyName)}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <div className="panel__content__form__section__list">
          <div className="panel__content__form__section__list__items">
            {arrayValues.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={value}
                className={
                  showEditInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      disabled={isReadOnly}
                      value={itemValue}
                      onChange={changeItemInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={isReadOnly || arrayValues.includes(itemValue)}
                        onClick={updateValue(idx)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        disabled={isReadOnly}
                        onClick={hideAddOrEditItemInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value">
                      {value}
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        disabled={isReadOnly}
                        onClick={showEditItemInput(value, idx)}
                        tabIndex={-1}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteValue(idx)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* ADD NEW VALUE */}
            {showEditInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={itemValue}
                  onChange={changeItemInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={isReadOnly || arrayValues.includes(itemValue)}
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    disabled={isReadOnly}
                    onClick={hideAddOrEditItemInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {showEditInput !== true && (
            <div className="panel__content__form__section__list__new-item__add">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={showAddItemInput}
                tabIndex={-1}
              >
                Add Value
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

const LocalH2DatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: LocalH2DatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    const SQLValue = sourceSpec.testDataSetupSqls.join('\n');
    // TODO: support CSV and toggler to go to CSV mode
    return (
      <>
        <ConnectionEditor_TextEditor
          isReadOnly={isReadOnly}
          value={SQLValue}
          propertyName={'test data setup SQL'}
          language={EDITOR_LANGUAGE.SQL}
          update={(value: string | undefined): void =>
            localH2DatasourceSpecification_setTestDataSetupSqls(
              sourceSpec,
              value ? [value] : [],
            )
          }
        />
      </>
    );
  },
);

// data source
const StaticDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: StaticDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    const changePort: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      staticDatasourceSpecification_setPort(sourceSpec, parseInt(val, 10));
    };

    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          propertyName={'host'}
          update={(value: string | undefined): void =>
            staticDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            port
          </div>
          <input
            className="panel__content__form__section__input panel__content__form__section__number-input"
            spellCheck={false}
            type="number"
            disabled={isReadOnly}
            value={sourceSpec.port}
            onChange={changePort}
          />
        </div>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName={'database'}
          update={(value: string | undefined): void =>
            staticDatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const EmbeddedH2DatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: EmbeddedH2DatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName={'database'}
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.directory}
          propertyName={'directory'}
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDirectory(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_BooleanEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.autoServerMode}
          propertyName={'auto server mode'}
          update={(value?: boolean): void =>
            embeddedH2DatasourceSpecification_setAutoServerMode(
              sourceSpec,
              Boolean(value),
            )
          }
        />
      </>
    );
  },
);

const DatabricksDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: DatabricksDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.hostname}
          propertyName="hostname"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setHostName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.port}
          propertyName="port"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setPort(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.protocol}
          propertyName="protocol"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setProtocol(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.httpPath}
          propertyName="httpPath"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setHttpPath(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const SnowflakeDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: SnowflakeDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.accountName}
          propertyName="account"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountName(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          propertyName="region"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRegion(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.warehouseName}
          propertyName="warehouse"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setWarehouseName(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName="database"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setDatabaseName(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.cloudType}
          propertyName="cloud type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setCloudType(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          propertyName="proxy host"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyHost(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          propertyName="proxy port"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyPort(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.nonProxyHosts}
          propertyName="non proxy hosts"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setNonProxyHosts(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.organization}
          propertyName="organization"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setOrganization(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.accountType}
          propertyName="account type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountType(sourceSpec, value)
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.role}
          propertyName="role"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRole(sourceSpec, value)
          }
        />
        {/* TODO: we should reconsider adding this field, it's an optional boolean, should we default it to `undefined` when it's `false`?*/}
        <ConnectionEditor_BooleanEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.quotedIdentifiersIgnoreCase}
          propertyName="quoted identifiers ignore case"
          description="Controls whether Snowflake will treat alphabetic characters in double-quoted identifiers as uppercase"
          update={(value: boolean | undefined): void =>
            snowflakeDatasourceSpec_setQuotedIdentifiersIgnoreCase(
              sourceSpec,
              Boolean(value),
            )
          }
        />
      </>
    );
  },
);

const RedshiftDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: RedshiftDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    const changePort: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      redshiftDatasourceSpecification_setPort(sourceSpec, parseInt(val, 10));
    };
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          propertyName="host"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            port
          </div>
          <input
            className="panel__content__form__section__input panel__content__form__section__number-input"
            spellCheck={false}
            type="number"
            disabled={isReadOnly}
            value={sourceSpec.port}
            onChange={changePort}
          />
        </div>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName="database"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />

        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          propertyName="region"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setRegion(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.clusterID}
          propertyName="cluster"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setClusterID(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.endpointURL}
          propertyName="endpointURL"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setEndpointURL(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const BigQueryDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: BigQueryDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.projectId}
          propertyName={'project id'}
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProjectId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.defaultDataset}
          propertyName={'default dataset'}
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setDefaultDataset(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          propertyName="proxy host"
          description="Specifies proxy host for connection to GCP BigQuery"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProxyHost(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          propertyName="proxy port"
          description="Specifies proxy port for connection to GCP BigQuery"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProxyPort(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const SpannerDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: SpannerDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.projectId}
          propertyName="project id"
          description="Your Google Cloud Platform (GCP) project identifier"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setProjectId(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.instanceId}
          propertyName="instance id"
          description="Spanner instance identifier in Google Cloud Platform (GCP)"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setInstanceId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseId}
          propertyName="database id"
          description="Spanner database identifier"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setDatabaseId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          propertyName="host"
          description="Specifies the connection host. Leave blank to use GCP defaults"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          propertyName="port"
          description="Specifies the connection port. Leave blank to use GCP defaults"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setPort(sourceSpec, value ?? '')
          }
        />
      </>
    );
  },
);

// auth strategy

const DelegatedKerberosAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: DelegatedKerberosAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.serverPrincipal}
          propertyName={'server principal'}
          update={(value: string | undefined): void =>
            delegatedKerberosAuthenticationStrategy_setServerPrincipal(
              authSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const ApiTokenAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: ApiTokenAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.apiToken}
          propertyName={'apiTokenRef'}
          update={(value: string | undefined): void =>
            apiTokenAuthenticationStrategy_setApiToken(authSpec, value ?? '')
          }
        />
      </>
    );
  },
);

const SnowflakePublicAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: SnowflakePublicAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.privateKeyVaultReference}
          propertyName={'private key vault reference'}
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.passPhraseVaultReference}
          propertyName={'pass phrase vault reference'}
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.publicUserName}
          propertyName={'public user name'}
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPublicUserName(
              authSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const OAuthAuthenticationStrategyEditor = observer(
  (props: { authSpec: OAuthAuthenticationStrategy; isReadOnly: boolean }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.oauthKey}
          propertyName={'oauth key'}
          update={(value: string | undefined): void =>
            oAuthAuthenticationStrategy_setOauthKey(authSpec, value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.scopeName}
          propertyName={'scope name'}
          update={(value: string | undefined): void =>
            oAuthAuthenticationStrategy_setScopeName(authSpec, value ?? '')
          }
        />
      </>
    );
  },
);

const UsernamePasswordAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: UsernamePasswordAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.baseVaultReference}
          propertyName={'base vault reference'}
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setBaseVaultReference(
              authSpec,
              value,
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.userNameVaultReference}
          propertyName={'user name vault reference'}
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setUserNameVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.passwordVaultReference}
          propertyName={'password vault reference'}
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setPasswordVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);
// Middle Tier Username Password Authentication Strategy obtains credentials(username and password) from the provided vault reference
const MiddleTierUsernamePasswordAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: MiddleTierUsernamePasswordAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.vaultReference}
          propertyName={'vault reference'}
          description="Specifies the cred vault reference containing connection credentials"
          update={(value: string | undefined): void =>
            middleTierUsernamePasswordAuthenticationStrategy_setVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
      </>
    );
  },
);

const GCPWorkloadIdentityFederationAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: GCPWorkloadIdentityFederationAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    const GCPScopes = authSpec.additionalGcpScopes.join('\n');
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.serviceAccountEmail}
          propertyName={'Service Account Email'}
          update={(value: string | undefined): void =>
            gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail(
              authSpec,
              value ?? '',
            )
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={GCPScopes}
          propertyName={'Additional GCP Scopes'}
          update={(value: string | undefined): void =>
            gcpWorkloadIdentityFederationAuthenticationStrategy_setAdditionalGcpScopes(
              authSpec,
              value ? [value] : [],
            )
          }
        />
      </>
    );
  },
);

const RelationalConnectionStoreEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const connection = connectionValueState.connection;
    const databaseBuilderState = connectionValueState.databaseBuilderState;
    // store
    const isStoreEmpty = connectionValueState.storeValidationResult;
    const noStoreLabel = (
      <div
        className="relational-connection-editor__store-option--empty"
        title={isStoreEmpty?.messages.join('\n') ?? ''}
      >
        <div className="relational-connection-editor__store-option--empty__label">
          (none)
        </div>
        <ErrorIcon />
      </div>
    );
    const stores =
      connectionValueState.editorStore.graphManagerState.graph.ownStores;
    const options = stores.map(buildElementOption);
    const store = connection.store.value;
    const selectedStore = {
      value: store,
      label: isStoreEmpty ? noStoreLabel : store.path,
    };
    const onStoreChange = (
      val: PackageableElementOption<Store> | null,
    ): void => {
      if (val) {
        connection_setStore(
          connection,
          PackageableElementExplicitReference.create(val.value),
        );
      }
    };
    const openDatabaseBuilder = (): void =>
      databaseBuilderState.setShowModal(true);

    return (
      <div className="relational-connection-editor">
        <div className="panel__content relational-connection-editor__auth__content">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Store
            </div>
            <CustomSelectorInput
              options={options}
              onChange={onStoreChange}
              value={selectedStore}
              darkMode={true}
              disabled={isReadOnly}
              hasError={isStoreEmpty}
            />
          </div>
          <div>
            <button className="btn--dark" onClick={openDatabaseBuilder}>
              Build Database
            </button>
          </div>
        </div>
        <DatabaseBuilder
          databaseBuilderState={databaseBuilderState}
          isReadOnly={isReadOnly}
        />
      </div>
    );
  },
);

const renderDatasourceSpecificationEditor = (
  connection: RelationalDatabaseConnection,
  isReadOnly: boolean,
  plugins: LegendStudioApplicationPlugin[],
): React.ReactNode => {
  const sourceSpec = connection.datasourceSpecification;
  if (sourceSpec instanceof StaticDatasourceSpecification) {
    return (
      <StaticDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof EmbeddedH2DatasourceSpecification) {
    return (
      <EmbeddedH2DatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof DatabricksDatasourceSpecification) {
    return (
      <DatabricksDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof SnowflakeDatasourceSpecification) {
    return (
      <SnowflakeDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof BigQueryDatasourceSpecification) {
    return (
      <BigQueryDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof RedshiftDatasourceSpecification) {
    return (
      <RedshiftDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof LocalH2DatasourceSpecification) {
    return (
      <LocalH2DatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (sourceSpec instanceof SpannerDatasourceSpecification) {
    return (
      <SpannerDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else {
    const extraDatasourceSpecificationEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_LegendStudioApplicationPlugin_Extension
        ).getExtraDatasourceSpecificationEditorRenderers?.() ?? [],
    );
    for (const editorRenderer of extraDatasourceSpecificationEditorRenderers) {
      const editor = editorRenderer(sourceSpec, isReadOnly);
      if (editor) {
        return editor;
      }
    }
    // TODO: create unsupported screen
    return null;
  }
};

const renderAuthenticationStrategyEditor = (
  connection: RelationalDatabaseConnection,
  isReadOnly: boolean,
  plugins: LegendStudioApplicationPlugin[],
): React.ReactNode => {
  const authSpec = connection.authenticationStrategy;
  if (authSpec instanceof DelegatedKerberosAuthenticationStrategy) {
    return (
      <DelegatedKerberosAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (authSpec instanceof SnowflakePublicAuthenticationStrategy) {
    return (
      <SnowflakePublicAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (authSpec instanceof ApiTokenAuthenticationStrategy) {
    return (
      <ApiTokenAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (authSpec instanceof OAuthAuthenticationStrategy) {
    return (
      <OAuthAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (authSpec instanceof UsernamePasswordAuthenticationStrategy) {
    return (
      <UsernamePasswordAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (
    authSpec instanceof MiddleTierUsernamePasswordAuthenticationStrategy
  ) {
    return (
      <MiddleTierUsernamePasswordAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else if (
    authSpec instanceof GCPWorkloadIdentityFederationAuthenticationStrategy
  ) {
    return (
      <GCPWorkloadIdentityFederationAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else {
    const extraAuthenticationStrategyEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_LegendStudioApplicationPlugin_Extension
        ).getExtraAuthenticationStrategyEditorRenderers?.() ?? [],
    );
    for (const editorRenderer of extraAuthenticationStrategyEditorRenderers) {
      const editor = editorRenderer(authSpec, isReadOnly);
      if (editor) {
        return editor;
      }
    }
    // TODO: create unsupported screen
    return null;
  }
};
const RelationalConnectionGeneralEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const connection = connectionValueState.connection;
    const editorStore = useEditorStore();
    const plugins = editorStore.pluginManager.getApplicationPlugins();
    // database type
    const typeOptions = Object.values(DatabaseType).map((e) => ({
      value: e,
      label: e,
    }));
    const selectedType = {
      value: connection.type,
      label: connection.type,
    };
    const onTypeChange = (
      val: { label: string; value: DatabaseType } | null,
    ): void => {
      dBConnection_setType(connection, val?.value ?? DatabaseType.H2);
    };

    // source spec type
    const sourceSpecOptions = (
      Object.values(CORE_DATASOURCE_SPEC_TYPE) as string[]
    )
      .concat(
        plugins.flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_LegendStudioApplicationPlugin_Extension
            ).getExtraDatasourceSpecificationTypes?.() ?? [],
        ),
      )
      .map((e) => ({
        value: e,
        label: prettyCONSTName(e),
      }));
    const selectedSourceSpec = {
      value: connectionValueState.selectedDatasourceSpec,
      label: prettyCONSTName(connectionValueState.selectedDatasourceSpec),
    };
    const onSourceSpecChange = (
      val: { label: string; value: string } | null,
    ): void => {
      connectionValueState.changeDatasourceSpec(
        val?.value ?? CORE_DATASOURCE_SPEC_TYPE.STATIC,
      );
    };

    // auth type
    const authOptions = (
      Object.values(CORE_AUTHENTICATION_STRATEGY_TYPE) as string[]
    )
      .concat(
        plugins.flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_LegendStudioApplicationPlugin_Extension
            ).getExtraAuthenticationStrategyTypes?.() ?? [],
        ),
      )
      .map((e) => ({
        value: e,
        label: prettyCONSTName(e),
      }));
    const selectedAuth = {
      value: connectionValueState.selectedAuth,
      label: prettyCONSTName(connectionValueState.selectedAuth),
    };
    const onAuthStrategyChange = (
      val: { label: string; value: string } | null,
    ): void => {
      connectionValueState.changeAuthenticationStrategy(
        val?.value ?? CORE_AUTHENTICATION_STRATEGY_TYPE.OAUTH,
      );
    };

    return (
      <div className="relational-connection-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={200} minSize={15}>
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">general</div>
                </div>
              </div>
              <div className="panel__content relational-connection-editor__general">
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Database type
                  </div>
                  <CustomSelectorInput
                    options={typeOptions}
                    onChange={onTypeChange}
                    value={selectedType}
                    darkMode={true}
                  />
                </div>
                <ConnectionEditor_BooleanEditor
                  isReadOnly={isReadOnly}
                  value={connection.quoteIdentifiers}
                  propertyName="Quote identifiers"
                  description="Specifies whether to use double-quotes for SQL identifiers"
                  update={(value?: boolean): void =>
                    dBConnection_setQuoteIdentifiers(connection, Boolean(value))
                  }
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel>
            <div className="relational-connection-editor__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={450} minSize={50}>
                  <div className="relational-connection-editor__auth">
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__label">
                          datasource spec
                        </div>
                      </div>
                    </div>
                    <div className="panel__content relational-connection-editor__auth__content">
                      <div className="panel__content__form__section">
                        <div className="panel__content__form__section__header__label">
                          Datasource
                        </div>
                        <CustomSelectorInput
                          options={sourceSpecOptions}
                          onChange={onSourceSpecChange}
                          value={selectedSourceSpec}
                          darkMode={true}
                        />
                      </div>
                      <div className="relational-connection-editor__auth__properties">
                        {renderDatasourceSpecificationEditor(
                          connection,
                          isReadOnly,
                          plugins,
                        )}
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel>
                  <div className="relational-connection-editor__source">
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__label">
                          authentication spec
                        </div>
                      </div>
                    </div>
                    <div className="panel__content relational-connection-editor__source__content">
                      <div className="panel__content__form__section">
                        <div className="panel__content__form__section__header__label">
                          Authentication
                        </div>
                        <CustomSelectorInput
                          options={authOptions}
                          onChange={onAuthStrategyChange}
                          value={selectedAuth}
                          darkMode={true}
                        />
                      </div>
                      <div className="relational-connection-editor__source__properties">
                        {renderAuthenticationStrategyEditor(
                          connection,
                          isReadOnly,
                          plugins,
                        )}
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const RelationalDatabaseConnectionEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const selectedTab = connectionValueState.selectedTab;
    const changeTab =
      (tab: RELATIONAL_DATABASE_TAB_TYPE): (() => void) =>
      (): void =>
        connectionValueState.setSelectedTab(tab);
    return (
      <>
        <div className="panel__header">
          <div className="uml-element-editor__tabs">
            {Object.values(RELATIONAL_DATABASE_TAB_TYPE).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('relational-connection-editor__tab', {
                  'relational-connection-editor__tab--active':
                    tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="panel__content">
          {selectedTab === RELATIONAL_DATABASE_TAB_TYPE.GENERAL && (
            <RelationalConnectionGeneralEditor
              connectionValueState={connectionValueState}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === RELATIONAL_DATABASE_TAB_TYPE.STORE && (
            <RelationalConnectionStoreEditor
              connectionValueState={connectionValueState}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </>
    );
  },
);
