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

import type { V1_SampleQuery } from '@finos/legend-graph';
import type { DataAccessState } from '@finos/legend-query-builder';
import type { DataProductViewerState } from './DataProductViewerState.js';

export enum TDSSampleQueryTabKey {
  COLUMN_SPECIFICATIONS = 'column-specifications',
  QUERY = 'query',
  DATA_ACCESS = 'data-access',
  USAGE_STATS = 'usage-stats',
  QUERY_TEXT = 'query-text',
}

export enum RelationSampleQueryTabKey {
  COLUMN_SPECIFICATIONS = 'column-specifications',
  GRAMMAR = 'grammar',
}

export type TDSSampleQueryTabContext = {
  sampleQuery: V1_SampleQuery;
  dataProductViewerState: DataProductViewerState;
  dataAccessState: DataAccessState | undefined;
  queryGrammar: string;
  darkMode: boolean;
};

export type RelationSampleQueryTabContext = {
  sampleQuery: V1_SampleQuery;
  dataProductViewerState: DataProductViewerState;
  queryGrammar: string;
  darkMode: boolean;
};

export type DataProductTDSSampleQueryTabConfiguration = {
  key: string;
  label: string;
  icon?: React.ReactNode | null;
  isActionTab?: boolean;
  iconOnly?: boolean;
  title?: string;
  isVisible?: (context: TDSSampleQueryTabContext) => boolean;
  renderer: (context: TDSSampleQueryTabContext) => React.ReactNode;
};

export type DataProductRelationSampleQueryTabConfiguration = {
  key: string;
  label: string;
  icon?: React.ReactNode | null;
  isActionTab?: boolean;
  iconOnly?: boolean;
  title?: string;
  isVisible?: (context: RelationSampleQueryTabContext) => boolean;
  renderer: (context: RelationSampleQueryTabContext) => React.ReactNode;
};
