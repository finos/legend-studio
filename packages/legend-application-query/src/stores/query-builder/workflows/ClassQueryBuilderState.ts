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
import { getNullableFirstElement } from '@finos/legend-shared';
import type React from 'react';
import { renderClassQueryBuilderSetupContent } from '../../../components/query-builder/workflows/ClassQueryBuilder.js';
import { QueryBuilderState } from '../QueryBuilderState.js';

export class ClassQueryBuilderState extends QueryBuilderState {
  override sideBarClassName = '';
  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderClassQueryBuilderSetupContent(this);

  get isParameterSupportDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }

  get isMappingReadOnly(): boolean {
    return false;
  }

  get isRuntimeReadOnly(): boolean {
    return false;
  }

  propagateClassChange(_class: Class): void {
    const compatibleMappings = getClassCompatibleMappings(
      _class,
      this.graphManagerState.usableMappings,
    );
    // cascading
    const isCurrentMappingCompatible =
      this.mapping && compatibleMappings.includes(this.mapping);
    if (this.isMappingReadOnly || isCurrentMappingCompatible) {
      return;
    }
    // try to select the first compatible mapping
    const possibleNewMapping = getNullableFirstElement(compatibleMappings);
    if (possibleNewMapping) {
      this.changeMapping(possibleNewMapping);
      this.propagateMappingChange(possibleNewMapping);
    }
  }

  propagateMappingChange(mapping: Mapping): void {
    if (this.isRuntimeReadOnly) {
      return;
    }
    // try to select the first compatible runtime,
    // if none found, just unset the current runtime value
    const compatibleRuntimes = getMappingCompatibleRuntimes(
      mapping,
      this.graphManagerState.usableRuntimes,
    );
    const possibleNewRuntime = getNullableFirstElement(compatibleRuntimes);
    if (possibleNewRuntime) {
      this.setRuntimeValue(
        new RuntimePointer(
          PackageableElementExplicitReference.create(possibleNewRuntime),
        ),
      );
    } else {
      this.setRuntimeValue(undefined);
    }
  }
}
