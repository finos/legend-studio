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
  NAVIGATION_ZONE_SEPARATOR,
  type GenericLegendApplicationStore,
  type NavigationZone,
} from '@finos/legend-application';
import {
  type GraphData,
  type GraphManagerState,
  type V1_DataProduct,
} from '@finos/legend-graph';
import type { VersionedProjectData } from '@finos/legend-server-depot';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  DATA_PRODUCT_WIKI_PAGE_SECTIONS,
  DataProductLayoutState,
} from './DataProductLayoutState.js';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from './DataProductViewerNavigation.js';
import { DataProductDataAccessState } from './DataProductDataAccessState.js';

export class DataProductViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly layoutState: DataProductLayoutState;
  readonly product: V1_DataProduct;
  readonly project: VersionedProjectData;
  readonly retrieveGraphData: () => GraphData;
  readonly viewSDLCProject: (path: string | undefined) => Promise<void>;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;
  currentActivity = DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  accessState: DataProductDataAccessState;
  generation: string | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    project: VersionedProjectData,
    product: V1_DataProduct,
    generation: string | undefined,
    actions: {
      retrieveGraphData: () => GraphData;
      viewSDLCProject: (path: string | undefined) => Promise<void>;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    makeObservable(this, {
      currentActivity: observable,
      setCurrentActivity: action,
      isVerified: computed,
      accessState: observable,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.project = project;
    this.product = product;
    this.generation = generation;
    this.retrieveGraphData = actions.retrieveGraphData;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.onZoneChange = actions.onZoneChange;
    this.layoutState = new DataProductLayoutState(this);
    this.accessState = new DataProductDataAccessState(this);
  }

  setCurrentActivity(val: DATA_PRODUCT_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  get isVerified(): boolean {
    // TODO what does it mean if data product is vertified ?
    return true;
  }

  changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }
    if (zone !== this.layoutState.currentNavigationZone) {
      const zoneChunks = zone.split(NAVIGATION_ZONE_SEPARATOR);
      const activityChunk = zoneChunks[0];
      const matchingActivity = Object.values(
        DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
      ).find(
        (activity) => generateAnchorForActivity(activity) === activityChunk,
      );
      if (activityChunk && matchingActivity) {
        if (DATA_PRODUCT_WIKI_PAGE_SECTIONS.includes(matchingActivity)) {
          this.layoutState.setWikiPageAnchorToNavigate({
            anchor: zone,
          });
        }
        this.setCurrentActivity(matchingActivity);
        this.onZoneChange?.(zone);
        this.layoutState.setCurrentNavigationZone(zone);
      } else {
        this.setCurrentActivity(DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        this.layoutState.setCurrentNavigationZone('');
      }
    }
  }
}
