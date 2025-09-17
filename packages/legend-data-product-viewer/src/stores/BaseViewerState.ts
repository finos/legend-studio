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
  type ApplicationStore,
  type LegendApplicationConfig,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
  type NavigationZone,
  StereotypeConfig,
} from '@finos/legend-application';
import type { BaseLayoutState } from './BaseLayoutState.js';
import type { GraphManagerPluginManager } from '@finos/legend-graph';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema } from 'serializr';

export class DataProductConfig {
  publicStereotype!: StereotypeConfig;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductConfig, {
      publicStereotype: usingModelSchema(StereotypeConfig.serialization.schema),
    }),
  );
}

export type ProductViewerLegendApplicationConfig = LegendApplicationConfig & {
  options: {
    dataProductConfig: DataProductConfig;
  };
};

export type ProductViewerLegendApplicationStore = ApplicationStore<
  ProductViewerLegendApplicationConfig,
  LegendApplicationPluginManager<LegendApplicationPlugin> &
    GraphManagerPluginManager
>;

export abstract class BaseViewerState<
  TProduct,
  TLayoutState extends BaseLayoutState,
> {
  readonly product: TProduct;
  readonly layoutState: TLayoutState;
  readonly applicationStore: ProductViewerLegendApplicationStore;

  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;

  constructor(
    product: TProduct,
    applicationStore: ProductViewerLegendApplicationStore,
    layoutState: TLayoutState,
    actions?: {
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    this.product = product;
    this.applicationStore = applicationStore;
    this.onZoneChange = actions?.onZoneChange;
    this.layoutState = layoutState;
  }

  protected abstract getValidSections(): string[];
  public abstract getTitle(): string | undefined;
  public abstract getPath(): string | undefined;
  public abstract getName(): string | undefined;

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
