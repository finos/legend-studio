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

import { getExpectedArtifactGenerationExtensionOutputPath } from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import type { DataSpaceAnalysisResult } from './DataSpaceAnalysis.js';

const DATASPACE_ANALYTICS_FILE_NAME = 'AnalyticsResult.json';
const V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY = 'dataSpace-analytics';

export const retrieveAnalyticsResultCache = async (
  groupId: string,
  artifactId: string,
  versionId: string,
  dataSpacePath: string,
  depotServerClient: DepotServerClient,
): Promise<PlainObject<DataSpaceAnalysisResult>> =>
  JSON.parse(
    await depotServerClient.getGenerationContentByPath(
      groupId,
      artifactId,
      versionId,
      getExpectedArtifactGenerationExtensionOutputPath(
        dataSpacePath,
        V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY,
        DATASPACE_ANALYTICS_FILE_NAME,
      ),
    ),
  );
