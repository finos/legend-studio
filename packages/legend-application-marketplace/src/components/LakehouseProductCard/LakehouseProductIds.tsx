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

import { CheckIcon, clsx, CopyableId } from '@finos/legend-art';
import { LakehouseDataProductSearchResultDetails } from '@finos/legend-server-marketplace';
import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  type LEGEND_MARKETPLACE_PAGE,
  DATA_PRODUCT_ID_TYPE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

/**
 * Asks a Lakehouse search result (tile or list row) to show its data product ID and
 * DID under the title, and to mark the result whose ID or DID is the search query.
 */
export type LakehouseProductIdsDisplay = {
  /** The query the results came from. */
  searchQuery: string | undefined;
  /** The page the results are on, for telemetry. */
  page: LEGEND_MARKETPLACE_PAGE;
};

type LakehouseProductIds = {
  dataProductId: string;
  deploymentId: number;
  /** The product has no title of its own: its title shows the data product ID. */
  titleIsId: boolean;
};

const getLakehouseProductIds = (
  productCardState: ProductCardState,
): LakehouseProductIds | undefined => {
  const details = productCardState.searchResult.dataProductDetails;
  return details instanceof LakehouseDataProductSearchResultDetails
    ? {
        dataProductId: details.dataProductId,
        deploymentId: details.deploymentId,
        titleIsId: productCardState.title === details.dataProductId,
      }
    : undefined;
};

export const isLakehouseProductTitleItsId = (
  productCardState: ProductCardState,
): boolean => getLakehouseProductIds(productCardState)?.titleIsId ?? false;

/**
 * Which of a result's IDs the query is, exactly: its data product ID (ignoring case)
 * or its DID.
 *
 * NOTE: the search response doesn't say which field a result matched on, so this
 * compares the query with the IDs each result carries. Ranking stays the search
 * service's, so an exact match on another page isn't marked.
 */
export const getLakehouseProductExactIdMatch = (
  productCardState: ProductCardState,
  searchQuery: string | undefined,
): DATA_PRODUCT_ID_TYPE | undefined => {
  const ids = getLakehouseProductIds(productCardState);
  const query = searchQuery?.trim() ?? '';
  if (!ids || !query) {
    return undefined;
  }
  if (ids.dataProductId.toLowerCase() === query.toLowerCase()) {
    return DATA_PRODUCT_ID_TYPE.DATA_PRODUCT_ID;
  }
  if (String(ids.deploymentId) === query) {
    return DATA_PRODUCT_ID_TYPE.DEPLOYMENT_ID;
  }
  return undefined;
};

/**
 * A long ID, e.g. the data product ID that stands in for a missing title, wraps after
 * its underscores rather than mid-word.
 */
export const LakehouseProductBreakableId = (props: {
  value: string;
}): React.ReactNode => {
  const parts = props.value.split('_');
  return parts.map((part, index) => (
    // eslint-disable-next-line react/no-array-index-key
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <>
          _<wbr />
        </>
      )}
    </Fragment>
  ));
};

/**
 * One quiet line under a result's title: `<data product ID> · DID <deployment ID>`,
 * each value copied by a click. When the product has no title, its title already
 * shows the data product ID, so the line shows only the DID.
 */
export const LakehouseProductIdLine = observer(
  (props: {
    productCardState: ProductCardState;
    page: LEGEND_MARKETPLACE_PAGE;
    exactMatch: DATA_PRODUCT_ID_TYPE | undefined;
  }): React.ReactNode => {
    const { productCardState, page, exactMatch } = props;
    const ids = getLakehouseProductIds(productCardState);
    if (!ids) {
      return null;
    }
    const logCopy = (idType: DATA_PRODUCT_ID_TYPE): void =>
      LegendMarketplaceTelemetryHelper.logEvent_CopyDataProductId(
        productCardState.marketplaceBaseStore.applicationStore.telemetryService,
        idType,
        ids.dataProductId,
        ids.deploymentId,
        page,
      );

    return (
      <div className="marketplace-lakehouse-product-ids">
        {!ids.titleIsId && (
          <>
            <CopyableId
              value={ids.dataProductId}
              label="data product ID"
              iconVisibility="never"
              className={clsx('marketplace-lakehouse-product-ids__id', {
                'marketplace-lakehouse-product-ids__id--exact-match':
                  exactMatch === DATA_PRODUCT_ID_TYPE.DATA_PRODUCT_ID,
              })}
              onCopy={() => logCopy(DATA_PRODUCT_ID_TYPE.DATA_PRODUCT_ID)}
            />
            <span
              className="marketplace-lakehouse-product-ids__separator"
              aria-hidden={true}
            >
              ·
            </span>
          </>
        )}
        <CopyableId
          value={String(ids.deploymentId)}
          label="deployment ID"
          iconVisibility="never"
          className={clsx('marketplace-lakehouse-product-ids__did', {
            'marketplace-lakehouse-product-ids__did--exact-match':
              exactMatch === DATA_PRODUCT_ID_TYPE.DEPLOYMENT_ID,
          })}
          onCopy={() => logCopy(DATA_PRODUCT_ID_TYPE.DEPLOYMENT_ID)}
        >
          <span className="marketplace-lakehouse-product-ids__did-label">
            DID
          </span>
          <span className="marketplace-lakehouse-product-ids__did-value">
            {ids.deploymentId}
          </span>
        </CopyableId>
      </div>
    );
  },
);

export const LakehouseProductExactMatchBadge = (props: {
  exactMatch: DATA_PRODUCT_ID_TYPE;
  className?: string;
}): React.ReactNode => (
  <span
    className={clsx(
      'marketplace-lakehouse-product-ids__exact-match',
      props.className,
    )}
  >
    <CheckIcon />
    {props.exactMatch === DATA_PRODUCT_ID_TYPE.DATA_PRODUCT_ID
      ? 'Exact ID match'
      : 'Exact DID match'}
  </span>
);
