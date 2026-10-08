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

/**
 * Shared copy explaining the Data Product -> Lakehouse Access rename, shown on both
 * the DataSpaces search results page and the dedicated Lakehouse Access tab so the
 * two pages don't drift into two independently-edited versions of the same story.
 */
export const LAKEHOUSE_ACCESS_TAB_INTRO_BANNER_TEXT =
  'This is the home for Data Products — the same entitled, Lakehouse-scoped API surface, with its own search tab and dedicated filtering. DataSpaces now live exclusively under the DataSpaces tab.';

/**
 * Rendered on the DataSpaces search results page with a hyperlink to the Lakehouse
 * Access tab appended after it, so this deliberately doesn't end with a period or
 * name the tab itself.
 */
export const DATA_SPACES_LAKEHOUSE_ACCESS_INTRO_BANNER_TEXT =
  "This tab now shows DataSpaces only (the firm's data-domain artifact for business concepts). Looking for Lakehouse Data Products? Head over to the";
