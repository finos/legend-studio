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

import { action, flow, makeAutoObservable } from 'mobx';
import {
  getNullableFirstElement,
  isNonNullable,
  uniq,
} from '@finos/legend-studio-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import type {
  Class,
  EditorStore,
  Mapping,
  PackageableRuntime,
  RawLambda,
  Runtime,
} from '@finos/legend-studio';
import {
  decorateRuntimeWithNewMapping,
  EngineRuntime,
  PackageableElementExplicitReference,
  RuntimeEditorState,
  RuntimePointer,
} from '@finos/legend-studio';

export class QueryBuilderSetupState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  _class?: Class;
  mapping?: Mapping;
  runtime: Runtime;
  runtimeEditorState?: RuntimeEditorState;
  mappingIsReadOnly = false;
  runtimeIsReadOnly = false;
  onSave?: (lambda: RawLambda) => Promise<void>;
  showSetupPanel = true;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      setQueryBuilderState: action,
      setClass: action,
      setMapping: action,
      setRuntime: action,
      setShowSetupPanel: action,
      setOnSaveQuery: action,
      useCustomRuntime: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.runtime = new EngineRuntime();
  }

  get possibleMappings(): Mapping[] {
    const mappingsWithClassMapped =
      this.editorStore.graphState.graph.mappings.filter((mapping) =>
        mapping.classMappings.some((cm) => cm.class.value === this._class),
      );
    const resolvedMappingIncludes =
      this.editorStore.graphState.graph.mappings.filter((mapping) =>
        mapping.allIncludedMappings.some((e) =>
          mappingsWithClassMapped.includes(e),
        ),
      );
    return this._class
      ? uniq([...mappingsWithClassMapped, ...resolvedMappingIncludes])
      : [];
  }

  get possibleRuntimes(): PackageableRuntime[] {
    return this._class && this.mapping
      ? this.editorStore.graphState.graph.runtimes
          .map((packageableRuntime) =>
            packageableRuntime.runtimeValue.mappings.some((mapping) =>
              this.possibleMappings.includes(mapping.value),
            )
              ? packageableRuntime
              : undefined,
          )
          .filter(isNonNullable)
      : [];
  }

  get isMappingCompatible(): boolean {
    if (this.mapping && this._class) {
      return this.possibleMappings.includes(this.mapping);
    }
    return false;
  }

  setQueryBuilderState(queryBuilderState: QueryBuilderState): void {
    this.queryBuilderState = queryBuilderState;
  }
  setRuntime(val: Runtime): void {
    if (!this.runtimeIsReadOnly) {
      this.runtime = val;
    }
  }
  setOnSaveQuery(
    val: ((lambda: RawLambda) => Promise<void>) | undefined,
  ): void {
    this.onSave = val;
  }
  setShowSetupPanel(val: boolean): void {
    this.showSetupPanel = val;
  }
  setMappingIsReadOnly(val: boolean): void {
    this.mappingIsReadOnly = val;
  }
  setRuntimeIsReadOnly(val: boolean): void {
    this.runtimeIsReadOnly = val;
  }

  setClass(val: Class | undefined, isRebuildingState?: boolean): void {
    this._class = val;
    const isMappingEditable = !isRebuildingState && !this.mappingIsReadOnly;
    if (isMappingEditable && !this.isMappingCompatible) {
      const possibleMapping = getNullableFirstElement(this.possibleMappings);
      if (possibleMapping) {
        this.setMapping(possibleMapping);
      }
    }
  }

  setMapping(val: Mapping | undefined): void {
    if (!this.mappingIsReadOnly) {
      this.mapping = val;
      const runtimeToPick = getNullableFirstElement(this.possibleRuntimes);
      if (runtimeToPick) {
        this.setRuntime(
          new RuntimePointer(
            PackageableElementExplicitReference.create(runtimeToPick),
          ),
        );
      } else {
        this.useCustomRuntime();
      }
    }
  }

  setup = flow(function* (
    this: QueryBuilderSetupState,
    func: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime,
    onSave: (lambda: RawLambda) => Promise<void>,
    disableCompile: boolean,
  ) {
    this.setMapping(mapping);
    this.setRuntime(runtime);
    this.queryBuilderState.initWithRawLambda(func);
    this.setOnSaveQuery(onSave);
    yield this.queryBuilderState.setOpenQueryBuilder(true, {
      disableCompile: disableCompile,
    });
    this.setMappingIsReadOnly(true);
    this.setRuntimeIsReadOnly(true);
  });

  closeRuntimeEditor(): void {
    this.runtimeEditorState = undefined;
  }

  openRuntimeEditor(): void {
    if (!(this.runtime instanceof RuntimePointer)) {
      this.runtimeEditorState = new RuntimeEditorState(
        this.editorStore,
        this.runtime,
        true,
      );
    }
  }

  useCustomRuntime(): void {
    if (!this.runtimeIsReadOnly && this.mapping) {
      const customRuntime = new EngineRuntime();
      customRuntime.addMapping(
        PackageableElementExplicitReference.create(this.mapping),
      );
      decorateRuntimeWithNewMapping(
        customRuntime,
        this.mapping,
        this.editorStore.graphState.graph,
      );
      this.setRuntime(customRuntime);
    }
  }
}
