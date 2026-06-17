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
  CORE_PURE_PATH,
  PURE_DOC_TAG,
  V1_AdhocTeam,
  V1_AppDirOrganizationalScope,
  V1_ProducerScope,
  type V1_RelationTypeColumn,
  V1_RMS,
  type V1_TaggedValue,
  V1_UnknownOrganizationalScopeType,
  type V1_OrganizationalScope,
} from '@finos/legend-graph';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../stores/DataProductDataAccess_LegendApplicationPlugin_Extension.js';
import { isNonEmptyString, isNonNullable } from '@finos/legend-shared';
import { Box, Typography } from '@mui/material';

export const getDocTaggedValue = (
  taggedValues: V1_TaggedValue[],
): string | undefined =>
  taggedValues
    .find(
      (taggedValue) =>
        taggedValue.tag.profile === CORE_PURE_PATH.PROFILE_DOC &&
        taggedValue.tag.value === PURE_DOC_TAG,
    )
    ?.value.trim();

export const getRelationColumnDescription = (
  relationColumn: V1_RelationTypeColumn,
): string | undefined => {
  const desc = relationColumn.description?.trim();
  return desc ? desc : getDocTaggedValue(relationColumn.taggedValues ?? []);
};

export const getOrganizationalScopeTypeName = (
  scope: V1_OrganizationalScope,
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return 'AppDir Node';
  } else if (scope instanceof V1_AdhocTeam) {
    return 'Ad-hoc Team';
  } else if (scope instanceof V1_ProducerScope) {
    return 'Producer';
  } else if (scope instanceof V1_RMS) {
    return 'RMS';
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return 'Unknown';
  } else {
    const typeName = plugins
      .flatMap((plugin) =>
        plugin
          .getContractConsumerTypeRendererConfigs?.()
          .flatMap((config) => config.organizationalScopeTypeName?.(scope)),
      )
      .find(isNonNullable);

    return typeName ?? scope.constructor.name;
  }
};

export const getOrganizationalScopeTypeDetails = (
  scope: V1_OrganizationalScope,
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): React.ReactNode => {
  if (
    scope instanceof V1_AdhocTeam ||
    scope instanceof V1_UnknownOrganizationalScopeType
  ) {
    return undefined;
  } else if (scope instanceof V1_AppDirOrganizationalScope) {
    return (
      <>
        {scope.appDirNode.map((node) => (
          <Box key={`${node.level}-${node.appDirId}`} mb="sm">
            <Typography variant="body2">
              <b>{node.level}</b>: {node.appDirId}
            </Typography>
          </Box>
        ))}
      </>
    );
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
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): string => {
  if (scope instanceof V1_AppDirOrganizationalScope) {
    return scope.appDirNode
      .map((node) => `${node.level}: ${node.appDirId}`)
      .join(', ');
  } else if (scope instanceof V1_AdhocTeam) {
    return scope.users.map((user) => user.name).join(', ');
  } else if (scope instanceof V1_ProducerScope) {
    return `Producer DID: ${scope.did}`;
  } else if (scope instanceof V1_RMS) {
    return scope.rmsNode;
  } else if (scope instanceof V1_UnknownOrganizationalScopeType) {
    return JSON.stringify(scope.content);
  }
  const stringifiedValue = plugins
    .flatMap((plugin) =>
      plugin
        .getContractConsumerTypeRendererConfigs?.()
        .flatMap((config) => config.stringifyOrganizationalScope?.(scope)),
    )
    .find(isNonEmptyString);
  return stringifiedValue ?? JSON.stringify(scope);
};

export const getHumanReadableIngestEnvName = (
  ingestEnvName: string,
  plugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
): string => {
  const pluginProvidedName = plugins
    .flatMap((plugin) => plugin.getHumanReadableIngestEnvName?.(ingestEnvName))
    .find((name) => name !== undefined);
  return pluginProvidedName ?? ingestEnvName;
};
