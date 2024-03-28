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
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type Store,
} from '@finos/legend-graph';
import { ServiceStoreConnection } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import { ServiceStore } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import {
  serviceStore_connection_setBaseUrl,
  service_store_connection_setStore,
} from '../../stores/studio/STO_ServiceStore_GraphModifierHelper.js';
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
import { SERVICE_STORE_CONNECTION } from './STO_ServiceStore_LegendStudioApplicationPlugin.js';

export class ServiceStoreConnectionValueState extends ConnectionValueState {
  override connection: ServiceStoreConnection;

  constructor(editorStore: EditorStore, connection: ServiceStoreConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'service store connection';
  }
}

export const ServiceStoreConnectionEditor = observer(
  (props: {
    connectionValueState: ServiceStoreConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { connectionValueState, isReadOnly } = props;
    const applicationStore = connectionValueState.editorStore.applicationStore;
    const connection = connectionValueState.connection;

    const stores =
      connectionValueState.editorStore.graphManagerState.graph.ownStores
        .filter((s) => s instanceof ServiceStore)
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
        service_store_connection_setStore(
          connection,
          PackageableElementExplicitReference.create(
            val.value,
          ) as PackageableElementReference<ServiceStore>,
        );
      }
    };

    const changeUrl: React.ChangeEventHandler<HTMLTextAreaElement> = (event) =>
      serviceStore_connection_setBaseUrl(connection, event.target.value);

    return (
      <div className="service-store-connection-editor">
        <div className="service-store-connection-editor__section">
          <div className="service-store-connection-editor__section__header__label">
            Service Store
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
        <div className="service-store-connection-editor__section">
          <div className="service-store-connection-editor__section__header__label">
            Base URL
          </div>
          <div className="service-store-connection-editor__section__header__prompt">
            Specifies the Base URL of REST Server
          </div>
          <textarea
            className="service-store-connection-editor__section__textarea"
            spellCheck={false}
            value={connection.baseUrl}
            onChange={changeUrl}
            disabled={isReadOnly}
          />
        </div>
      </div>
    );
  },
);

export class NewServiceStoreConnectionDriver extends NewConnectionValueDriver<ServiceStoreConnection> {
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
    return SERVICE_STORE_CONNECTION;
  }

  createConnection(store: ServiceStore): ServiceStoreConnection {
    const serviceStoreConnection = new ServiceStoreConnection(
      PackageableElementExplicitReference.create(store),
    );
    serviceStoreConnection.baseUrl = '';
    return serviceStoreConnection;
  }
}
