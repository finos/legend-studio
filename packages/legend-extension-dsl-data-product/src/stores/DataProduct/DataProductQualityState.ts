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

import { action, flow, makeObservable, observable } from 'mobx';
import { ActionState, assertErrorThrown, LogEvent } from '@finos/legend-shared';
import type { V1_DataProductArtifact } from '@finos/legend-graph';
import {
  QUALITY_LEVEL,
  type DataProductQualityBreakdown,
  type DataProductQualityResponse,
} from '@finos/legend-server-marketplace';
import { DSL_DATAPRODUCT_EVENT } from '../../__lib__/DSL_DataProduct_Event.js';
import { getRelationColumnDescription } from '../../utils/LakehouseUtils.js';
import { findArtifactRelationType } from '../../utils/DataProductIngestUtils.js';

// Attribute-coverage tier thresholds. Keep in sync with vendor-data-marketplace's
// `quality_scoring_common.py` (DIAMOND_ATTRIBUTE_COVERAGE_THRESHOLD/
// PLATINUM_ATTRIBUTE_COVERAGE_THRESHOLD/GOLD_ATTRIBUTE_COVERAGE_THRESHOLD).
const DIAMOND_ATTRIBUTE_COVERAGE_THRESHOLD = 0.95;
const PLATINUM_ATTRIBUTE_COVERAGE_THRESHOLD = 0.9;
const GOLD_ATTRIBUTE_COVERAGE_THRESHOLD = 0.5;

// The backend's per-field documentation coverage comes from SingleStore, which doesn't have
// column-level documentation for lakehouse data products yet: it counts no fields at all and
// reports that as full coverage (see `lakehouse_quality_scoring.py`). The data product artifact,
// already fetched for the Column Specifications tab, has the real per-column documentation for
// every Access Point Group/Access Point, so coverage is recomputed from it here. Once SingleStore
// has the column-level docs, this recomputation and the thresholds below can go.
function computeAttributeCoverageFromArtifact(
  artifact: V1_DataProductArtifact,
): {
  documented: number;
  total: number;
} {
  let total = 0;
  let documented = 0;
  for (const apg of artifact.accessPointGroups) {
    for (const apImpl of apg.accessPointImplementations) {
      for (const column of findArtifactRelationType(apImpl)?.columns ?? []) {
        total++;
        const desc = getRelationColumnDescription(column)?.trim();
        if (desc && desc.toLowerCase() !== column.name.trim().toLowerCase()) {
          documented++;
        }
      }
    }
  }
  return { documented, total };
}

// Mirrors the tail of `compute_data_product_quality_level` in lakehouse_quality_scoring.py.
function deriveLevelFromAttributeCoverage(coverage: number): QUALITY_LEVEL {
  if (coverage >= DIAMOND_ATTRIBUTE_COVERAGE_THRESHOLD) {
    return QUALITY_LEVEL.DIAMOND;
  }
  if (coverage >= PLATINUM_ATTRIBUTE_COVERAGE_THRESHOLD) {
    return QUALITY_LEVEL.PLATINUM;
  }
  if (coverage >= GOLD_ATTRIBUTE_COVERAGE_THRESHOLD) {
    return QUALITY_LEVEL.GOLD;
  }
  return QUALITY_LEVEL.SILVER;
}

function isAttributeCoverageEligible(
  breakdown: DataProductQualityBreakdown,
): boolean {
  return (
    breakdown.isDescriptionDocumented &&
    breakdown.isAccessPointsPresent &&
    breakdown.isAccessPointGroupDescriptionsDocumented &&
    breakdown.isEveryAccessPointDocumented
  );
}

type DataProductQualityOutcome = {
  level: QUALITY_LEVEL;
  breakdown: DataProductQualityBreakdown;
};

// The backend's result, with the coverage and the tier it rests on recomputed from the artifact
// whenever it is available, regardless of whether the product is currently eligible for a
// coverage-driven tier: the roadmap tooltip shows the "(currently X%)" suffix for every
// not-yet-reached milestone (e.g. Platinum/Diamond) even for a BRONZE/SILVER product, and that
// should reflect real coverage too, not the backend's placeholder/vacuous value. Only the *tier*
// itself is gated on eligibility — a product shouldn't jump to DIAMOND on attribute coverage
// alone if it hasn't even cleared BRONZE/SILVER's own requirements.
// Without the artifact the backend's counts stand, unless it counted no field at all: it
// reports that as full coverage, which is no evidence of anything.
const applyRealCoverage = (
  result: DataProductQualityResponse,
  artifact: V1_DataProductArtifact | undefined,
): DataProductQualityOutcome => {
  let level = result.qualityLevel;
  let breakdown = result.qualityBreakdown;
  const counts = artifact
    ? computeAttributeCoverageFromArtifact(artifact)
    : breakdown.totalAttributeCount === 0
      ? { documented: 0, total: 0 }
      : undefined;
  if (counts) {
    // no column counted is no column documented: 0%, not the 100% that dividing by zero would
    // read as, which would promote an eligible product to DIAMOND
    const attributeCoverage =
      counts.total === 0 ? 0 : counts.documented / counts.total;
    breakdown = {
      ...breakdown,
      attributeCoverage,
      documentedAttributeCount: counts.documented,
      totalAttributeCount: counts.total,
    };
    if (isAttributeCoverageEligible(breakdown)) {
      level = deriveLevelFromAttributeCoverage(attributeCoverage);
    }
  }
  return { level, breakdown };
};

/**
 * What the quality state needs of the data product viewer it belongs to, so it can be driven
 * without a whole viewer.
 */
export interface DataProductQualityHost {
  readonly fetchDataProductQuality?:
    | (() => Promise<DataProductQualityResponse>)
    | undefined;
  readonly dataProductArtifactPromise:
    | Promise<V1_DataProductArtifact | undefined>
    | undefined;
  readonly applicationStore: {
    readonly logService: {
      warn: (event: LogEvent, ...data: unknown[]) => void;
    };
  };
}

// The description/Access-Point-Group/Access-Point checks (BRONZE/SILVER) are scored
// server-side — see vendor-data-marketplace's `doc-quality/lakehouse` endpoint — since
// SingleStore already has the data product's description ingested for search. Attribute
// (field-level) coverage, which decides GOLD/PLATINUM/DIAMOND, is instead recomputed
// client-side from the data product artifact (see computeAttributeCoverageFromArtifact above)
// and overrides what the backend returned, since SingleStore has no column-level documentation
// for lakehouse data products yet. This state calls the host app's injected
// `fetchDataProductQuality` action (see DataProductViewerState) and stores the result.
// If the host app didn't wire that action up (e.g. a non-Marketplace consumer of
// DataProductViewerState), or the call fails, qualityLevel/qualityBreakdown stay undefined and
// the badge simply doesn't render.
export class DataProductQualityState {
  readonly host: DataProductQualityHost;
  qualityLevel: QUALITY_LEVEL | undefined;
  qualityBreakdown: DataProductQualityBreakdown | undefined;
  readonly computingQualityState = ActionState.create();

  constructor(host: DataProductQualityHost) {
    makeObservable(this, {
      // replaced as a whole, never mutated in place
      qualityLevel: observable.ref,
      qualityBreakdown: observable.ref,
      setQuality: action,
      computeQuality: flow,
    });

    this.host = host;
  }

  /** sets both at once, so observers never see a level without its breakdown */
  setQuality(
    level: QUALITY_LEVEL | undefined,
    breakdown: DataProductQualityBreakdown | undefined,
  ): void {
    this.qualityLevel = level;
    this.qualityBreakdown = breakdown;
  }

  get isSupported(): boolean {
    return this.host.fetchDataProductQuality !== undefined;
  }

  /**
   * The artifact the real coverage is computed from. It never rejects: without it the
   * backend's own result is shown as it is.
   */
  private async loadArtifact(): Promise<V1_DataProductArtifact | undefined> {
    try {
      return await this.host.dataProductArtifactPromise;
    } catch (error) {
      assertErrorThrown(error);
      this.host.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.ERROR_FETCH_DATA_PRODUCT_QUALITY),
        error,
      );
      return undefined;
    }
  }

  /**
   * The quality of the product: what the backend says of it, once the artifact has been read
   * to correct the coverage. It rejects if the backend cannot be reached.
   */
  private async loadQuality(
    fetchDataProductQuality: () => Promise<DataProductQualityResponse>,
  ): Promise<DataProductQualityOutcome> {
    const [result, artifact] = await Promise.all([
      fetchDataProductQuality(),
      this.loadArtifact(),
    ]);
    return applyRealCoverage(result, artifact);
  }

  // NOTE: the generator is typed for its one `yield`, so what it yields comes back typed
  *computeQuality(): Generator<
    Promise<DataProductQualityOutcome>,
    void,
    DataProductQualityOutcome
  > {
    if (!this.computingQualityState.isInInitialState) {
      return;
    }
    const fetchDataProductQuality = this.host.fetchDataProductQuality;
    if (!fetchDataProductQuality) {
      this.computingQualityState.complete(false);
      return;
    }
    this.computingQualityState.inProgress();
    try {
      const { level, breakdown } = yield this.loadQuality(
        fetchDataProductQuality,
      );
      this.setQuality(level, breakdown);
      this.computingQualityState.complete();
    } catch (error) {
      assertErrorThrown(error);
      // A cosmetic badge failing to load isn't worth a user-facing toast — just log it and
      // leave qualityLevel/qualityBreakdown undefined so the badge doesn't render.
      this.host.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.ERROR_FETCH_DATA_PRODUCT_QUALITY),
        error,
      );
      this.computingQualityState.complete(false);
    }
  }
}
