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

import { observable, action, makeObservable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { LineageModel } from '@finos/legend-graph';

export enum LINEAGE_VIEW_MODE {
  CLASS_LINEAGE = 'CLASS_LINEAGE',
  DATABASE_LINEAGE = 'DATABASE_LINEAGE',
  REPORT_LINEAGE = 'REPORT_LINEAGE',
}

export class LineageState {
  applicationStore: GenericLegendApplicationStore;
  selectedTab: LINEAGE_VIEW_MODE = LINEAGE_VIEW_MODE.DATABASE_LINEAGE;
  lineageData: LineageModel | undefined = undefined;
  isLineageViewerOpen = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      selectedTab: observable,
      lineageData: observable,
      isLineageViewerOpen: observable,
      setSelectedTab: action,
      setLineageData: action,
      setIsLineageViewerOpen: action,
    });
    this.applicationStore = applicationStore;
  }

  setSelectedTab(tab: LINEAGE_VIEW_MODE): void {
    this.selectedTab = tab;
  }

  setLineageData(data: LineageModel | undefined): void {
    this.lineageData = data;
  }

  setIsLineageViewerOpen(isOpen: boolean): void {
    this.isLineageViewerOpen = isOpen;
  }
}
