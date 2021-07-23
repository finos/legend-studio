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
  CORE_AUTHENTICATION_STRATEGY_TYPE,
  CORE_DATASOURCE_SPEC_TYPE,
  RELATIONAL_DATABASE_TAB_TYPE,
} from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState';
import type { RelationalDatabaseConnectionValueState } from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState';
import { useState } from 'react';
import { MdModeEdit } from 'react-icons/md';
import { VscError } from 'react-icons/vsc';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { TextInputEditor } from '../../../shared/TextInputEditor';
import {
  clsx,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
  TimesIcon,
} from '@finos/legend-studio-components';
import { capitalize, prettyCONSTName } from '@finos/legend-studio-shared';
import type { RelationalDatabaseConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { DatabaseType } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import {
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  UserPasswordAuthenticationStrategy,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  StaticDatasourceSpecification,
  BigQueryDatasourceSpecification,
  RedshiftDatasourceSpecification,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import { runInAction } from 'mobx';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Store } from '../../../../models/metamodels/pure/model/packageableElements/store/Store';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { EDITOR_LANGUAGE } from '../../../../stores/EditorConfig';
import type { EditorPlugin } from '../../../../stores/EditorPlugin';
import type { StoreRelational_EditorPlugin_Extension } from '../../../../stores/StoreRelational_EditorPlugin_Extension';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { DatabaseBuilder } from './DatabaseBuilder';

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
          <TextInputEditor
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
                        <MdModeEdit />
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
            sourceSpec.setTestDataSetupSqls(value ? [value] : [])
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
      sourceSpec.setPort(parseInt(val, 10));
    };

    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.host}
          propertyName={'host'}
          update={(value: string | undefined): void =>
            sourceSpec.setHost(value ?? '')
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
            sourceSpec.setDatabaseName(value ?? '')
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
            sourceSpec.setDatabaseName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.directory}
          propertyName={'directory'}
          update={(value: string | undefined): void =>
            sourceSpec.setDirectory(value ?? '')
          }
        />
        <ConnectionEditor_BooleanEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.autoServerMode}
          propertyName={'auto server mode'}
          update={(value?: boolean): void =>
            sourceSpec.setAutoServerMode(Boolean(value))
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
            sourceSpec.setAccountName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.region}
          propertyName="region"
          update={(value: string | undefined): void =>
            sourceSpec.setRegion(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.warehouseName}
          propertyName="warehouse"
          update={(value: string | undefined): void =>
            sourceSpec.setWarehouseName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName="database"
          update={(value: string | undefined): void =>
            sourceSpec.setDatabaseName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.cloudType}
          propertyName="cloud type"
          update={(value: string | undefined): void =>
            sourceSpec.setCloudType(value)
          }
        />
        {/* TODO: we should reconsider adding this field, it's an optional boolean, should we default it to `undefined` when it's `false`?*/}
        <ConnectionEditor_BooleanEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.quotedIdentifiersIgnoreCase}
          propertyName="quoted identifiers ignore case"
          description="Controls whether Snowflake will treat alphabetic characters in double-quoted identifiers as uppercase"
          update={(value: boolean | undefined): void =>
            sourceSpec.setQuotedIdentifiersIgnoreCase(Boolean(value))
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
      sourceSpec.setPort(parseInt(val, 10));
    };
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.databaseName}
          propertyName="database"
          update={(value: string | undefined): void =>
            sourceSpec.setDatabaseName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.endpoint}
          propertyName="endpoint"
          update={(value: string | undefined): void =>
            sourceSpec.setEndpoint(value ?? '')
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
            sourceSpec.setProjectId(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={sourceSpec.defaultDataset}
          propertyName={'default dataset'}
          update={(value: string | undefined): void =>
            sourceSpec.setDefaultDataset(value ?? '')
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
            authSpec.setServerPrincipal(value ?? '')
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
            authSpec.setPrivateKeyVaultReference(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.passPhraseVaultReference}
          propertyName={'pass phrase vault reference'}
          update={(value: string | undefined): void =>
            authSpec.setPassPhraseVaultReference(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.publicUserName}
          propertyName={'public user name'}
          update={(value: string | undefined): void =>
            authSpec.setPublicUserName(value ?? '')
          }
        />
      </>
    );
  },
);

const UserPasswordAuthenticationStrategyEditor = observer(
  (props: {
    authSpec: UserPasswordAuthenticationStrategy;
    isReadOnly: boolean;
  }) => {
    const { authSpec, isReadOnly } = props;
    return (
      <>
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.userName}
          propertyName={'userName'}
          update={(value: string | undefined): void =>
            authSpec.setUserName(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.passwordVaultReference}
          propertyName={'passwordVaultReference'}
          update={(value: string | undefined): void =>
            authSpec.setPasswordVaultReference(value ?? '')
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
            authSpec.setOauthKey(value ?? '')
          }
        />
        <ConnectionEditor_StringEditor
          isReadOnly={isReadOnly}
          value={authSpec.scopeName}
          propertyName={'scope name'}
          update={(value: string | undefined): void =>
            authSpec.setScopeName(value ?? '')
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
        <VscError />
      </div>
    );
    const stores = connectionValueState.editorStore.graphState.graph.ownStores;
    const options = stores.map((e) => e.selectOption);
    const store = connection.store.value;
    const selectedStore = {
      value: store,
      label: isStoreEmpty ? noStoreLabel : store.path,
    };
    const onStoreChange = (
      val: PackageableElementSelectOption<Store> | null,
    ): void => {
      if (val) {
        connection.setStore(
          PackageableElementExplicitReference.create(val.value),
        );
      }
    };
    const openDatabaseBuilder = (): void => databaseBuilderState.setModal(true);

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
  plugins: EditorPlugin[],
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
          plugin as StoreRelational_EditorPlugin_Extension
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
  plugins: EditorPlugin[],
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
  } else if (authSpec instanceof UserPasswordAuthenticationStrategy) {
    return (
      <UserPasswordAuthenticationStrategyEditor
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
  } else {
    const extraAuthenticationStrategyEditorRenderers = plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_EditorPlugin_Extension
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
    const applicationStore = useApplicationStore();
    const plugins = applicationStore.pluginManager.getEditorPlugins();
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
      connection.setType(val?.value ?? DatabaseType.H2);
    };

    // source spec type
    const sourceSpecOptions = (
      Object.values(CORE_DATASOURCE_SPEC_TYPE) as string[]
    )
      .concat(
        plugins.flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_EditorPlugin_Extension
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
              plugin as StoreRelational_EditorPlugin_Extension
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
        <ReflexContainer orientation="horizontal">
          <ReflexElement size={200} minSize={15}>
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
                    connection.setQuoteIdentifiers(Boolean(value))
                  }
                />
              </div>
            </div>
          </ReflexElement>
          <ReflexSplitter />
          <ReflexElement>
            <div className="relational-connection-editor__content">
              <ReflexContainer orientation="vertical">
                <ReflexElement size={450} minSize={50}>
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
                </ReflexElement>
                <ReflexSplitter />
                <ReflexElement minSize={0}>
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
                </ReflexElement>
              </ReflexContainer>
            </div>
          </ReflexElement>
        </ReflexContainer>
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
