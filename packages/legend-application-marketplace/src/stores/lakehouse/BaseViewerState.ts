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
import { makeObservable, observable, type AnnotationsMap } from 'mobx';

export interface ILayoutState {
  currentNavigationZone: string;
  setCurrentNavigationZone: (zone: string) => void;
  setWikiPageAnchorToNavigate: (params: { anchor: string } | undefined) => void;
}

export abstract class BaseViewerState<
  TProduct,
  TLayoutState extends ILayoutState,
> {
  readonly product: TProduct;
  readonly layoutState: TLayoutState;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;

  constructor(
    product: TProduct,
    actions?: {
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    this.product = product;
    this.onZoneChange = actions?.onZoneChange;
    this.layoutState = this.createLayoutState();
    this.initializeObservables();
  }

  protected initializeObservables(): void {
    makeObservable(this, {
      product: observable,
      onZoneChange: observable,
      ...this.getObservableProperties(),
    });
  }

  // Abstract methods that subclasses must implement
  protected abstract createLayoutState(): TLayoutState;
  protected abstract getObservableProperties(): AnnotationsMap<this, never>;
  protected abstract getValidSections(): string[];

  // Common changeZone implementation
  changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }

    if (zone !== this.layoutState.currentNavigationZone) {
      if (this.getValidSections().includes(zone)) {
        this.layoutState.setWikiPageAnchorToNavigate({
          anchor: zone,
        });
      }
      this.onZoneChange?.(zone);
      this.layoutState.setCurrentNavigationZone(zone);
    }
  }
}
