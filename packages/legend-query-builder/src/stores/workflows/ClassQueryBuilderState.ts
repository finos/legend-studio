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

import {
  type Class,
  type Mapping,
  getClassCompatibleMappings,
  getMappingCompatibleRuntimes,
  RuntimePointer,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { renderClassQueryBuilderSetupPanelContent } from '../../components/workflows/ClassQueryBuilder.js';
import { QueryBuilderState } from '../QueryBuilderState.js';

export class ClassQueryBuilderState extends QueryBuilderState {
  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderClassQueryBuilderSetupPanelContent(this);

  /**
   * Propagation after changing the class:
   * - If no mapping is chosen, try to choose a compatible mapping
   * - If the chosen mapping is compatible with the new selected class, do nothing, otherwise, try to choose a compatible mapping
   * - This change will propagate to runtime: we will attempt to choose a compatible runtime with the newly selected mapping
   */
  propagateClassChange(_class: Class): void {
    const compatibleMappings = getClassCompatibleMappings(
      _class,
      this.graphManagerState.usableMappings,
    );
    // cascading
    const isCurrentMappingCompatible =
      this.executionContextState.mapping &&
      compatibleMappings.includes(this.executionContextState.mapping);
    if (this.isMappingReadOnly || isCurrentMappingCompatible) {
      return;
    }
    // try to select the first compatible mapping
    const possibleNewMapping = compatibleMappings[0];
    if (possibleNewMapping) {
      this.changeMapping(possibleNewMapping);
      this.propagateMappingChange(possibleNewMapping);
    }
  }

  /**
   * Propagation after changing the mapping:
   * - If no runtime is chosen, try to choose a compatible runtime
   * - If the chosen runtime is compatible with the new chosen mapping, do nothing, otherwise, try to choose a compatible runtime
   */
  propagateMappingChange(mapping: Mapping): void {
    // try to choose the first compatible runtime,
    // if none found, just unset the current runtime value
    const compatibleRuntimes = getMappingCompatibleRuntimes(
      mapping,
      this.graphManagerState.usableRuntimes,
    );
    const possibleNewRuntime = compatibleRuntimes[0];
    if (possibleNewRuntime) {
      this.changeRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(possibleNewRuntime),
        ),
      );
    }
  }
}
