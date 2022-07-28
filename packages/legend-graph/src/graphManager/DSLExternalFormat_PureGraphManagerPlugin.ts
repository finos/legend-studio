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
import type { Connection } from '../DSLMapping_Exports.js';
import { ExternalFormatConnection } from '../graph/metamodel/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection.js';
import { SchemaSet } from '../graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet.js';
import { Binding } from '../graph/metamodel/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { ObserverContext } from './action/changeDetection/CoreObserverHelper.js';
import {
  observe_Binding,
  observe_ExternalFormatConnection,
  observe_SchemaSet,
} from './action/changeDetection/DSLExternalFormat_ObserverHelper.js';
import type {
  ConnectionObserver,
  DSLMapping_PureGraphManagerPlugin_Extension,
  PureGrammarConnectionLabeler,
} from './DSLMapping_PureGraphManagerPlugin_Extension.js';
import {
  type PureGrammarElementLabeler,
  type ElementObserver,
  PureGraphManagerPlugin,
} from './PureGraphManagerPlugin.js';

export const PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME = 'ExternalFormat';
export const PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL = 'Binding';
export const PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL = 'SchemaSet';
const PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL =
  'ExternalFormatConnection';

export class DSLExternalFormat_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements DSLMapping_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_external_format_pureGraphManagerPlugin,
      packageJson.version,
    );
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL,
    ];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element): string | undefined => {
        if (element instanceof Binding) {
          return PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL;
        } else if (element instanceof SchemaSet) {
          return PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL;
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
        if (element instanceof Binding) {
          return observe_Binding(element);
        } else if (element instanceof SchemaSet) {
          return observe_SchemaSet(element);
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof ExternalFormatConnection) {
          return PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL;
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
