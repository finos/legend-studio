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

import {
  V1_AdhocTeam,
  V1_AppDirOrganizationalScope,
  V1_UnknownOrganizationalScopeType,
  type V1_OrganizationalScope,
} from '@finos/legend-graph';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../stores/DataProductDataAccess_LegendApplicationPlugin_Extension.js';
import { isNonNullable } from '@finos/legend-shared';

export const getOrganizationalScopeTypeName = (
  scope: V1_OrganizationalScope,
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return 'AppDir Node';
  } else if (scope instanceof V1_AdhocTeam) {
    return 'Ad-hoc Team';
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return 'Unknown';
  } else {
    const typeNames = plugins
      .flatMap((plugin) =>
        plugin
          .getContractConsumerTypeRendererConfigs?.()
          .flatMap((config) => config.organizationalScopeTypeName?.(scope)),
      )
      .filter(isNonNullable);

    return typeNames[0] ?? 'Unknown';
  }
};

export const getOrganizationalScopeTypeDetails = (
  scope: V1_OrganizationalScope,
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): React.ReactNode => {
  if (
    scope instanceof V1_AppDirOrganizationalScope ||
    scope instanceof V1_AdhocTeam ||
    scope instanceof V1_UnknownOrganizationalScopeType
  ) {
    return undefined;
  } else {
    const detailsRenderers = plugins
      .flatMap((plugin) =>
        plugin
          .getContractConsumerTypeRendererConfigs?.()
          .flatMap((config) => config.organizationalScopeTypeDetailsRenderer),
      )
      .filter(isNonNullable);
    for (const detailsRenderer of detailsRenderers) {
      const detailsComponent = detailsRenderer(scope);
      if (detailsComponent) {
        return detailsComponent;
      }
    }

    return undefined;
  }
};

export const stringifyOrganizationalScope = (
  scope: V1_OrganizationalScope,
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return scope.appDirNode
      .map((node) => `${node.level}: ${node.appDirId}`)
      .join(', ');
  } else if (scope instanceof V1_AdhocTeam) {
    return scope.users.map((user) => user.name).join(', ');
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return JSON.stringify(scope.content);
  }
  return '';
};
