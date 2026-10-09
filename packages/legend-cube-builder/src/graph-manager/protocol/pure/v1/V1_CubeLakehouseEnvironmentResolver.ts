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

import type { V1_EntitlementsUserEnvResponse } from '@finos/legend-graph';
import {
  decorateEnvWithRealm,
  type LakehouseContractServerClient,
  LakehouseEnvironmentType,
} from '@finos/legend-server-lakehouse';
import {
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../CubeDataProduct.js';
import { CubeEngineError, CubeEngineErrorKind } from '../../../CubeEngine.js';
import type { CubeLakehouseEnvironment } from '../../../CubeLakehouseEnvironment.js';

// The viewer's lakehouse environment, as Legend Query resolves it
// (QueryEditorStore.resolveLakehouseEnvAndWarehouse): the environment the
// host remembers for the viewer, else the first one the viewer's
// entitlements name, read once per page visit. Query adds the
// production-parallel realm for a snapshot version; Cube adds it for a
// production-parallel deployment too, as Data Cube does

export const V1_CUBE_NO_LAKEHOUSE_ENVIRONMENT =
  'Unable to resolve lakehouse user environment. Please ensure your lakehouse entitlements are configured.';

const isSnapshotVersion = (versionId: string): boolean =>
  versionId.endsWith('-SNAPSHOT');

export class V1_CubeLakehouseEnvironmentResolver
  implements CubeLakehouseEnvironment
{
  private readonly contractServerClient: LakehouseContractServerClient;
  private readonly getAccessToken: () => string | undefined;
  private readonly getCurrentUser: () => string;
  private readonly getPreferredEnvironment: () => string | undefined;
  /** The viewer's environment, read on the first run of the page visit */
  private userEnvironment: Promise<string> | undefined;

  constructor(
    contractServerClient: LakehouseContractServerClient,
    getAccessToken: () => string | undefined,
    getCurrentUser: () => string,
    getPreferredEnvironment: () => string | undefined = () => undefined,
  ) {
    this.contractServerClient = contractServerClient;
    this.getAccessToken = getAccessToken;
    this.getCurrentUser = getCurrentUser;
    this.getPreferredEnvironment = getPreferredEnvironment;
  }

  private readUserEnvironment(): Promise<string> {
    const preferred = this.getPreferredEnvironment();
    if (preferred) {
      return Promise.resolve(preferred);
    }
    this.userEnvironment ??= (async () => {
      let response: V1_EntitlementsUserEnvResponse;
      try {
        response = await this.contractServerClient.getUserEntitlementEnvs(
          this.getCurrentUser(),
          this.getAccessToken(),
        );
      } catch (error) {
        throw new CubeEngineError(
          CubeEngineErrorKind.NETWORK,
          `${V1_CUBE_NO_LAKEHOUSE_ENVIRONMENT}\n${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const environment = response.users
        .map((user) => user.lakehouseEnvironment)
        .find((name) => typeof name === 'string' && name.length > 0);
      if (!environment) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          V1_CUBE_NO_LAKEHOUSE_ENVIRONMENT,
        );
      }
      return environment;
    })().catch((error: unknown) => {
      // read again on the next run
      this.userEnvironment = undefined;
      throw error;
    });
    return this.userEnvironment;
  }

  async resolveEnvironment(project: CubeDataProductProject): Promise<string> {
    const environment = await this.readUserEnvironment();
    return project.environmentType ===
      CubeDataProductEnvironmentType.PRODUCTION_PARALLEL ||
      isSnapshotVersion(project.versionId)
      ? decorateEnvWithRealm(
          environment,
          LakehouseEnvironmentType.PRODUCTION_PARALLEL,
        )
      : environment;
  }
}
