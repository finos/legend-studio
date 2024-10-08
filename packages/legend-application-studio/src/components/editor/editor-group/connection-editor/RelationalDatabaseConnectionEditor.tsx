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
import { useState } from 'react';
import {
  type RelationalDatabaseConnectionValueState,
  RELATIONAL_DATABASE_TAB_TYPE,
  POST_PROCESSOR_TYPE,
} from '../../../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  CustomSelectorInput,
  ErrorIcon,
  FilledWindowMaximizeIcon,
  PanelHeader,
  PlusIcon,
  PanelFormTextField,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PanelListSelectorItem,
  ControlledDropdownMenu,
  PanelTabs,
  BlankPanelContent,
  ResizablePanelSplitterLine,
  PanelContent,
  Panel,
  Badge,
  PanelListSelectorItemLabel,
  PanelFormBooleanField,
  PanelHeaderActions,
  PanelDivider,
  PanelFormSection,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  Button,
} from '@finos/legend-art';
import {
  type RelationalDatabaseConnection,
  type Store,
  type PostProcessor,
  type DatasourceSpecification,
  type AuthenticationStrategy,
  type PackageableConnection,
  DatabaseType,
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
  MiddleTierUsernamePasswordAuthenticationStrategy,
  TrinoDelegatedKerberosAuthenticationStrategy,
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  DatabricksDatasourceSpecification,
  StaticDatasourceSpecification,
  BigQueryDatasourceSpecification,
  RedshiftDatasourceSpecification,
  PackageableElementExplicitReference,
  MapperPostProcessor,
  SpannerDatasourceSpecification,
  TrinoDatasourceSpecification,
  guaranteeRelationalDatabaseConnection,
} from '@finos/legend-graph';
import type { LegendStudioApplicationPlugin } from '../../../../stores/LegendStudioApplicationPlugin.js';
import type { STO_Relational_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/STO_Relational_LegendStudioApplicationPlugin_Extension.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { connection_setStore } from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
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
  snowflakeDatasourceSpec_setEnableQueryTags,
  snowflakeDatasourceSpec_setRegion,
  snowflakeDatasourceSpec_setRole,
  snowflakeDatasourceSpec_setWarehouseName,
  snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference,
  snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference,
  snowflakePublicAuthenticationStrategy_setPublicUserName,
  spannerDatasourceSpecification_setDatabaseId,
  spannerDatasourceSpecification_setProxyHost,
  spannerDatasourceSpecification_setInstanceId,
  spannerDatasourceSpecification_setProxyPort,
  spannerDatasourceSpecification_setProjectId,
  staticDatasourceSpecification_setDatabaseName,
  staticDatasourceSpecification_setHost,
  staticDatasourceSpecification_setPort,
  trinoDatasourceSpecification_setHost,
  trinoDatasourceSpecification_setPort,
  trinoDatasourceSpecification_setCatalog,
  trinoDatasourceSpecification_setSchema,
  trinoDatasourceSpecification_setClientTags,
  trinoDatasourceSpecification_setSsl,
  trinoDatasourceSpecification_setTrustStorePathVaultReference,
  trinoDatasourceSpecification_setTrustStorePasswordVaultReference,
  trinoDelegatedKerberosAuthenticationStrategy_setKerberosRemoteServiceName,
  trinoDelegatedKerberosAuthenticationStrategy_setKerberosUseCanonicalHostname,
  usernamePasswordAuthenticationStrategy_setBaseVaultReference,
  usernamePasswordAuthenticationStrategy_setPasswordVaultReference,
  usernamePasswordAuthenticationStrategy_setUserNameVaultReference,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setAdditionalGcpScopes,
  middleTierUsernamePasswordAuthenticationStrategy_setVaultReference,
  relationalDatabaseConnection_addPostProcessor,
  relationalDatabaseConnection_deletePostProcessor,
  snowflakeDatasourceSpec_setTempTableDb,
  snowflakeDatasourceSpec_setTempTableSchema,
} from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';
import { MapperPostProcessorEditor } from './post-processor-editor/MapperPostProcessorEditor.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import type { MapperPostProcessorEditorState } from '../../../../stores/editor/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
import { prettyCONSTName, uniq } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';

export type RelationalDatabaseConnectionOption = {
  label: React.ReactNode;
  value: PackageableConnection;
};

export const buildRelationalDatabaseConnectionOption = (
  connection: PackageableConnection,
): RelationalDatabaseConnectionOption => {
  const connectionValue = guaranteeRelationalDatabaseConnection(connection);
  return {
    value: connection,
    label: (
      <div className="sql-playground__config__connection-selector__option">
        <div className="sql-playground__config__connection-selector__option__label">
          {connection.name}
        </div>
        <div className="sql-playground__config__connection-selector__option__type">
          {connectionValue.type}
        </div>
        <div className="sql-playground__config__connection-selector__option__path">
          {connection.path}
        </div>
      </div>
    ),
  };
};

const LocalH2DatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: LocalH2DatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const applicationStore = useApplicationStore();
    const { sourceSpec, isReadOnly } = props;
    const [showPopUp, setShowPopUp] = useState(false);
    const openInPopUp = (): void => setShowPopUp(true);
    const closePopUp = (): void => setShowPopUp(false);
    // TODO?: support CSV and toggler to go to CSV mode
    const SQLValue = sourceSpec.testDataSetupSqls.join('\n');

    return (
      <>
        {showPopUp && (
          <div>
            <Dialog open={showPopUp} onClose={closePopUp}>
              <Modal
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                className="editor-modal"
              >
                <ModalHeader title="test data setup SQL" />
                <ModalBody className="modal__body__large">
                  <CodeEditor
                    inputValue={SQLValue}
                    updateInput={(value: string | undefined): void =>
                      localH2DatasourceSpecification_setTestDataSetupSqls(
                        sourceSpec,
                        value ? [value] : [],
                      )
                    }
                    isReadOnly={isReadOnly}
                    language={CODE_EDITOR_LANGUAGE.SQL}
                  />
                </ModalBody>
                <ModalFooter>
                  <ModalFooterButton
                    onClick={closePopUp}
                    text="Close"
                    type="secondary"
                  />
                </ModalFooter>
              </Modal>
            </Dialog>
          </div>
        )}
        <div>
          <div className="panel__content__form__section__header__label">
            Test Data Setup SQL
            <Button
              className="btn--icon--small btn--icon--margin--left"
              onClick={openInPopUp}
              title="Open..."
            >
              <FilledWindowMaximizeIcon />
            </Button>
          </div>
          <div className="panel__content__form__section__text-editor">
            <CodeEditor
              inputValue={SQLValue}
              updateInput={(value: string | undefined): void =>
                localH2DatasourceSpecification_setTestDataSetupSqls(
                  sourceSpec,
                  value ? [value] : [],
                )
              }
              isReadOnly={isReadOnly}
              language={CODE_EDITOR_LANGUAGE.SQL}
            />
          </div>
        </div>
      </>
    );
  },
);

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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          name="host (required)"
          update={(value: string | undefined): void =>
            staticDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            port
          </div>
          <input
            className="panel__content__form__section__input panel__content__form__section__number-input"
            spellCheck={false}
            type="number (required)"
            disabled={isReadOnly}
            value={sourceSpec.port}
            onChange={changePort}
          />
        </PanelFormSection>
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database (required)"
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.directory}
          name="directory (required)"
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDirectory(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={sourceSpec.autoServerMode}
          name="auto server mode (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.hostname}
          name="hostname (required)"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setHostName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.port}
          name="port (required)"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setPort(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.protocol}
          name="protocol (required)"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setProtocol(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.httpPath}
          name="httpPath (required)"
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

const TrinoDatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: TrinoDatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    const changePort: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      trinoDatasourceSpecification_setPort(sourceSpec, parseInt(val, 10));
    };
    return (
      <>
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          name="host (required)"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            port (required)
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.catalog}
          name="catalog"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setCatalog(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.schema}
          name="schema"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setSchema(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.clientTags}
          name="clientTags"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setClientTags(sourceSpec, value)
          }
        />
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={sourceSpec.sslSpecification.ssl}
          name="SSL"
          update={(value?: boolean): void =>
            trinoDatasourceSpecification_setSsl(sourceSpec, Boolean(value))
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.sslSpecification.trustStorePathVaultReference}
          name="TrustStorePathVaultReference"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setTrustStorePathVaultReference(
              sourceSpec,
              value,
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.sslSpecification.trustStorePasswordVaultReference}
          name="TrustStorePasswordVaultReference"
          update={(value: string | undefined): void =>
            trinoDatasourceSpecification_setTrustStorePasswordVaultReference(
              sourceSpec,
              value,
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.accountName}
          name="account (required)"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          name="region (required)"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRegion(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.warehouseName}
          name="warehouse (required)"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setWarehouseName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database (required)"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setDatabaseName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.cloudType}
          name="cloud type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setCloudType(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          name="proxy host"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyHost(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          name="proxy port"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyPort(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.nonProxyHosts}
          name="non proxy hosts"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setNonProxyHosts(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.organization}
          name="organization"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setOrganization(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.accountType}
          name="account type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountType(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.role}
          name="role"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRole(sourceSpec, value)
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.tempTableDb}
          name="Temp Table DB"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setTempTableDb(
              sourceSpec,
              value ?? undefined,
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.tempTableSchema}
          name="Temp Table Schema"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setTempTableSchema(
              sourceSpec,
              value ?? undefined,
            )
          }
        />
        {/* TODO: we should reconsider adding this field, it's an optional boolean, should we default it to `undefined` when it's `false`?*/}
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={sourceSpec.quotedIdentifiersIgnoreCase}
          name="quoted identifiers ignore case"
          prompt="Controls whether Snowflake will treat alphabetic characters in double-quoted identifiers as uppercase"
          update={(value: boolean | undefined): void =>
            snowflakeDatasourceSpec_setQuotedIdentifiersIgnoreCase(
              sourceSpec,
              Boolean(value),
            )
          }
        />
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={sourceSpec.enableQueryTags}
          name="Enable Query Tags"
          prompt="Controls whether engine sets a tag on each query for identification"
          update={(value: boolean | undefined): void =>
            snowflakeDatasourceSpec_setEnableQueryTags(
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          name="host (required)"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            port (required)
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database (required)"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />

        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          name="region (required)"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setRegion(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.clusterID}
          name="cluster (required)"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setClusterID(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.endpointURL}
          name="endpointURL"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.projectId}
          name="project id (required)"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProjectId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.defaultDataset}
          name="default dataset"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setDefaultDataset(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          name="proxy host"
          prompt="Specifies proxy host for connection to GCP BigQuery"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProxyHost(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          name="proxy port"
          prompt="Specifies proxy port for connection to GCP BigQuery"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.projectId}
          name="project id (required)"
          prompt="Your Google Cloud Platform (GCP) project identifier"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setProjectId(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.instanceId}
          name="instance id (required)"
          prompt="Spanner instance identifier in Google Cloud Platform (GCP)"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setInstanceId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseId}
          name="database id (required)"
          prompt="Spanner database identifier"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setDatabaseId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          name="proxyHost"
          prompt="Specifies the connection host. Leave blank to use GCP defaults"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setProxyHost(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          name="proxyPort"
          prompt="Specifies the connection port. Leave blank to use GCP defaults"
          update={(value: string | undefined): void =>
            spannerDatasourceSpecification_setProxyPort(sourceSpec, value ?? '')
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.serverPrincipal}
          name="server principal"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.apiToken}
          name="apiTokenRef (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.privateKeyVaultReference}
          name="private key vault reference (required)"
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.passPhraseVaultReference}
          name="pass phrase vault reference (required)"
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.publicUserName}
          name="public user name (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.oauthKey}
          name="oauth key (required)"
          update={(value: string | undefined): void =>
            oAuthAuthenticationStrategy_setOauthKey(authSpec, value ?? '')
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.scopeName}
          name="scope name (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.baseVaultReference}
          name="base vault reference"
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setBaseVaultReference(
              authSpec,
              value,
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.userNameVaultReference}
          name="user name vault reference (required)"
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setUserNameVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.passwordVaultReference}
          name="password vault reference (required)"
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.vaultReference}
          name="vault reference (required)"
          prompt="Specifies the credential vault reference containing connection credentials"
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

const TrinoDelegatedKerberosAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: TrinoDelegatedKerberosAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.kerberosRemoteServiceName}
          name="Kerberos Remote Service Name (required)"
          prompt="Specifies the Kerberos Remote Service Name"
          update={(value: string | undefined): void =>
            trinoDelegatedKerberosAuthenticationStrategy_setKerberosRemoteServiceName(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={authSpec.kerberosUseCanonicalHostname}
          name="kerberosUseCanonicalHostname"
          prompt="Specifies KerberosUseCanonicalHostname"
          update={(value?: boolean): void =>
            trinoDelegatedKerberosAuthenticationStrategy_setKerberosUseCanonicalHostname(
              authSpec,
              Boolean(value),
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
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={authSpec.serviceAccountEmail}
          name="Service Account Email (required)"
          update={(value: string | undefined): void =>
            gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextField
          isReadOnly={isReadOnly}
          value={GCPScopes}
          name="Additional GCP Scopes"
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
    const applicationStore = connectionValueState.editorStore.applicationStore;
    const connection = connectionValueState.connection;
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
      connectionValueState.editorStore.explorerTreeState.buildDatabase(
        connection,
        isReadOnly,
      );

    return (
      <div className="relational-connection-editor">
        <PanelContent className="relational-connection-editor__auth__content">
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Store
            </div>
            <CustomSelectorInput
              options={options}
              onChange={onStoreChange}
              value={selectedStore}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              disabled={isReadOnly}
              hasError={isStoreEmpty}
            />
            <PanelDivider />
            <button
              className="relational-connection-editor-btn btn--dark"
              onClick={openDatabaseBuilder}
            >
              Build Database
            </button>
          </PanelFormSection>
        </PanelContent>
      </div>
    );
  },
);

const renderEditorPostProcessor = (
  connectionValueState: RelationalDatabaseConnectionValueState,
  postProcessor: PostProcessor,
  isReadOnly: boolean,
  plugins: LegendStudioApplicationPlugin[],
): React.ReactNode => {
  if (postProcessor instanceof MapperPostProcessor) {
    return (
      <MapperPostProcessorEditor
        postProcessorState={
          connectionValueState.postProcessorState as MapperPostProcessorEditorState
        }
        isReadOnly={isReadOnly}
        postProcessor={postProcessor}
      />
    );
  } else {
    const extraPostProcessorEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
        ).getExtraPostProcessorEditorRenderers?.() ?? [],
    );
    for (const editorRenderer of extraPostProcessorEditorRenderers) {
      const editor = editorRenderer(postProcessor, connectionValueState, false);
      if (editor) {
        return editor;
      }
    }
    return (
      <UnsupportedEditorPanel
        isReadOnly={true}
        text="Can't display post-processor in form mode"
      />
    );
  }
};

const PostProcessorRelationalConnectionEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;

    const connection = connectionValueState.connection;

    const postProcessors = connection.postProcessors;

    const editorStore = useEditorStore();
    const observerContext = editorStore.changeDetectionState.observerContext;
    const plugins = editorStore.pluginManager.getApplicationPlugins();

    const postProcessorState = connectionValueState.postProcessorState;

    const deletePostProcessor =
      (postProcessor: PostProcessor): (() => void) =>
      (): void => {
        relationalDatabaseConnection_deletePostProcessor(
          connectionValueState,
          postProcessor,
        );
        if (
          postProcessor ===
          connectionValueState.postProcessorState?.postProcessor
        ) {
          connectionValueState.postProcessorState.setPostProcessorState(
            undefined,
          );
        }
      };
    const postProcessorOptions = (
      Object.values(POST_PROCESSOR_TYPE) as string[]
    )
      .concat(
        plugins.flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
            ).getExtraPostProcessorClassifiers?.() ?? [],
        ),
      )
      .map((type) => ({
        value: type,
        label: type,
      }));

    const addPostProcessor =
      (postProcessorType: string): (() => void) =>
      (): void => {
        switch (postProcessorType) {
          case POST_PROCESSOR_TYPE.MAPPER: {
            relationalDatabaseConnection_addPostProcessor(
              connectionValueState,
              new MapperPostProcessor(),
              observerContext,
            );
            break;
          }
          default: {
            const extraPostProcessorCreators = plugins.flatMap(
              (plugin) =>
                (
                  plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
                ).getExtraPostProcessorCreators?.() ?? [],
            );
            for (const creator of extraPostProcessorCreators) {
              creator(postProcessorType, connectionValueState, observerContext);
            }
          }
        }

        connectionValueState.postProcessorState?.setPostProcessorState(
          connectionValueState.connection.postProcessors[
            connectionValueState.connection.postProcessors.length - 1
          ],
        );
      };

    const selectPostProcessor = (postProcessor: PostProcessor): void => {
      connectionValueState.selectPostProcessor(postProcessor);
    };

    const getPostProcessorLabel = (postProcessor: PostProcessor): string => {
      if (postProcessor instanceof MapperPostProcessor) {
        return POST_PROCESSOR_TYPE.MAPPER;
      } else {
        const extraPostProcessorEditorClassifier = plugins.flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
            ).getExtraPostProcessorClassifierGetters?.() ?? [],
        );
        for (const classify of extraPostProcessorEditorClassifier) {
          const label = classify(postProcessor);
          if (label) {
            return label;
          }
        }
      }
      return 'unknown type';
    };

    return (
      <div className="relational-connection-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <div className="relational-connection-editor__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={200} minSize={100}>
                  <Panel>
                    <PanelHeader title="post-processor">
                      <PanelHeaderActions>
                        <ControlledDropdownMenu
                          title="Create post-processor"
                          className="panel__header__action"
                          disabled={isReadOnly}
                          content={postProcessorOptions.map(
                            (postProcessorType) => (
                              <MenuContentItem
                                key={postProcessorType.value}
                                onClick={addPostProcessor(
                                  postProcessorType.value,
                                )}
                              >
                                New {postProcessorType.label} Post-Processor
                              </MenuContentItem>
                            ),
                          )}
                          menuProps={{
                            anchorOrigin: {
                              vertical: 'bottom',
                              horizontal: 'right',
                            },
                            transformOrigin: {
                              vertical: 'top',
                              horizontal: 'right',
                            },
                            elevation: 7,
                          }}
                        >
                          <PlusIcon />
                        </ControlledDropdownMenu>
                      </PanelHeaderActions>
                    </PanelHeader>
                    <PanelContent>
                      {postProcessors.map((postProcessor, idx) => (
                        <ContextMenu
                          key={postProcessor._UUID}
                          disabled={isReadOnly}
                          content={
                            <MenuContent>
                              <MenuContentItem
                                onClick={deletePostProcessor(postProcessor)}
                              >
                                Delete
                              </MenuContentItem>
                            </MenuContent>
                          }
                          menuProps={{ elevation: 7 }}
                        >
                          <PanelListSelectorItem
                            onSelect={() => selectPostProcessor(postProcessor)}
                            isSelected={
                              postProcessor ===
                              postProcessorState?.postProcessor
                            }
                          >
                            <PanelListSelectorItemLabel
                              title={`Post-Processor ${idx + 1}`}
                            />
                            <Badge
                              className="badge--right"
                              title={getPostProcessorLabel(postProcessor)}
                            />
                          </PanelListSelectorItem>
                        </ContextMenu>
                      ))}
                    </PanelContent>
                  </Panel>
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel>
                  {postProcessorState?.postProcessor &&
                    renderEditorPostProcessor(
                      connectionValueState,
                      postProcessorState.postProcessor,
                      isReadOnly,
                      plugins,
                    )}
                  {!postProcessorState && (
                    <BlankPanelContent>
                      {!postProcessors.length
                        ? 'Add a post-processor'
                        : 'Choose a post-processor to view'}
                    </BlankPanelContent>
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
  } else if (sourceSpec instanceof TrinoDatasourceSpecification) {
    return (
      <TrinoDatasourceSpecificationEditor
        sourceSpec={sourceSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else {
    const extraDatasourceSpecificationEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
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
  } else if (authSpec instanceof TrinoDelegatedKerberosAuthenticationStrategy) {
    return (
      <TrinoDelegatedKerberosAuthenticationStrategyEditor
        authSpec={authSpec}
        isReadOnly={isReadOnly}
      />
    );
  } else {
    const extraAuthenticationStrategyEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
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

export const RelationalConnectionGeneralEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
    hideHeader?: boolean;
  }) => {
    const { connectionValueState, isReadOnly, hideHeader } = props;
    const connection = connectionValueState.connection;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const plugins = editorStore.pluginManager.getApplicationPlugins();
    const databseTypeConfigs =
      connectionValueState.editorStore.graphState
        .relationalDatabseTypeConfigurations;
    const availableDbTypes = databseTypeConfigs?.length
      ? // Currently H2 Flow is not returned in relational configs. We will remove this once it is properly returned as a supported flow in engine
        uniq([DatabaseType.H2, ...databseTypeConfigs.map((e) => e.type)])
      : Object.values(DatabaseType);

    const dbTypes = availableDbTypes.map((dbType) => ({
      value: dbType,
      label: dbType,
    }));

    const selectedDbType = {
      value: connection.type,
      label: connection.type,
    };

    const onTypeChange = (
      val: { label: string; value: string } | null,
    ): void => {
      dBConnection_setType(connection, val?.value ?? DatabaseType.H2);
      if (connectionValueState.selectedValidDatasources[0]) {
        connectionValueState.changeDatasourceSpec(
          connectionValueState.selectedValidDatasources[0],
        );
      }
      if (connectionValueState.selectedValidAuthenticationStrategies[0]) {
        connectionValueState.changeAuthenticationStrategy(
          connectionValueState.selectedValidAuthenticationStrategies[0],
        );
      }
    };

    // source spec type
    const sourceSpecOptions = connectionValueState.selectedValidDatasources.map(
      (type) => ({
        value: type,
        label: prettyCONSTName(type),
      }),
    );

    const selectedSourceSpec = (
      spec: DatasourceSpecification,
    ): { label: string; value: string | undefined } => ({
      label: prettyCONSTName(
        connectionValueState.selectedDatasourceSpecificationType(spec) ??
          'Unknown',
      ),
      value: connectionValueState.selectedDatasourceSpecificationType(spec),
    });

    const onSourceSpecChange = (
      val: { label: string; value: string | undefined } | null,
    ): void => {
      if (val?.value) {
        connectionValueState.changeDatasourceSpec(val.value);
      }
    };

    // auth type
    const authOptions =
      connectionValueState.selectedValidAuthenticationStrategies.map(
        (type) => ({
          value: type,
          label: prettyCONSTName(type),
        }),
      );

    const selectedAuth = (
      auth: AuthenticationStrategy,
    ): { label: string; value: string | undefined } => ({
      label: prettyCONSTName(
        connectionValueState.selectedAuthenticationStrategyType(auth) ??
          'Unknown',
      ),
      value: connectionValueState.selectedAuthenticationStrategyType(auth),
    });

    const onAuthStrategyChange = (
      val: { label: string; value: string | undefined } | null,
    ): void => {
      if (val?.value) {
        connectionValueState.changeAuthenticationStrategy(val.value);
      }
    };

    // HACKY:
    if (connection.localMode) {
      return (
        <div className="relational-connection-editor">
          <Panel>
            <PanelHeader title="general"></PanelHeader>
            <PanelContent className="relational-connection-editor__general">
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Database Type
                </div>
                <CustomSelectorInput
                  options={dbTypes}
                  onChange={onTypeChange}
                  value={selectedDbType}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </PanelFormSection>
            </PanelContent>
          </Panel>
        </div>
      );
    }

    return (
      <div className="relational-connection-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={200} minSize={15}>
            <Panel>
              {!hideHeader && <PanelHeader title="general"></PanelHeader>}
              <PanelContent className="relational-connection-editor__general">
                <PanelFormSection>
                  <div className="panel__content__form__section__header__label">
                    Database Type
                  </div>
                  <CustomSelectorInput
                    options={dbTypes}
                    onChange={onTypeChange}
                    value={selectedDbType}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </PanelFormSection>
                <PanelFormBooleanField
                  isReadOnly={isReadOnly}
                  value={connection.quoteIdentifiers}
                  name="Quote identifiers"
                  prompt="Specifies whether to use double-quotes for SQL identifiers"
                  update={(value?: boolean): void =>
                    dBConnection_setQuoteIdentifiers(connection, Boolean(value))
                  }
                />
              </PanelContent>
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel>
            <div className="relational-connection-editor__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={450} minSize={50}>
                  <div className="relational-connection-editor__auth">
                    <PanelHeader title="datasource specification"></PanelHeader>
                    <PanelContent className="relational-connection-editor__auth__content">
                      <PanelFormSection>
                        <div style={{ width: '100%' }}>
                          <div
                            style={{ display: 'inline-block', width: '10px' }}
                            className="panel__content__form__section__header__label"
                          >
                            Datasource
                          </div>
                        </div>
                        <CustomSelectorInput
                          options={sourceSpecOptions}
                          onChange={onSourceSpecChange}
                          value={selectedSourceSpec(
                            connection.datasourceSpecification,
                          )}
                          darkMode={
                            !applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </PanelFormSection>
                      <PanelDivider />
                      <div className="relational-connection-editor__auth__properties">
                        {renderDatasourceSpecificationEditor(
                          connection,
                          isReadOnly,
                          plugins,
                        )}
                      </div>
                    </PanelContent>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel>
                  <div className="relational-connection-editor__source">
                    <PanelHeader title="authentication strategy"></PanelHeader>
                    <PanelContent className="relational-connection-editor__source__content">
                      <PanelFormSection>
                        <div style={{ width: '100%' }}>
                          <div
                            style={{ display: 'inline-block', width: '10px' }}
                            className="panel__content__form__section__header__label"
                          >
                            Authentication
                          </div>
                        </div>
                        <CustomSelectorInput
                          options={authOptions}
                          onChange={onAuthStrategyChange}
                          value={selectedAuth(
                            connection.authenticationStrategy,
                          )}
                          darkMode={
                            !applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </PanelFormSection>
                      <PanelDivider />
                      <div className="relational-connection-editor__source__properties">
                        {renderAuthenticationStrategyEditor(
                          connection,
                          isReadOnly,
                          plugins,
                        )}
                      </div>
                    </PanelContent>
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
    const changeTab = (tab: string) => (): void => {
      connectionValueState.setSelectedTab(tab as RELATIONAL_DATABASE_TAB_TYPE);
    };

    return (
      <Panel>
        <PanelTabs
          tabs={Object.values(RELATIONAL_DATABASE_TAB_TYPE)}
          changeTab={changeTab}
          selectedTab={selectedTab}
          tabClassName="relational-connection-editor__tab"
        />
        <PanelContent>
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
          {selectedTab === RELATIONAL_DATABASE_TAB_TYPE.POST_PROCESSORS && (
            <PostProcessorRelationalConnectionEditor
              connectionValueState={connectionValueState}
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
      </Panel>
    );
  },
);
