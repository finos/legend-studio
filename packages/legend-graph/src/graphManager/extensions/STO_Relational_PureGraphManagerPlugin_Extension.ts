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

import type { AuthenticationStrategy } from '../../graph/metamodel/pure/packageableElements/store/relational/connection/AuthenticationStrategy.js';
import type { DatasourceSpecification } from '../../graph/metamodel/pure/packageableElements/store/relational/connection/DatasourceSpecification.js';
import type { PostProcessor } from '../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor.js';
import type { Milestoning } from '../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/Milestoning.js';
import type { ObserverContext } from '../action/changeDetection/CoreObserverHelper.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';

export type MilestoningObserver = (
  milestoning: Milestoning,
  context: ObserverContext,
) => Milestoning | undefined;
export type DatasourceSpecificationObserver = (
  dataSourceSpec: DatasourceSpecification,
  context: ObserverContext,
) => DatasourceSpecification | undefined;
export type AuthenticationStrategyObserver = (
  authStrategy: AuthenticationStrategy,
  context: ObserverContext,
) => AuthenticationStrategy | undefined;
export type PostProcessorObserver = (
  postProcessor: PostProcessor,
  context: ObserverContext,
) => PostProcessor | undefined;

export interface STO_Relational_PureGraphManagerPlugin_Extension
  extends PureGraphManagerPlugin {
  getExtraMilestoningObservers?(): MilestoningObserver[];

  getExtraDatasourceSpecificationObservers?(): DatasourceSpecificationObserver[];

  getExtraAuthenticationStrategyObservers?(): AuthenticationStrategyObserver[];

  getExtraPostProcessorObservers?(): PostProcessorObserver[];
}
