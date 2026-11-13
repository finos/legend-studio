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

import packageJson from '../../package.json' with { type: 'json' };
import { GraphQLStore } from '../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import {
  PureGraphManagerPlugin,
  type DSL_Mapping_PureGraphManagerPlugin_Extension,
  type PackageableElement,
  type ElementObserver,
  type ObserverContext,
  type SetImplementation,
  type SetImplementationObserver,
  type ConnectionObserver,
  type Connection,
  type PureGraphManagerExtensionBuilder,
} from '@finos/legend-graph';
import { GraphQLConnection } from '../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import {
  observe_GraphQLConnection,
  observe_GraphQLStore,
  observe_RootGraphQLInstanceSetImplementation,
} from './action/changeDetection/STO_GraphQL_ObserverHelper.js';
import { STO_GraphQL_buildGraphManagerExtension } from './protocol/pure/STO_GraphQL_buildGraphManagerExtension.js';
import { RootGraphQLInstanceSetImplementation } from '../graph/metamodel/pure/model/packageableElements/store/graphQL/mapping/STO_GraphQL_RootGraphQLInstanceSetImplementation.js';

export class STO_GraphQL_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements DSL_Mapping_PureGraphManagerPlugin_Extension
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
        if (element instanceof GraphQLStore) {
          return observe_GraphQLStore(element);
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
        if (metamodel instanceof RootGraphQLInstanceSetImplementation) {
          return observe_RootGraphQLInstanceSetImplementation(
            metamodel,
            context,
          );
        }
        return undefined;
      },
    ];
  }

  override getExtraPureGraphManagerExtensionBuilders(): PureGraphManagerExtensionBuilder[] {
    return [STO_GraphQL_buildGraphManagerExtension];
  }

  getExtraConnectionObservers(): ConnectionObserver[] {
    return [
      (
        connection: Connection,
        context: ObserverContext,
      ): Connection | undefined => {
        if (connection instanceof GraphQLConnection) {
          return observe_GraphQLConnection(connection);
        }
        return undefined;
      },
    ];
  }
}
