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

import { SerializationFactory } from '@finos/legend-shared';
import { alias, createModelSchema, primitive } from 'serializr';

// The deployment directory's names for producer deployments: a Legend user
// service, the one Marketplace's producer info reads
// (`dataProductConfig.producer.deploymentLegendServiceUrl`), answering one
// row per deployment it knows

/** The environment Marketplace asks the deployment directory about, whatever the producer's class */
export const V1_CUBE_DEPLOYMENT_DIRECTORY_ENVIRONMENT = 'PROD';

/** A row of the deployment directory's answer */
export class V1_CubeDeploymentName {
  deploymentId!: number | string;
  deploymentName!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubeDeploymentName, {
      deploymentId: alias('Deployment Id', primitive()),
      deploymentName: alias('Deployment Name', primitive()),
    }),
  );
}

/** The names in the directory's answer, by deployment id as text; rows without a name are left out */
export const V1_readCubeDeploymentNames = (
  rows: unknown,
): Map<string, string> =>
  new Map(
    (Array.isArray(rows) ? rows : [])
      .filter(
        (row): row is Record<string, unknown> =>
          typeof row === 'object' && row !== null,
      )
      .map((row) => V1_CubeDeploymentName.serialization.fromJson(row))
      .filter(
        (row) =>
          row.deploymentId !== undefined &&
          typeof row.deploymentName === 'string' &&
          row.deploymentName.trim() !== '',
      )
      .map((row) => [String(row.deploymentId), row.deploymentName.trim()]),
  );
