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

import type { LegendApplicationPlugin } from '@finos/legend-application';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import type {
  DataSpaceExecutableAnalysisResult,
  DataSpaceExecutableTDSResult,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';

export type TDSExecutableActionConfiguration = {
  key: string;
  title: string;
  icon?: React.ReactNode | undefined;
  isSupported: (
    dataSpaceViewerState: DataSpaceViewerState,
    executableAnalysisResult: DataSpaceExecutableAnalysisResult,
    tdsResult: DataSpaceExecutableTDSResult,
  ) => boolean;
  renderer: (
    dataSpaceViewerState: DataSpaceViewerState,
    executableAnalysisResult: DataSpaceExecutableAnalysisResult,
    tdsResult: DataSpaceExecutableTDSResult,
  ) => React.ReactNode | undefined;
};

export interface DSL_DataSpace_LegendApplicationPlugin_Extension
  extends LegendApplicationPlugin {
  /**
   * Get the list of configurations of actions for TDS executable
   */
  getExtraDataSpaceTDSExecutableActionConfigurations?(): TDSExecutableActionConfiguration[];
}
