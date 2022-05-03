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
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStore';
import {
  PureGraphManagerPlugin,
  type DSLMapping_PureGraphManagerPlugin_Extension,
  type PackageableElement,
  type PureGrammarElementLabeler,
  type PureGrammarConnectionLabeler,
  type ElementObserver,
  type ObserverContext,
  type SetImplementation,
  type SetImplementationObserver,
  type EmbeddedData,
  type EmbeddedDataObserver,
  type EmbeddedData_PureGraphManagerPlugin_Extension,
} from '@finos/legend-graph';
import { ServiceStoreConnection } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/connection/ESService_ServiceStoreConnection';
import {
  observe_RootServiceInstanceSetImplementation,
  observe_ServiceStore,
  observe_ServiceStoreEmbeddedData,
} from './action/changeDetection/ESService_ObserverHelper';
import { RootServiceInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_RootServiceInstanceSetImplementation';
import { ServiceStoreEmbeddedData } from '../models/metamodels/pure/model/data/ESService_ServiceStoreEmbeddedData';

export const PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME = 'ServiceStore';
export const PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL = 'ServiceStore';
const PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL =
  'ServiceStoreConnection';
const PURE_GRAMMAR_SERVICE_STORE_SERVICE_GROUP_LABEL = 'ServiceGroup';

export class ESService_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements
    DSLMapping_PureGraphManagerPlugin_Extension,
    EmbeddedData_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
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
}
