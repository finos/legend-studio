/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Protocol } from 'EXEC/Protocol';
import { ParserError } from 'EXEC/ExecutionServerError';
import { serializable, object, custom } from 'serializr';
import { deseralizeMap, serializeMap } from 'Utilities/GeneralUtil';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';

export class LambdaInput {
  @serializable(object(Protocol)) serializer?: Protocol;
  // FIXME: once this is refactored properly in V1, we will use V1 Lambda and can remove the @serializable stuff from MM Lambda
  @serializable(custom(val => serializeMap(val, Lambda), val => deseralizeMap(val, Lambda))) lambdas?: Map<string, Lambda>;
  @serializable(custom(val => serializeMap(val, ParserError), val => deseralizeMap(val, ParserError))) lambdaErrors?: Map<string, ParserError>;
}
