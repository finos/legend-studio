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

import type { Concat } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/**
 * The Concat editor's draft (PLAN §11.5): its one setting, Convert types
 * (Q5), which converts types that differ within numbers, strings or dates
 * to the type they share
 */
export class CubeConcatDraft extends CubeNodeDraft<Concat> {
  widenTypes: boolean;

  constructor(original: Concat) {
    super(original);
    makeObservable(this, {
      widenTypes: observable,
      setWidenTypes: action,
    });
    this.widenTypes = original.widenTypes;
  }

  setWidenTypes(widenTypes: boolean): void {
    this.widenTypes = widenTypes;
  }

  /** The original while the setting is as it was */
  build(): Concat {
    const { original, widenTypes } = this;
    return widenTypes === original.widenTypes
      ? original
      : original.withWidenTypes(widenTypes);
  }
}
