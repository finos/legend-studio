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

import { action, computed, makeObservable, observable } from 'mobx';
import { getNullableFirstElement, uniq } from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type Class,
  type Mapping,
  type PackageableRuntime,
  type Runtime,
  PackageableElementExplicitReference,
  RuntimePointer,
  getAllIncludedMappings,
} from '@finos/legend-graph';

abstract class QueryBuilderSetupState {
  queryBuilderState: QueryBuilderState;
  _class?: Class | undefined;
  mapping?: Mapping | undefined;
  runtimeValue?: Runtime | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      _class: observable,
      mapping: observable,
      runtimeValue: observable,
    });

    this.queryBuilderState = queryBuilderState;
  }

  abstract setClass(val: Class | undefined): void;
  abstract setMapping(val: Mapping | undefined): void;
  abstract setRuntimeValue(val: Runtime | undefined): void;
}

// TODO-BEFORE-PR: we should remove this
export class BasicQueryBuilderSetupState extends QueryBuilderSetupState {
  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);

    makeObservable(this, {
      classes: computed,
      mappings: computed,
      compatibleMappings: computed,
      compatibleRuntimes: computed,
      setClass: action,
      setMapping: action,
      setRuntimeValue: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  get classes(): Class[] {
    return this.queryBuilderState.graphManagerState.graph.ownClasses
      .concat(
        this.queryBuilderState.graphManagerState.collectExposedSystemElements(
          this.queryBuilderState.graphManagerState.graph.systemModel.ownClasses,
        ),
      )
      .concat(
        this.queryBuilderState.graphManagerState.graph.dependencyManager
          .classes,
      );
  }

  get mappings(): Mapping[] {
    return this.queryBuilderState.graphManagerState.graph.mappings;
  }

  get compatibleMappings(): Mapping[] {
    const mappingsWithClassMapped = this.mappings.filter((mapping) =>
      mapping.classMappings.some((cm) => cm.class.value === this._class),
    );
    const resolvedMappingIncludes = this.mappings.filter((mapping) =>
      getAllIncludedMappings(mapping).some((e) =>
        mappingsWithClassMapped.includes(e),
      ),
    );
    return this._class
      ? uniq([...mappingsWithClassMapped, ...resolvedMappingIncludes])
      : [];
  }

  get compatibleRuntimes(): PackageableRuntime[] {
    const mapping = this.mapping;
    // If the runtime claims to cover some mappings which include the specified mapping,
    // then we deem the runtime to be compatible with the such mapping
    return mapping
      ? this.queryBuilderState.graphManagerState.graph.runtimes.filter(
          (runtime) =>
            runtime.runtimeValue.mappings
              .map((mappingReference) => [
                mappingReference.value,
                ...getAllIncludedMappings(mappingReference.value),
              ])
              .flat()
              .includes(mapping),
        )
      : [];
  }

  setClass(val: Class | undefined): void {
    this._class = val;
    const isMappingEditable = !this.queryBuilderState.isMappingReadOnly;
    const isCurrentMappingCompatible =
      this.mapping && this.compatibleMappings.includes(this.mapping);
    if (isMappingEditable && !isCurrentMappingCompatible) {
      // try to select the first compatible mapping
      const possibleMapping = getNullableFirstElement(this.compatibleMappings);
      if (possibleMapping) {
        this.setMapping(possibleMapping);
      }
    }
  }

  setMapping(val: Mapping | undefined): void {
    this.mapping = val;
    if (this.queryBuilderState.isRuntimeReadOnly) {
      return;
    }
    const runtimeToPick = getNullableFirstElement(this.compatibleRuntimes);
    if (runtimeToPick) {
      this.setRuntimeValue(
        new RuntimePointer(
          PackageableElementExplicitReference.create(runtimeToPick),
        ),
      );
    } else {
      // TODO?: we should consider if we allow users to use custom runtime here
      this.setRuntimeValue(undefined);
    }
  }

  setRuntimeValue(val: Runtime | undefined): void {
    this.runtimeValue = val;
  }
}
