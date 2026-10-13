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

import {
  DeploymentOwnershipDetail,
  type ServiceDetail,
  UserListOwnershipDetail,
} from '@finos/legend-graph';
import { HttpStatus, NetworkClientError } from '@finos/legend-shared';
import type {
  CubeServiceCatalog,
  CubeServiceSummary,
} from '../../../CubeServiceCatalog.js';

/** Who owns a service, as people read it */
const ownersOf = (service: ServiceDetail): readonly string[] =>
  service.ownership instanceof UserListOwnershipDetail
    ? service.ownership.users
    : service.ownership instanceof DeploymentOwnershipDetail
      ? [`Deployment ${service.ownership.identifier}`]
      : [];

/** Why the list can't be read, when the engine has no service registry */
export const V1_CUBE_NO_SERVICE_REGISTRY_MESSAGE =
  "This Legend deployment's engine has no service registry, so it lists no services";

const toSummary = (service: ServiceDetail): CubeServiceSummary => ({
  name: service.name,
  title: service.title?.trim() ? service.title.trim() : undefined,
  pattern: service.pattern,
  documentation: service.documentation,
  owners: ownersOf(service),
});

/**
 * Lists the services in the engine's registry
 * (`/service/v1/list/detailsFromCache`, as Marketplace's Data APIs page). The
 * list is read once per page; a failed read is tried again.
 */
export class V1_LegendCubeServiceCatalog implements CubeServiceCatalog {
  private readonly readServices: () => Promise<ServiceDetail[]>;
  private services: Promise<readonly CubeServiceSummary[]> | undefined;

  constructor(readServices: () => Promise<ServiceDetail[]>) {
    this.readServices = readServices;
  }

  listServices(): Promise<readonly CubeServiceSummary[]> {
    if (!this.services) {
      const services = this.readServices()
        .catch((error: unknown) => {
          // the registry isn't in the open-source engine
          throw error instanceof NetworkClientError &&
            error.response.status === HttpStatus.NOT_FOUND
            ? new Error(V1_CUBE_NO_SERVICE_REGISTRY_MESSAGE)
            : error;
        })
        .then((details) =>
          details
            .filter((detail) => detail.name && detail.pattern)
            .map(toSummary)
            .sort(
              (left, right) =>
                (left.title ?? left.name).localeCompare(
                  right.title ?? right.name,
                ) || left.name.localeCompare(right.name),
            ),
        );
      // a failed read is tried again next time
      services.catch(() => {
        if (this.services === services) {
          this.services = undefined;
        }
      });
      this.services = services;
    }
    return this.services;
  }
}
