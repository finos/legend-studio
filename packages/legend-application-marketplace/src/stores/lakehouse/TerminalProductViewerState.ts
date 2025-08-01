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

import { type NavigationZone } from '@finos/legend-application';
import { makeObservable, observable } from 'mobx';
import { TERMINAL_PRODUCT_VIEWER_SECTION } from './DataProductViewerNavigation.js';
import type { V1_Terminal } from '@finos/legend-graph';
import { TerminalProductLayoutState } from './TerminalProductLayoutState.js';

export class TerminalProductViewerState {
  readonly product: V1_Terminal;
  readonly layoutState: TerminalProductLayoutState;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;

  constructor(product: V1_Terminal) {
    makeObservable(this, {
      product: observable,
      onZoneChange: observable,
    });
    this.product = product;
    this.layoutState = new TerminalProductLayoutState(this);
  }

  changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }

    if (zone !== this.layoutState.currentNavigationZone) {
      if (
        Object.values(TERMINAL_PRODUCT_VIEWER_SECTION)
          .map((e) => e.toString())
          .includes(zone)
      ) {
        this.layoutState.setWikiPageAnchorToNavigate({
          anchor: zone,
        });
      }
      this.onZoneChange?.(zone);
      this.layoutState.setCurrentNavigationZone(zone);
    }
  }
}
