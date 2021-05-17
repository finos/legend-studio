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

import { createModelSchema, custom } from 'serializr';
import {
  deseralizeMap,
  SerializationFactory,
  serializeMap,
} from '@finos/legend-studio-shared';
import { V1_ParserError } from './V1_ParserError';
import type { V1_RawRelationalOperationElement } from '../../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement';

export class V1_RelationalOperationElementJsonToGrammarInput {
  operations!: Map<string, V1_RawRelationalOperationElement>;
  operationErrors?: Map<string, V1_ParserError>;
  // renderStyle?: V1_RenderStyle;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RelationalOperationElementJsonToGrammarInput, {
      operations: custom(
        (val) => serializeMap(val),
        (val) => deseralizeMap(val),
      ),
      operationErrors: custom(
        (val) => serializeMap(val, V1_ParserError),
        (val) => deseralizeMap(val, V1_ParserError),
      ),
    }),
  );
}
