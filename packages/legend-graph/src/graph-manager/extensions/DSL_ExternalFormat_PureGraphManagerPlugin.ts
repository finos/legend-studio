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

import packageJson from '../../../package.json' with { type: 'json' };
import type { Connection } from '../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import { ExternalFormatConnection } from '../../graph/metamodel/pure/packageableElements/externalFormat/connection/DSL_ExternalFormat_ExternalFormatConnection.js';
import { SchemaSet } from '../../graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_SchemaSet.js';
import { Binding } from '../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_Binding.js';
import type { PackageableElement } from '../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { ObserverContext } from '../action/changeDetection/CoreObserverHelper.js';
import {
  observe_Binding,
  observe_ExternalFormatConnection,
  observe_SchemaSet,
} from '../action/changeDetection/DSL_ExternalFormat_ObserverHelper.js';
import type {
  ConnectionObserver,
  DSL_Mapping_PureGraphManagerPlugin_Extension,
} from './DSL_Mapping_PureGraphManagerPlugin_Extension.js';
import {
  type ElementObserver,
  PureGraphManagerPlugin,
} from '../PureGraphManagerPlugin.js';

export class DSL_ExternalFormat_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements DSL_Mapping_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_external_format_pureGraphManagerPlugin,
      packageJson.version,
    );
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof Binding) {
          return observe_Binding(element);
        } else if (element instanceof SchemaSet) {
          return observe_SchemaSet(element);
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
        if (connection instanceof ExternalFormatConnection) {
          return observe_ExternalFormatConnection(connection);
        }
        return undefined;
      },
    ];
  }
}
