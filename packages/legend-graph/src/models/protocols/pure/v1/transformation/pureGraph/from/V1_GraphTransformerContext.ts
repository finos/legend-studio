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

import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';

export class V1_GraphTransformerContext {
  readonly keepSourceInformation: boolean;
  readonly plugins: PureProtocolProcessorPlugin[];

  constructor(builder: V1_GraphTransformerContextBuilder) {
    this.keepSourceInformation = builder.keepSourceInformation;
    this.plugins = builder.plugins;
  }
}

export class V1_GraphTransformerContextBuilder {
  keepSourceInformation = false;
  plugins: PureProtocolProcessorPlugin[] = [];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.plugins = plugins;
  }

  withKeepSourceInformationFlag(
    val: boolean,
  ): V1_GraphTransformerContextBuilder {
    this.keepSourceInformation = val;
    return this;
  }

  build(): V1_GraphTransformerContext {
    return new V1_GraphTransformerContext(this);
  }
}
