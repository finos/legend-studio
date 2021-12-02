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

import packageJson from '../../package.json';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import type {
  DSLMapping_PureGraphManagerPlugin_Extension,
  GraphPluginManager,
  PackageableElement,
  PureGrammarElementLabeler,
  PureGrammarConnectionLabeler,
} from '@finos/legend-graph';
import { PureGraphManagerPlugin } from '@finos/legend-graph';
import { ServiceStoreConnection } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/connection/ServiceStoreConnection';

const PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME = 'ServiceStore';
const PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL = 'ServiceStore';
const PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL =
  'ServiceStoreConnection';
const PURE_GRAMMAR_SERVICE_STORE_SERVICE_GROUP_LABEL = 'ServiceGroup';

export class ESService_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements DSLMapping_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureGraphManagerPlugin(this);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL,
      PURE_GRAMMAR_SERVICE_STORE_SERVICE_GROUP_LABEL,
    ];
  }
  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof ServiceStore) {
          return PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }
  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }
}
