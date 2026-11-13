/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type Store,
} from '@finos/legend-graph';
import { GraphQLConnection } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import { GraphQLStore } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import {
  graphQL_connection_setStore,
  graphQL_connection_setUrl,
} from '../../stores/studio/STO_GraphQL_GraphModifierHelper.js';
import { computed, makeObservable } from 'mobx';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  ConnectionValueState,
  NewConnectionValueDriver,
  type EditorStore,
} from '@finos/legend-application-studio';
import { CustomSelectorInput } from '@finos/legend-art';
import { GRAPHQL_CONNECTION } from './STO_GraphQL_LegendStudioApplicationPlugin.js';
import { GraphQLIntrospectionWizardState } from '../../stores/studio/STO_GraphQL_IntrospectionWizardState.js';
import { GraphQLIntrospectionWizard } from './GraphQLIntrospectionWizard.js';

export class GraphQLConnectionValueState extends ConnectionValueState {
  override connection: GraphQLConnection;
  readonly introspectionWizardState: GraphQLIntrospectionWizardState;

  constructor(editorStore: EditorStore, connection: GraphQLConnection) {
    super(editorStore, connection);
    this.connection = connection;
    this.introspectionWizardState = new GraphQLIntrospectionWizardState(
      editorStore,
      connection,
    );
  }

  label(): string {
    return 'GraphQL connection';
  }
}

export const GraphQLConnectionEditor = observer(
  (props: {
    connectionValueState: GraphQLConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const applicationStore = connectionValueState.editorStore.applicationStore;
    const connection = connectionValueState.connection;

    const stores =
      connectionValueState.editorStore.graphManagerState.graph.ownStores
        .filter((s) => s instanceof GraphQLStore)
        .map(buildElementOption);
    const store = connection.store.value;
    const selectedStore = {
      value: store,
      label: store.path,
    };

    const onStoreChange = (
      val: PackageableElementOption<Store> | null,
    ): void => {
      if (val) {
        graphQL_connection_setStore(
          connection,
          PackageableElementExplicitReference.create(
            val.value,
          ) as PackageableElementReference<GraphQLStore>,
        );
      }
    };

    const changeUrl: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
      graphQL_connection_setUrl(connection, event.target.value);

    return (
      <div className="graphql-connection-editor">
        <div className="graphql-connection-editor__section">
          <div className="graphql-connection-editor__section__header__label">
            GraphQL Store
          </div>
          <CustomSelectorInput
            options={stores}
            onChange={onStoreChange}
            value={selectedStore}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            disabled={isReadOnly}
          />
        </div>
        <div className="graphql-connection-editor__section">
          <div className="graphql-connection-editor__section__header__label">
            URL
          </div>
          <div className="graphql-connection-editor__section__header__prompt">
            Specifies the URL of the GraphQL endpoint
          </div>
          <textarea
            className="graphql-connection-editor__section__textarea"
            spellCheck={false}
            value={connection.url}
            onChange={changeUrl}
            disabled={isReadOnly}
          />
        </div>
        <div className="graphql-connection-editor__section">
          <div className="graphql-connection-editor__section__header__label">
            Schema
          </div>
          <div className="graphql-connection-editor__section__header__prompt">
            Generate classes, a binding and a mapping from the endpoint&apos;s
            GraphQL schema (introspection)
          </div>
          <button
            className="btn btn--dark"
            disabled={isReadOnly || !connection.url.trim()}
            title={
              connection.url.trim()
                ? 'Generate models from the endpoint schema...'
                : 'Set the URL first'
            }
            onClick={() => connectionValueState.introspectionWizardState.open()}
          >
            Generate from Schema
          </button>
        </div>
        <GraphQLIntrospectionWizard
          wizardState={connectionValueState.introspectionWizardState}
          isReadOnly={isReadOnly}
        />
      </div>
    );
  },
);

export class NewGraphQLConnectionDriver extends NewConnectionValueDriver<GraphQLConnection> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  getConnectionType(): string {
    return GRAPHQL_CONNECTION;
  }

  createConnection(store: GraphQLStore): GraphQLConnection {
    const graphQLConnection = new GraphQLConnection(
      PackageableElementExplicitReference.create(store),
    );
    graphQLConnection.url = '';
    return graphQLConnection;
  }
}
