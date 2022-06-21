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
import {
  PureGraphManagerPlugin,
  type DSLMapping_PureGraphManagerPlugin_Extension,
  type PureGrammarElementLabeler,
  type PackageableElement,
  type ElementObserver,
  type ObserverContext,
  type PureGrammarConnectionLabeler,
  type SetImplementationObserver,
  type SetImplementation,
  type PropertyMappingObserver,
  type PropertyMapping,
  type MappingTestInputDataObserver,
  type InputData,
  type Connection,
  type ConnectionObserver,
  type MappingTestInputDataValidator,
  type ValidationIssue,
} from '@finos/legend-graph';
import { FlatDataConnection } from '../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import { FlatData } from '../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';
import {
  observe_EmbeddedFlatDataPropertyMapping,
  observe_FlatData,
  observe_FlatDataConnection,
  observe_FlatDataInputData,
  observe_FlatDataInstanceSetImplementation,
  observe_FlatDataPropertyMapping,
} from './action/changeDetection/ESFlatData_ObserverHelper.js';
import { FlatDataInstanceSetImplementation } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInstanceSetImplementation.js';
import { EmbeddedFlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { FlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataPropertyMapping.js';
import { FlatDataInputData } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import { DEPRECATED__validate_FlatDataInputData } from './action/validation/ESFlatData_ValidationHelper.js';

export const PURE_GRAMMAR_FLAT_DATA_STORE_PARSER_NAME = 'FlatData';
export const PURE_GRAMMAR_FLAT_DATA_STORE_ELEMENT_TYPE_LABEL = 'FlatData';
const PURE_GRAMMAR_FLAT_DATA_STORE_CONNECTION_TYPE_LABEL = 'FlatDataConnection';

export class ESFlatData_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements DSLMapping_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_FLAT_DATA_STORE_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_FLAT_DATA_STORE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_FLAT_DATA_STORE_CONNECTION_TYPE_LABEL,
    ];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof FlatData) {
          return PURE_GRAMMAR_FLAT_DATA_STORE_ELEMENT_TYPE_LABEL;
        } else if (element instanceof FlatDataConnection) {
          return PURE_GRAMMAR_FLAT_DATA_STORE_CONNECTION_TYPE_LABEL;
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
        if (element instanceof FlatData) {
          return observe_FlatData(element);
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof FlatDataConnection) {
          return PURE_GRAMMAR_FLAT_DATA_STORE_CONNECTION_TYPE_LABEL;
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
        if (metamodel instanceof FlatDataInstanceSetImplementation) {
          return observe_FlatDataInstanceSetImplementation(metamodel, context);
        }
        return undefined;
      },
    ];
  }

  getExtraPropertyMappingObservers(): PropertyMappingObserver[] {
    return [
      (
        propertyMapping: PropertyMapping,
        context: ObserverContext,
      ): PropertyMapping | undefined => {
        if (propertyMapping instanceof EmbeddedFlatDataPropertyMapping) {
          return observe_EmbeddedFlatDataPropertyMapping(
            propertyMapping,
            context,
          );
        } else if (propertyMapping instanceof FlatDataPropertyMapping) {
          return observe_FlatDataPropertyMapping(propertyMapping, context);
        }
        return undefined;
      },
    ];
  }

  getExtraMappingTestInputDataObservers(): MappingTestInputDataObserver[] {
    return [
      (
        inputData: InputData,
        context: ObserverContext,
      ): InputData | undefined => {
        if (inputData instanceof FlatDataInputData) {
          return observe_FlatDataInputData(inputData);
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
        if (connection instanceof FlatDataConnection) {
          return observe_FlatDataConnection(connection);
        }
        return undefined;
      },
    ];
  }

  getExtraMappingTestInputDataValidators(): MappingTestInputDataValidator[] {
    return [
      (metamodel: InputData): ValidationIssue | undefined => {
        if (metamodel instanceof FlatDataInputData) {
          return DEPRECATED__validate_FlatDataInputData(metamodel);
        }
        return undefined;
      },
    ];
  }
}
