/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { V1_IngestEnvironmentClassification } from '../ingest/V1_LakehouseIngestEnvironment.js';
import { V1_EntitlementsLakehouseEnvironmentType } from '../entitlements/V1_EntitlementsDataProduct.js';

export const V1_getEntitlementsEnvFromIngestEnv = (
  ingestEnv: V1_IngestEnvironmentClassification,
): V1_EntitlementsLakehouseEnvironmentType => {
  switch (ingestEnv) {
    case V1_IngestEnvironmentClassification.DEV:
      return V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT;
    case V1_IngestEnvironmentClassification.PROD_PARALLEL:
      return V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL;
    case V1_IngestEnvironmentClassification.PROD:
      return V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;
    default:
      return V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;
  }
};

export const V1_isIngestEnvsCompatibleWithEntitlements = (
  ingestEnv: V1_IngestEnvironmentClassification,
  entitlementEnv: V1_EntitlementsLakehouseEnvironmentType,
): boolean => {
  return V1_getEntitlementsEnvFromIngestEnv(ingestEnv) === entitlementEnv;
};
