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

import { CLIENT_VERSION } from 'MetaModelConst';
import { PureModelContextDataObject } from 'MM/AbstractPureGraphManager';

export class GenerationInput {
  clientVersion?: string;
  model: PureModelContextDataObject;
  config?: Record<PropertyKey, unknown>;

  constructor(model: PureModelContextDataObject | object, config?: Record<PropertyKey, unknown>) {
    this.clientVersion = CLIENT_VERSION.V1_0_0;
    this.model = model as PureModelContextDataObject;
    this.config = config;
  }
}
