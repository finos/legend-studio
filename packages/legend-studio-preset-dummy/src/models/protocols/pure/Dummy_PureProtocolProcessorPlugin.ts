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

import packageJson from '../../../../package.json';
import type {
  PluginManager,
  V1_ElementBuilder,
  V1_ElementProtocolClassifierPathGetter,
  V1_ElementProtocolDeserializer,
  V1_ElementProtocolSerializer,
  V1_ElementTransformer,
  V1_ExecutionInputGetter,
  V1_FunctionExpressionBuilder,
  V1_PackageableElement,
  V1_PureModelContextData,
} from '@finos/legend-studio';
import { PureProtocolProcessorPlugin } from '@finos/legend-studio';
import type { PlainObject } from '@finos/legend-studio-shared';

export class Dummy_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  // NOTE: we do this so we are reminded to add new plugin methods to this class every time we introduce a new one
  implements Required<PureProtocolProcessorPlugin>
{
  constructor() {
    super(
      `${packageJson.pluginPrefix}-pure-protocol-processor`,
      packageJson.version,
    );
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  V1_getExtraSystemModels(): PlainObject<V1_PureModelContextData>[] {
    return [];
  }
  V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [];
  }
  V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [];
  }
  V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [];
  }
  V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [];
  }
  V1_getExtraElementTransformers(): V1_ElementTransformer[] {
    return [];
  }
  V1_getExtraSourceInformationKeys(): string[] {
    return [];
  }
  V1_getExtraFunctionExpressionBuilders(): V1_FunctionExpressionBuilder[] {
    return [];
  }
  V1_getExtraExecutionInputGetters(): V1_ExecutionInputGetter[] {
    return [];
  }
}
