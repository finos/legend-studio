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
import { PackageableElement } from '../PackageableElement.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { ConcreteFunctionDefinition } from './ConcreteFunctionDefinition.js';
import type { DeploymentConfiguration } from '../../functionActivator/DeploymentConfiguration.js';
import type { Ownership } from './Ownership.js';
import type { PostDeploymentAction } from '../../functionActivator/PostDeploymentAction.js';

export abstract class FunctionActivator
  extends PackageableElement
  implements Hashable
{
  /**
   * This should be a reference to PackageableFunction but we haven't done that yet
   * See https://github.com/finos/legend-studio/issues/1070
   *
   * @discrepancy model
   */
  function!: PackageableElementReference<ConcreteFunctionDefinition>;
  activationConfiguration: DeploymentConfiguration | undefined;
  ownership!: Ownership;
  actions: PostDeploymentAction[] = [];
}
