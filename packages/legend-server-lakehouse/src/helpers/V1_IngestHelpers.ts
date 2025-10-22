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

import {
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  V1_isIngestEnvsCompatibleWithEntitlements,
} from '@finos/legend-graph';
import type { IngestDeploymentServerConfig } from '../models/IngestDeploymentServerConfig.js';

export const getIngestDeploymentServerConfigName = (
  serverConf: IngestDeploymentServerConfig,
): string | undefined => {
  const baseUrl = new URL(serverConf.ingestServerUrl).hostname;
  const subdomain = baseUrl.split('.')[0];
  const parts = subdomain?.split('-');
  return parts?.slice(0, -1).join('-');
};

export enum LakehouseEnvironmentType {
  DEVELOPMENT = 'dev',
  PRODUCTION_PARALLEL = 'pp',
}

export const isEnvNameCompatibleWithEntitlementsLakehouseEnvironmentType = (
  envName: string,
  entitlementType: V1_EntitlementsLakehouseEnvironmentType,
): boolean => {
  if (envName.startsWith(`${LakehouseEnvironmentType.DEVELOPMENT}-`)) {
    return (
      entitlementType === V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT
    );
  } else if (
    envName.endsWith(`-${LakehouseEnvironmentType.PRODUCTION_PARALLEL}`)
  ) {
    return (
      entitlementType ===
      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL
    );
  }
  return entitlementType === V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;
};

export type IngestDeploymentServerConfigOption = {
  value: IngestDeploymentServerConfig;
  label: string;
};
export const buildIngestDeploymentServerConfigOption = (
  serverConf: IngestDeploymentServerConfig,
): IngestDeploymentServerConfigOption => {
  const envLabel =
    serverConf.environmentClassification ===
    V1_IngestEnvironmentClassification.PROD
      ? ''
      : ` [${serverConf.environmentClassification}] `;
  return {
    value: serverConf,
    label: `${serverConf.environmentName}${envLabel}`,
  };
};

export const filterEnvironmentsByEntitlementsEnv = (
  entitlementsType: V1_EntitlementsLakehouseEnvironmentType,
  environments: IngestDeploymentServerConfig[],
): IngestDeploymentServerConfig[] => {
  return environments.filter((env) =>
    V1_isIngestEnvsCompatibleWithEntitlements(
      env.environmentClassification,
      entitlementsType,
    ),
  );
};
