/**
 * Copyright 2020 Goldman Sachs
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

import { custom, createModelSchema, primitive } from 'serializr';
import {
  deseralizeMap,
  SerializationFactory,
  serializeMap,
} from '@finos/legend-studio-shared';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData';
import type { V1_RenderStyle } from './V1_JsonToGrammarInput';
import type { V1_LambdaInput } from './V1_LambdaInput';
import type { V1_ParserError } from './V1_ParserError';

export class V1_GrammarToJsonInput {
  isolatedLambdas?: Map<string, string>;
  code?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GrammarToJsonInput, {
      isolatedLambdas: custom(
        (val) => serializeMap<string>(val),
        (val) => deseralizeMap<string>(val),
      ),
      code: primitive(),
    }),
  );
}

export class V1_GrammarToJsonOutput {
  modelDataContext?: V1_PureModelContextData;
  isolatedLambdas?: V1_LambdaInput;
  renderStyle?: V1_RenderStyle;
  codeError?: V1_ParserError;
}
