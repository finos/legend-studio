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

import packageJson from '../../package.json' with { type: 'json' };
import { ServiceStore } from '../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import {
  PureGraphManagerPlugin,
  type DSL_Mapping_PureGraphManagerPlugin_Extension,
  type PackageableElement,
  type ElementObserver,
  type ObserverContext,
  type SetImplementation,
  type SetImplementationObserver,
  type EmbeddedData,
  type EmbeddedDataObserver,
  type EmbeddedData_PureGraphManagerPlugin_Extension,
  type ConnectionObserver,
  type Connection,
} from '@finos/legend-graph';
import { ServiceStoreConnection } from '../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import {
  observe_RootServiceInstanceSetImplementation,
  observe_ServiceStore,
  observe_ServiceStoreConnection,
  observe_ServiceStoreEmbeddedData,
} from './action/changeDetection/STO_ServiceStore_ObserverHelper.js';
import { RootServiceInstanceSetImplementation } from '../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_RootServiceInstanceSetImplementation.js';
import { ServiceStoreEmbeddedData } from '../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';

export class STO_ServiceStore_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements
    DSL_Mapping_PureGraphManagerPlugin_Extension,
    EmbeddedData_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof ServiceStore) {
          return observe_ServiceStore(element, context);
        }
        return undefined;
      },
    ];
  }

  getExtraSetImplementationObservers(): SetImplementationObserver[] {
    return [
      (
        metamodel: SetImplementation,
        context: ObserverContext,
      ): SetImplementation | undefined => {
        if (metamodel instanceof RootServiceInstanceSetImplementation) {
          return observe_RootServiceInstanceSetImplementation(
            metamodel,
            context,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraEmbeddedDataObservers(): EmbeddedDataObserver[] {
    return [
      (
        metamodel: EmbeddedData,
        context: ObserverContext,
      ): EmbeddedData | undefined => {
        if (metamodel instanceof ServiceStoreEmbeddedData) {
          return observe_ServiceStoreEmbeddedData(metamodel);
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionObservers(): ConnectionObserver[] {
    return [
      (
        connection: Connection,
        context: ObserverContext,
      ): Connection | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return observe_ServiceStoreConnection(connection);
        }
        return undefined;
      },
    ];
  }
}
