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
import { ExternalFormatConnection } from '../models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection';
import { SchemaSet } from '../models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet';
import { Binding } from '../models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding';
import type {
  DSLMapping_PureGraphManagerPlugin_Extension,
  PureGrammarConnectionLabeler,
} from './DSLMapping_PureGraphManagerPlugin_Extension';
import {
  type PureGrammarElementLabeler,
  PureGraphManagerPlugin,
} from './PureGraphManagerPlugin';

const PURE_GRAMMAR_BINDING_PARSER_NAME = 'ExternalFormat';
const PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL = 'Binding';
const PURE_GRAMMAR_SCHEMA_SET_PARSER_NAME = 'ExternalFormat';
const PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL = 'SchemaSet';
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
    return [
      PURE_GRAMMAR_BINDING_PARSER_NAME,
      PURE_GRAMMAR_SCHEMA_SET_PARSER_NAME,
    ];
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
}
