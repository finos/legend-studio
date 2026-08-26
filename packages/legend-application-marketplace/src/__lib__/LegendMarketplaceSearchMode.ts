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

/**
 * Which search experience a query should be dispatched to.
 *
 * Modelled as a single enum rather than a set of booleans because the options are
 * mutually exclusive — with more than two alternatives, pairwise "turn the other
 * ones off" logic does not scale.
 *
 * Lives in `__lib__` (rather than on the search bar component) so it can be shared
 * by the search bar, navigation route generation, and telemetry without a
 * component -> lib -> component import cycle.
 */
export enum MarketplaceSearchMode {
  /** Default: hybrid search over DataSpaces and Data Products. */
  DATA_SPACES = 'dataSpaces',
  /** Bypasses the search service to surface freshly-created data products. */
  PRODUCER = 'producer',
  /** Field-level search across data products. */
  DATA_FIELDS = 'dataFields',
  /** Lexical search over Lakehouse Data Products only. */
  LAKEHOUSE_ACCESS = 'lakehouseAccess',
}

/** Shared label + tooltip copy for the Lakehouse Access search mode. */
export const LAKEHOUSE_ACCESS_SEARCH_MODE_LABEL = 'Lakehouse Access';
export const LAKEHOUSE_ACCESS_SEARCH_MODE_TOOLTIP =
  'Lakehouse Access: is the new name for what you knew as Data Product — Lakehouse-scoped data API used for entitlements.';

/**
 * Shared copy explaining the Data Product -> Lakehouse Access rename, shown on both
 * the DataSpaces search results page and the dedicated Lakehouse Access tab so the
 * two pages don't drift into two independently-edited versions of the same story.
 */
export const LAKEHOUSE_ACCESS_TAB_INTRO_BANNER_TEXT =
  'This is the new home for Data Products — the same entitled, Lakehouse-scoped API surface, now with its own search tab, dedicated filtering. DataSpace search on the homepage still surfaces these results for now.';

export const DATA_SPACES_LAKEHOUSE_ACCESS_INTRO_BANNER_TEXT =
  "Results include both DataSpaces (firm's data-domain artifact for business concepts) and Lakehouse Access items (Data Product). Lakehouse Access is moving to its own tab soon.";
