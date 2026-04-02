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
  DataProductSearchResult,
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
  DataProductDetailsType,
  LakehouseDataProductSearchResultOriginType,
  type AutosuggestResult,
  type TrendingDataProductEntry,
} from '@finos/legend-server-marketplace';
import {
  generateGAVCoordinates,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  generateLakehouseDataProductPath,
  generateLegacyDataProductPath,
} from '../__lib__/LegendMarketplaceNavigation.js';
import {
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { V1_DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

export const getSearchResultProjectGAV = (
  searchResult: DataProductSearchResult,
): ProjectGAVCoordinates | undefined => {
  if (
    searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails &&
    searchResult.dataProductDetails.origin instanceof
      LakehouseSDLCDataProductSearchResultOrigin
  ) {
    const { groupId, artifactId, versionId } =
      searchResult.dataProductDetails.origin;
    if (groupId === null || artifactId === null || versionId === null) {
      return undefined;
    }
    return { groupId, artifactId, versionId };
  } else if (
    searchResult.dataProductDetails instanceof
    LegacyDataProductSearchResultDetails
  ) {
    return {
      groupId: searchResult.dataProductDetails.groupId,
      artifactId: searchResult.dataProductDetails.artifactId,
      versionId: searchResult.dataProductDetails.versionId,
    };
  } else {
    return undefined;
  }
};

export const generatePathForDataProductSearchResult = (
  searchResult: DataProductSearchResult,
): string | undefined =>
  searchResult.dataProductDetails instanceof
  LakehouseDataProductSearchResultDetails
    ? generateLakehouseDataProductPath(
        searchResult.dataProductDetails.dataProductId,
        searchResult.dataProductDetails.deploymentId,
      )
    : searchResult.dataProductDetails instanceof
        LegacyDataProductSearchResultDetails
      ? generateLegacyDataProductPath(
          generateGAVCoordinates(
            searchResult.dataProductDetails.groupId,
            searchResult.dataProductDetails.artifactId,
            searchResult.dataProductDetails.versionId,
          ),
          searchResult.dataProductDetails.path,
        )
      : undefined;

export const convertEntitlementsDataProductDetailsToSearchResult = (
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
): DataProductSearchResult => {
  const searchResult = new DataProductSearchResult();
  searchResult.dataProductTitle =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    entitlementsDataProductDetails.title ||
    entitlementsDataProductDetails.dataProduct.name;
  searchResult.dataProductDescription =
    entitlementsDataProductDetails.description ?? '';

  const details = new LakehouseDataProductSearchResultDetails();
  details.dataProductId = entitlementsDataProductDetails.id;
  details.deploymentId = entitlementsDataProductDetails.deploymentId;
  details.producerEnvironmentName =
    entitlementsDataProductDetails.lakehouseEnvironment
      ?.producerEnvironmentName ?? '';
  details.producerEnvironmentType =
    entitlementsDataProductDetails.lakehouseEnvironment?.type;

  if (
    entitlementsDataProductDetails.origin instanceof
    V1_SdlcDeploymentDataProductOrigin
  ) {
    const origin = new LakehouseSDLCDataProductSearchResultOrigin();
    origin.groupId = entitlementsDataProductDetails.origin.group;
    origin.artifactId = entitlementsDataProductDetails.origin.artifact;
    origin.versionId = entitlementsDataProductDetails.origin.version;
    origin.path = entitlementsDataProductDetails.dataProduct.name;
    details.origin = origin;
  } else {
    const origin = new LakehouseAdHocDataProductSearchResultOrigin();
    details.origin = origin;
  }

  searchResult.dataProductDetails = details;

  return searchResult;
};

export const convertLegacyDataProductToSearchResult = (
  legacyDataProduct: V1_DataSpace,
  groupId: string,
  artifactid: string,
  versionId: string,
): DataProductSearchResult => {
  const searchResult = new DataProductSearchResult();
  searchResult.dataProductTitle =
    legacyDataProduct.title ?? legacyDataProduct.name;
  searchResult.dataProductDescription = legacyDataProduct.description ?? '';

  const details = new LegacyDataProductSearchResultDetails();
  details.groupId = groupId;
  details.artifactId = artifactid;
  details.versionId = versionId;
  details.path = legacyDataProduct.path;

  searchResult.dataProductDetails = details;

  return searchResult;
};

export const convertAutosuggestResultToSearchResult = (
  autosuggestResult: AutosuggestResult,
): DataProductSearchResult => {
  const searchResult = new DataProductSearchResult();
  searchResult.dataProductTitle = autosuggestResult.dataProductName;
  searchResult.dataProductDescription =
    autosuggestResult.dataProductDescription;

  const details = autosuggestResult.dataProductDetails;

  if (details._type === DataProductDetailsType.LAKEHOUSE) {
    const lakehouseDetails = new LakehouseDataProductSearchResultDetails();
    lakehouseDetails.dataProductId = details.dataProductId ?? '';
    lakehouseDetails.deploymentId = details.deploymentId ?? 0;
    lakehouseDetails.producerEnvironmentName =
      details.producerEnvironmentName ?? '';
    lakehouseDetails.producerEnvironmentType =
      details.producerEnvironmentType as
        | V1_EntitlementsLakehouseEnvironmentType
        | undefined;

    // Set origin based on whether origin data exists
    if (details.origin) {
      const sdlcOrigin = new LakehouseSDLCDataProductSearchResultOrigin();
      sdlcOrigin.groupId = details.origin.groupId;
      sdlcOrigin.artifactId = details.origin.artifactId;
      sdlcOrigin.versionId = details.origin.versionId;
      sdlcOrigin.path = details.origin.path;
      lakehouseDetails.origin = sdlcOrigin;
    } else {
      lakehouseDetails.origin =
        new LakehouseAdHocDataProductSearchResultOrigin();
    }

    searchResult.dataProductDetails = lakehouseDetails;
  } else if (details._type === DataProductDetailsType.LEGACY) {
    const legacyDetails = new LegacyDataProductSearchResultDetails();
    legacyDetails.groupId = details.groupId;
    legacyDetails.artifactId = details.artifactId;
    legacyDetails.versionId = details.versionId;
    legacyDetails.path = details.path;
    searchResult.dataProductDetails = legacyDetails;
  }

  return searchResult;
};

export const convertTrendingEntryToSearchResult = (
  entry: TrendingDataProductEntry,
): DataProductSearchResult => {
  const searchResult = new DataProductSearchResult();
  searchResult.dataProductTitle = entry.dataProductName ?? entry.productName;
  searchResult.dataProductDescription = entry.productDescription ?? '';
  searchResult.dataProductSource = entry.dataProductSource;
  searchResult.licenseTo = entry.licenseTo;
  searchResult.tag_score = 0;
  searchResult.similarity = 0;

  if (entry.dataProductType === DataProductDetailsType.LAKEHOUSE) {
    const details = new LakehouseDataProductSearchResultDetails();
    details.dataProductId = entry.dataProductId ?? '';
    details.deploymentId = Number(entry.deploymentId ?? 0);
    details.producerEnvironmentName = entry.producerEnvironmentName ?? '';
    details.producerEnvironmentType =
      entry.producerEnvironmentType as V1_EntitlementsLakehouseEnvironmentType;

    if (entry.originType === LakehouseDataProductSearchResultOriginType.SDLC) {
      const origin = new LakehouseSDLCDataProductSearchResultOrigin();
      origin.groupId = entry.groupId ?? '';
      origin.artifactId = entry.artifactId ?? '';
      origin.versionId = entry.versionId ?? '';
      origin.path = entry.dataProductPath ?? '';
      details.origin = origin;
    } else {
      details.origin = new LakehouseAdHocDataProductSearchResultOrigin();
    }

    searchResult.dataProductDetails = details;
  } else {
    const details = new LegacyDataProductSearchResultDetails();
    details.groupId = entry.groupId ?? '';
    details.artifactId = entry.artifactId ?? '';
    details.versionId = entry.versionId ?? '';
    details.path = entry.dataProductPath ?? '';
    searchResult.dataProductDetails = details;
  }

  return searchResult;
};
