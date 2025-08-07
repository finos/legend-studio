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

import { BaseViewerState } from './BaseViewerState.js';
import { TERMINAL_PRODUCT_VIEWER_SECTION } from './DataProductViewerNavigation.js';
import type { V1_Terminal } from '@finos/legend-graph';
import { TerminalProductLayoutState } from './BaseLayoutState.js';
import { observable, type AnnotationsMap } from 'mobx';

export class TerminalProductViewerState extends BaseViewerState<
  V1_Terminal,
  TerminalProductLayoutState
> {
  protected createLayoutState(): TerminalProductLayoutState {
    return new TerminalProductLayoutState(this);
  }

  protected getObservableProperties(): AnnotationsMap<this, never> {
    return {
      product: observable,
      onZoneChange: observable,
      layoutState: observable,
    };
  }

  protected override getValidSections(): string[] {
    return Object.values(TERMINAL_PRODUCT_VIEWER_SECTION).map((section) =>
      section.toString(),
    );
  }
}
