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

import { action, flow, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import { DSL_DATASPACE_EVENT } from '../__lib__/DSL_DataSpace_Event.js';

export enum DATA_SPACE_QUALITY_LEVEL {
  DIAMOND = 'DIAMOND',
  PLATINUM = 'PLATINUM',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}

// A step-by-step breakdown of every criterion behind the quality rating, so the UI can show
// users a roadmap of what's already done and what's needed for the next tier.
export type DataSpaceQualityBreakdown = {
  isDescriptionDocumented: boolean;
  isExecutablesPresent: boolean;
  isModelsDocumentationPresent: boolean;
  isEveryServiceDocumented: boolean;
  attributeCoverage?: number;
  documentedAttributeCount: number;
  totalAttributeCount: number;
};

export type DataSpaceQualityResult = {
  qualityLevel: DATA_SPACE_QUALITY_LEVEL;
  qualityBreakdown: DataSpaceQualityBreakdown;
};

// The actual scoring (description/executables/Models Documentation checks, attribute
// coverage thresholds) lives server-side — see vendor-data-marketplace's
// `doc-quality/dataspace` endpoint — since SingleStore already has the dataspace's
// description and per-attribute documentation ingested for search. This state calls the
// host app's injected `fetchDataSpaceQuality` action (see DataSpaceViewerState) and stores
// the result. If the host app didn't wire that action up (e.g. a non-Marketplace consumer
// of DataSpaceViewerState), or the call fails, qualityLevel/qualityBreakdown stay undefined
// and the badge simply doesn't render.
export class DataSpaceQualityState {
  readonly dataSpaceViewerState: DataSpaceViewerState;
  qualityLevel: DATA_SPACE_QUALITY_LEVEL | undefined;
  qualityBreakdown: DataSpaceQualityBreakdown | undefined;
  readonly computingQualityState = ActionState.create();

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      qualityLevel: observable,
      qualityBreakdown: observable,
      setQualityLevel: action,
      setQualityBreakdown: action,
      computeQuality: flow,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  setQualityLevel(val: DATA_SPACE_QUALITY_LEVEL | undefined): void {
    this.qualityLevel = val;
  }

  setQualityBreakdown(val: DataSpaceQualityBreakdown | undefined): void {
    this.qualityBreakdown = val;
  }

  get isSupported(): boolean {
    return this.dataSpaceViewerState.fetchDataSpaceQuality !== undefined;
  }

  *computeQuality(): GeneratorFn<void> {
    if (!this.computingQualityState.isInInitialState) {
      return;
    }
    const fetchDataSpaceQuality =
      this.dataSpaceViewerState.fetchDataSpaceQuality;
    if (!fetchDataSpaceQuality) {
      this.computingQualityState.complete(false);
      return;
    }
    this.computingQualityState.inProgress();
    try {
      const result = (yield fetchDataSpaceQuality()) as DataSpaceQualityResult;
      this.setQualityLevel(result.qualityLevel);
      this.setQualityBreakdown(result.qualityBreakdown);
      this.computingQualityState.complete();
    } catch (error) {
      assertErrorThrown(error);
      // A cosmetic badge failing to load isn't worth a user-facing toast — just log it and
      // leave qualityLevel/qualityBreakdown undefined so the badge doesn't render.
      this.dataSpaceViewerState.applicationStore.logService.warn(
        LogEvent.create(DSL_DATASPACE_EVENT.ERROR_FETCH_DATA_SPACE_QUALITY),
        error,
      );
      this.computingQualityState.complete(false);
    }
  }
}
