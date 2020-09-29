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

import { PureModelContextDataObject as MM_PureModelContextDataObject } from 'MM/AbstractPureGraphManager';

export class ExecuteInput {
  clientVersion: string;
  function: Record<PropertyKey, unknown>;
  mapping: string;
  model: MM_PureModelContextDataObject;
  runtime: Record<PropertyKey, unknown>;
  context: Record<PropertyKey, unknown>;

  constructor(clientVersion: string, func: Record<PropertyKey, unknown>, mapping: string, runtime: Record<PropertyKey, unknown>, model: MM_PureModelContextDataObject, context: Record<PropertyKey, unknown>) {
    this.clientVersion = clientVersion;
    this.function = func;
    this.runtime = runtime;
    this.model = model;
    this.mapping = mapping;
    this.context = context;
  }
}
