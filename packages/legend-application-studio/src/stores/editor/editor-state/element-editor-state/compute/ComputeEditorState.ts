/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { action, computed, makeObservable } from 'mobx';
import { guaranteeType } from '@finos/legend-shared';
import {
  Compute,
  type PackageableElement,
  SnowflakeComputeSpecification,
} from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import { reconcileComputeSpec } from './ComputeFormDescriptor.js';
import { SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR } from './SnowflakeComputeFormDescriptor.js';

export const applyOptionalInt = (
  raw: string,
  apply: (value: number | undefined) => void,
): void => {
  // a cleared number input reports `''`, which is how the field is unset
  if (raw === '') {
    apply(undefined);
    return;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return;
  }
  apply(parsed);
};

export class ComputeEditorState extends ElementEditorState {
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    makeObservable(this, {
      compute: computed,
      snowflakeSpecification: computed,
      applyFieldEdit: action,
    });
  }

  get compute(): Compute {
    return guaranteeType(
      this.element,
      Compute,
      'Element of compute editor state must be a Compute',
    );
  }

  /** `undefined` for spec types the form cannot render yet. */
  get snowflakeSpecification(): SnowflakeComputeSpecification | undefined {
    const spec = this.compute.specification;
    return spec instanceof SnowflakeComputeSpecification ? spec : undefined;
  }

  applyFieldEdit = (mutate: () => void): void => {
    const spec = this.snowflakeSpecification;
    if (!spec) {
      return;
    }
    mutate();
    reconcileComputeSpec(SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR, spec);
  };

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ComputeEditorState {
    return new ComputeEditorState(editorStore, newElement);
  }
}
