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

import type { Connection } from '../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import type { DEPRECATED__InputData } from '../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { PropertyMapping } from '../../graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';
import type { SetImplementation } from '../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { ObserverContext } from '../action/changeDetection/CoreObserverHelper.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';

export type ConnectionObserver = (
  connection: Connection,
  context: ObserverContext,
) => Connection | undefined;

export type SetImplementationObserver = (
  setImplementation: SetImplementation,
  context: ObserverContext,
) => SetImplementation | undefined;

export type PropertyMappingObserver = (
  propertyMapping: PropertyMapping,
  context: ObserverContext,
) => PropertyMapping | undefined;

export type PropertyMappingStubChecker = (
  propertyMapping: PropertyMapping,
) => boolean | undefined;

export type MappingTestInputDataObserver = (
  inputData: DEPRECATED__InputData,
  context: ObserverContext,
) => DEPRECATED__InputData | undefined;

export interface DSL_Mapping_PureGraphManagerPlugin_Extension
  extends PureGraphManagerPlugin {
  getExtraSetImplementationObservers?(): SetImplementationObserver[];

  getExtraMappingTestInputDataObservers?(): MappingTestInputDataObserver[];

  getExtraPropertyMappingObservers?(): PropertyMappingObserver[];

  getExtraConnectionObservers?(): ConnectionObserver[];

  /**
   * Get the list of checkers which can verify if the specified property mapping is
   * stubbed (potentially prunable) or not
   */
  getExtraPropertyMappingStubCheckers?(): PropertyMappingStubChecker[];
}
