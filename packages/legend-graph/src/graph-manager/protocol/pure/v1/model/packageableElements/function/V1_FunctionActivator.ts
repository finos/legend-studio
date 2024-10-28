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

import type { Hashable } from '@finos/legend-shared';
import {
  type V1_PackageableElementPointer,
  V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_TaggedValue } from '../domain/V1_TaggedValue.js';
import type { V1_StereotypePtr } from '../domain/V1_StereotypePtr.js';
import type { V1_DeploymentConfiguration } from '../../../engine/functionActivator/V1_DeploymentConfiguration.js';
import type { V1_Ownership } from './V1_Ownership.js';
import type { V1_PostDeploymentAction } from '../../../engine/functionActivator/V1_PostDeploymentAction.js';

export abstract class V1_FunctionActivator
  extends V1_PackageableElement
  implements Hashable
{
  function!: V1_PackageableElementPointer;
  activationConfiguration: V1_DeploymentConfiguration | undefined;
  ownership!: V1_Ownership;
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  actions: V1_PostDeploymentAction[] = [];
}
