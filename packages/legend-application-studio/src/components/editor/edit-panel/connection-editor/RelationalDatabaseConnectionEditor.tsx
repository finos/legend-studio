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
  POST_PROCESSOR_TYPE,
} from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  CustomSelectorInput,
  ErrorIcon,
  PanelHeader,
  PanelHeaderActionItem,
  PlusIcon,
  PanelFormTextEditor,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PanelListSelectorItem,
  DropdownMenu,
  PanelTabs,
  BlankPanelContent,
  ResizablePanelSplitterLine,
  PanelContent,
  Panel,
  Badge,
  PanelListSelectorItemLabel,
  PanelSection,
  PanelFormBooleanEditor,
} from '@finos/legend-art';
import { capitalize, prettyCONSTName } from '@finos/legend-shared';

import {
  type RelationalDatabaseConnection,
  type Store,
  type PostProcessor,
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
  MapperPostProcessor,
} from '@finos/legend-graph';
import type { LegendStudioApplicationPlugin } from '../../../../stores/LegendStudioApplicationPlugin.js';
import type { STO_Relational_LegendStudioApplicationPlugin_Extension } from '../../../../stores/STO_Relational_LegendStudioApplicationPlugin_Extension.js';
import { DatabaseBuilder } from './DatabaseBuilder.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  EDITOR_LANGUAGE,
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import { connection_setStore } from '../../../../stores/shared/modifier/DSL_Mapping_GraphModifierHelper.js';
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
  staticDatasourceSpecification_setDatabaseName,
  staticDatasourceSpecification_setHost,
  staticDatasourceSpecification_setPort,
  usernamePasswordAuthenticationStrategy_setBaseVaultReference,
  usernamePasswordAuthenticationStrategy_setPasswordVaultReference,
  usernamePasswordAuthenticationStrategy_setUserNameVaultReference,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail,
  gcpWorkloadIdentityFederationAuthenticationStrategy_setAdditionalGcpScopes,
  middleTierUsernamePasswordAuthenticationStrategy_setVaultReference,
  relationalDatabaseConnection_addPostProcessor,
  relationalDatabaseConnection_deletePostProcessor,
} from '../../../../stores/shared/modifier/STO_Relational_GraphModifierHelper.js';
import { MapperPostProcessorEditor } from './post-processor-editor/MapperPostProcessorEditor.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import type { MapperPostProcessorEditorState } from '../../../../stores/editor-state/element-editor-state/connection/PostProcessorEditorState.js';

const LocalH2DatasourceSpecificationEditor = observer(
  (props: {
    sourceSpec: LocalH2DatasourceSpecification;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;
    // TODO?: support CSV and toggler to go to CSV mode
    const SQLValue = sourceSpec.testDataSetupSqls.join('\n');

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {capitalize('test data setup SQL')}
        </div>
        <div className="panel__content__form__section__text-editor">
          <StudioTextInputEditor
            inputValue={SQLValue}
            updateInput={(value: string | undefined): void =>
              localH2DatasourceSpecification_setTestDataSetupSqls(
                sourceSpec,
                value ? [value] : [],
              )
            }
            isReadOnly={isReadOnly}
            language={EDITOR_LANGUAGE.SQL}
          />
        </div>
      </div>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          name="host"
          update={(value: string | undefined): void =>
            staticDatasourceSpecification_setHost(sourceSpec, value ?? '')
          }
        />
        <div className="panel__content__form__section__header__label">port</div>
        <input
          className="panel__content__form__section__input panel__content__form__section__number-input"
          spellCheck={false}
          type="number"
          disabled={isReadOnly}
          value={sourceSpec.port}
          onChange={changePort}
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database"
          update={(value: string | undefined): void =>
            staticDatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </PanelSection>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database"
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.directory}
          name="directory"
          update={(value: string | undefined): void =>
            embeddedH2DatasourceSpecification_setDirectory(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormBooleanEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.autoServerMode}
          name="auto server mode"
          update={(value?: boolean): void =>
            embeddedH2DatasourceSpecification_setAutoServerMode(
              sourceSpec,
              Boolean(value),
            )
          }
        />
      </PanelSection>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.hostname}
          name="hostname"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setHostName(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.port}
          name="port"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setPort(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.protocol}
          name="protocol"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setProtocol(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.httpPath}
          name="httpPath"
          update={(value: string | undefined): void =>
            databricksDatasourceSpecification_setHttpPath(
              sourceSpec,
              value ?? '',
            )
          }
        />
      </PanelSection>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.accountName}
          name="account"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          name="region"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRegion(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.warehouseName}
          name="warehouse"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setWarehouseName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setDatabaseName(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.cloudType}
          name="cloud type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setCloudType(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyHost}
          name="proxy host"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyHost(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.proxyPort}
          name="proxy port"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setProxyPort(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.nonProxyHosts}
          name="non proxy hosts"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setNonProxyHosts(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.organization}
          name="organization"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setOrganization(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.accountType}
          name="account type"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setAccountType(sourceSpec, value)
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.role}
          name="role"
          update={(value: string | undefined): void =>
            snowflakeDatasourceSpec_setRole(sourceSpec, value)
          }
        />
        {/* TODO: we should reconsider adding this field, it's an optional boolean, should we default it to `undefined` when it's `false`?*/}
        <PanelFormBooleanEditor
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
      </PanelSection>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          name="host"
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
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          name="database"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setDatabaseName(
              sourceSpec,
              value ?? '',
            )
          }
        />

        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          name="region"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setRegion(sourceSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.clusterID}
          name="cluster"
          update={(value: string | undefined): void =>
            redshiftDatasourceSpecification_setClusterID(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
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
      </PanelSection>
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.projectId}
          name="project id"
          update={(value: string | undefined): void =>
            bigQueryDatasourceSpecification_setProjectId(
              sourceSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
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
        <PanelFormTextEditor
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
        <PanelFormTextEditor
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
      </PanelSection>
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
        <PanelFormTextEditor
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
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.apiToken}
          name="apiTokenRef"
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
      <PanelSection>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.privateKeyVaultReference}
          name="private key vault reference"
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.passPhraseVaultReference}
          name="pass phrase vault reference"
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.publicUserName}
          name="public user name"
          update={(value: string | undefined): void =>
            snowflakePublicAuthenticationStrategy_setPublicUserName(
              authSpec,
              value ?? '',
            )
          }
        />
      </PanelSection>
    );
  },
);

const OAuthAuthenticationStrategyEditor = observer(
  (props: { authSpec: OAuthAuthenticationStrategy; isReadOnly: boolean }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.oauthKey}
          name="oauth key"
          update={(value: string | undefined): void =>
            oAuthAuthenticationStrategy_setOauthKey(authSpec, value ?? '')
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.scopeName}
          name="scope name"
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
        <PanelFormTextEditor
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
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.userNameVaultReference}
          name="user name vault reference"
          update={(value: string | undefined): void =>
            usernamePasswordAuthenticationStrategy_setUserNameVaultReference(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.passwordVaultReference}
          name="password vault reference"
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
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.vaultReference}
          name="vault reference"
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

const GCPWorkloadIdentityFederationAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: GCPWorkloadIdentityFederationAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    const GCPScopes = authSpec.additionalGcpScopes.join('\n');
    return (
      <>
        <PanelFormTextEditor
          isReadOnly={isReadOnly}
          value={authSpec.serviceAccountEmail}
          name="Service Account Email"
          update={(value: string | undefined): void =>
            gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail(
              authSpec,
              value ?? '',
            )
          }
        />
        <PanelFormTextEditor
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
      ></UnsupportedEditorPanel>
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
      .map((e) => ({
        value: e,
        label: prettyCONSTName(e),
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
                      <DropdownMenu
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
                        <PanelHeaderActionItem
                          disabled={isReadOnly}
                          title="Create Post-Processor"
                        >
                          <PlusIcon />
                        </PanelHeaderActionItem>
                      </DropdownMenu>
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
                        : 'Select a post-processor to view'}
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
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
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
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
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
            <Panel>
              <PanelHeader title="general"></PanelHeader>

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
                <PanelFormBooleanEditor
                  isReadOnly={isReadOnly}
                  value={connection.quoteIdentifiers}
                  name="Quote identifiers"
                  prompt="Specifies whether to use double-quotes for SQL identifiers"
                  update={(value?: boolean): void =>
                    dBConnection_setQuoteIdentifiers(connection, Boolean(value))
                  }
                />
              </div>
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel>
            <div className="relational-connection-editor__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={450} minSize={50}>
                  <div className="relational-connection-editor__auth">
                    <PanelHeader title="datasource spec"></PanelHeader>
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
                    <PanelHeader title="authentication spec"></PanelHeader>
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
      <T,>( // eslint-disable-line
        tab: T,
      ) =>
      (): void => {
        connectionValueState.setSelectedTab(
          tab as unknown as RELATIONAL_DATABASE_TAB_TYPE,
        );
      };
    return (
      <Panel>
        <PanelTabs
          tabTitles={Object.values(RELATIONAL_DATABASE_TAB_TYPE)}
          changeTheTab={changeTab}
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
