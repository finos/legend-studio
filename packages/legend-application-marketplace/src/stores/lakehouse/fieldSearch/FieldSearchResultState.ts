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
  DataProductSearchResultDetailsType,
  type GroupedFieldSearchDataProduct,
  type GroupedFieldSearchResultEntry,
} from '@finos/legend-server-marketplace';
import { hashArray } from '@finos/legend-shared';
import { DataProductTypeFilter } from '../LegendMarketplaceSearchResultsStore.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import {
  generateLakehouseDataProductPath,
  generateLegacyDataProductPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';

enum FieldSearchResultStateDefaultValue {
  UNKNOWN_FIELD_TYPE = 'Unknown',
  EMPTY_FIELD_DESCRIPTION = '-',
}

enum FieldSearchDataProductKey {
  DISTINCT_SEPARATOR = '|',
}

const PRODUCT_TYPE_FILTER_MAP: Record<
  DataProductSearchResultDetailsType,
  DataProductTypeFilter
> = {
  [DataProductSearchResultDetailsType.LEGACY]: DataProductTypeFilter.LEGACY,
  [DataProductSearchResultDetailsType.LAKEHOUSE]:
    DataProductTypeFilter.LAKEHOUSE,
  [DataProductSearchResultDetailsType.ERROR]: DataProductTypeFilter.LEGACY,
};

const getDataProductName = (path: string): string =>
  path.split('::').at(-1) ?? path;

const generateFieldSearchResultId = (
  fieldName: string,
  fieldType: string,
  fieldDescription: string,
): string => `${hashArray([fieldName, fieldType, fieldDescription])}`;

const getDistinctDataProducts = (
  dataProducts: FieldSearchDataProductEntry[],
): FieldSearchDataProductEntry[] => {
  const seen = new Set<string>();
  return dataProducts.filter((dp) => {
    // Dedupe primarily by owning data product path. Fallback to a stable
    // composite key only when path is unavailable.
    const dedupeKey = dp.path || dp.distinctKey;
    if (seen.has(dedupeKey)) {
      return false;
    }
    seen.add(dedupeKey);
    return true;
  });
};

const getOwningDataProductPath = (
  dataProduct: GroupedFieldSearchDataProduct,
): string => {
  if (
    dataProduct.productType === DataProductSearchResultDetailsType.LEGACY &&
    dataProduct.groupId
  ) {
    return generateLegacyDataProductPath(
      generateGAVCoordinates(
        dataProduct.groupId,
        dataProduct.artifactId ?? '',
        dataProduct.versionId ?? '',
      ),
      dataProduct.path,
    );
  }
  if (
    dataProduct.productType === DataProductSearchResultDetailsType.LAKEHOUSE &&
    dataProduct.dataProductId &&
    dataProduct.deploymentId !== undefined
  ) {
    return generateLakehouseDataProductPath(
      dataProduct.dataProductId,
      dataProduct.deploymentId,
    );
  }
  return '';
};

export class FieldSearchDataProductEntry {
  readonly name: string;
  readonly datasetName: string | undefined;
  readonly datasetDescription: string | undefined;
  readonly executionContextKey: string | undefined;
  readonly modelPath: string | undefined;
  readonly path: string;
  readonly entityPath: string;
  readonly dataProductId: string | undefined;
  readonly deploymentId: number | undefined;
  readonly groupId: string | undefined;
  readonly artifactId: string | undefined;
  readonly versionId: string | undefined;
  readonly productType: DataProductTypeFilter | undefined;
  readonly distinctKey: string;

  constructor(dataProduct: GroupedFieldSearchDataProduct) {
    const productType = PRODUCT_TYPE_FILTER_MAP[dataProduct.productType];
    const dataProductName = getDataProductName(dataProduct.path);

    this.name = dataProductName;
    this.datasetName = dataProduct.datasetName;
    this.datasetDescription = dataProduct.datasetDescription;
    this.executionContextKey = dataProduct.defaultExecutionContext;
    this.modelPath = dataProduct.modelPath;
    this.path = getOwningDataProductPath(dataProduct);
    this.entityPath = dataProduct.path;
    this.dataProductId = dataProduct.dataProductId ?? dataProductName;
    this.deploymentId = dataProduct.deploymentId;
    this.groupId = dataProduct.groupId;
    this.artifactId = dataProduct.artifactId;
    this.versionId = dataProduct.versionId;
    this.productType = productType;
    this.distinctKey = [
      this.path,
      this.entityPath,
      this.dataProductId,
      this.name,
    ].join(FieldSearchDataProductKey.DISTINCT_SEPARATOR);
  }
}

export class FieldSearchResultState {
  readonly id: string;
  readonly fieldName: string;
  readonly fieldType: string;
  readonly fieldDescription: string;
  readonly dataProducts: FieldSearchDataProductEntry[];
  readonly distinctDataProducts: FieldSearchDataProductEntry[];

  constructor(result: GroupedFieldSearchResultEntry) {
    this.fieldName = result.fieldName;
    this.fieldType =
      result.fieldType ?? FieldSearchResultStateDefaultValue.UNKNOWN_FIELD_TYPE;
    this.fieldDescription =
      result.fieldDescription ??
      FieldSearchResultStateDefaultValue.EMPTY_FIELD_DESCRIPTION;
    this.id = generateFieldSearchResultId(
      this.fieldName,
      this.fieldType,
      this.fieldDescription,
    );
    this.dataProducts = result.dataProducts.map(
      (dp) => new FieldSearchDataProductEntry(dp),
    );
    // Precompute once since dataProducts are immutable after construction.
    this.distinctDataProducts = getDistinctDataProducts(this.dataProducts);
  }
}
