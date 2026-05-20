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

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Chip, Tooltip, Typography } from '@mui/material';
import { DatasetIcon, PackageIcon } from '@finos/legend-art';
import type {
  FieldSearchDataProductEntry,
  FieldSearchResultState,
} from '../../stores/lakehouse/fieldSearch/FieldSearchResultState.js';
import { LegendMarketplaceListItem } from '../MarketplaceCard/LegendMarketplaceListItem.js';

enum FieldSearchResultListItemLabel {
  SHOW_LESS = 'Show Less',
  SHOW_LESS_INLINE = 'Show less',
  SHOW_MORE_INLINE = 'Show more',
  MORE_SUFFIX = 'More',
  DATASET_SEPARATOR = '|',
  EMPTY_VALUE = '-',
}

enum FieldSearchResultListItemValue {
  COLLAPSED_VISIBLE_DATA_PRODUCTS = 2,
  MAX_DESCRIPTION_LENGTH = 150,
}

function getCollapsibleListState<T>(
  items: T[],
  expanded: boolean,
): { visibleItems: T[]; toggleLabel: string; shouldShowToggle: boolean } {
  const visibleItems = expanded
    ? items
    : items.slice(
        0,
        FieldSearchResultListItemValue.COLLAPSED_VISIBLE_DATA_PRODUCTS,
      );
  const hiddenItemCount = Math.max(
    0,
    items.length -
      FieldSearchResultListItemValue.COLLAPSED_VISIBLE_DATA_PRODUCTS,
  );
  const toggleLabel = expanded
    ? FieldSearchResultListItemLabel.SHOW_LESS
    : `+${hiddenItemCount} ${FieldSearchResultListItemLabel.MORE_SUFFIX}`;

  return {
    visibleItems,
    toggleLabel,
    shouldShowToggle:
      items.length >
      FieldSearchResultListItemValue.COLLAPSED_VISIBLE_DATA_PRODUCTS,
  };
}

export const FieldSearchResultListRow = observer(
  (props: {
    fieldSearchResultState: FieldSearchResultState;
    expanded: boolean;
    onToggleExpanded: (rowId: string) => void;
    onOpenDataProduct: (dataProduct: FieldSearchDataProductEntry) => void;
    onOpenDatasetInQuery: (dataProduct: FieldSearchDataProductEntry) => void;
  }): React.ReactNode => {
    const {
      fieldSearchResultState,
      expanded,
      onToggleExpanded,
      onOpenDataProduct,
      onOpenDatasetInQuery,
    } = props;

    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [dpExpanded, setDpExpanded] = useState(false);
    const description = fieldSearchResultState.fieldDescription;
    const isDescriptionTruncatable =
      description.length >
      FieldSearchResultListItemValue.MAX_DESCRIPTION_LENGTH;
    const displayDescription =
      !descriptionExpanded && isDescriptionTruncatable
        ? `${description.substring(0, FieldSearchResultListItemValue.MAX_DESCRIPTION_LENGTH)}...`
        : description;

    const distinctDataProducts = fieldSearchResultState.distinctDataProducts;

    const {
      visibleItems: visibleDataProducts,
      toggleLabel,
      shouldShowToggle: shouldShowDataProductToggle,
    } = getCollapsibleListState(fieldSearchResultState.dataProducts, expanded);

    const {
      visibleItems: visibleDistinctDataProducts,
      toggleLabel: dpToggleLabel,
      shouldShowToggle: shouldShowDistinctDataProductToggle,
    } = getCollapsibleListState(distinctDataProducts, dpExpanded);

    const content = (
      <div className="marketplace-lakehouse-field-search-results__list-item-grid">
        <div className="marketplace-lakehouse-field-search-results__field-name-cell">
          <Typography className="marketplace-lakehouse-field-search-results__list-item-text marketplace-lakehouse-field-search-results__list-item-text--primary">
            {fieldSearchResultState.fieldName}
          </Typography>
        </div>
        <div className="marketplace-lakehouse-field-search-results__type-cell">
          <Typography className="marketplace-lakehouse-field-search-results__list-item-text">
            {fieldSearchResultState.fieldType}
          </Typography>
        </div>
        <div className="marketplace-lakehouse-field-search-results__description-cell">
          <Typography className="marketplace-lakehouse-field-search-results__list-item-text">
            {displayDescription}
          </Typography>
          {isDescriptionTruncatable && (
            <button
              className="marketplace-lakehouse-field-search-results__description-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setDescriptionExpanded(!descriptionExpanded);
              }}
            >
              {descriptionExpanded
                ? FieldSearchResultListItemLabel.SHOW_LESS_INLINE
                : FieldSearchResultListItemLabel.SHOW_MORE_INLINE}
            </button>
          )}
        </div>
        <div className="marketplace-lakehouse-field-search-results__data-products-cell">
          {distinctDataProducts.length > 0 ? (
            <>
              {visibleDistinctDataProducts.map((dataProduct) => (
                <Chip
                  key={`${fieldSearchResultState.id}-dp-${dataProduct.distinctKey}`}
                  clickable={true}
                  label={
                    <span className="marketplace-lakehouse-field-search-results__chip-label">
                      <PackageIcon className="marketplace-lakehouse-field-search-results__chip-icon" />
                      <span>{dataProduct.name}</span>
                    </span>
                  }
                  onClick={() => onOpenDataProduct(dataProduct)}
                  className="marketplace-lakehouse-field-search-results__data-product-link"
                  size="small"
                />
              ))}
              {shouldShowDistinctDataProductToggle && (
                <Chip
                  key={`${fieldSearchResultState.id}-dp-toggle`}
                  label={dpToggleLabel}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDpExpanded(!dpExpanded);
                  }}
                  size="small"
                  variant="outlined"
                  className="marketplace-lakehouse-field-search-results__data-product-toggle"
                />
              )}
            </>
          ) : (
            <Typography className="marketplace-lakehouse-field-search-results__list-item-text marketplace-lakehouse-field-search-results__list-item-text--empty">
              {FieldSearchResultListItemLabel.EMPTY_VALUE}
            </Typography>
          )}
        </div>
        <div className="marketplace-lakehouse-field-search-results__data-products-cell">
          {fieldSearchResultState.dataProducts.length > 0 ? (
            <>
              {visibleDataProducts.map((dataProduct) => (
                <Tooltip
                  key={`${fieldSearchResultState.id}-${dataProduct.path}-${dataProduct.datasetName ?? ''}`}
                  title={dataProduct.datasetDescription ?? ''}
                  placement="top"
                  arrow={true}
                  disableHoverListener={!dataProduct.datasetDescription}
                >
                  <Chip
                    clickable={true}
                    label={
                      <span className="marketplace-lakehouse-field-search-results__chip-label">
                        <PackageIcon className="marketplace-lakehouse-field-search-results__chip-icon" />
                        <span>{dataProduct.name}</span>
                        {dataProduct.datasetName && (
                          <span className="marketplace-lakehouse-field-search-results__chip-secondary">
                            <span className="marketplace-lakehouse-field-search-results__chip-separator">
                              {FieldSearchResultListItemLabel.DATASET_SEPARATOR}
                            </span>
                            <DatasetIcon className="marketplace-lakehouse-field-search-results__chip-icon" />
                            <span className="marketplace-lakehouse-field-search-results__chip-secondary-text">
                              {dataProduct.datasetName}
                            </span>
                          </span>
                        )}
                      </span>
                    }
                    onClick={() => onOpenDatasetInQuery(dataProduct)}
                    className="marketplace-lakehouse-field-search-results__data-product-link"
                    size="small"
                  />
                </Tooltip>
              ))}
              {shouldShowDataProductToggle && (
                <Chip
                  key={`${fieldSearchResultState.id}-toggle`}
                  label={toggleLabel}
                  onClick={() => onToggleExpanded(fieldSearchResultState.id)}
                  size="small"
                  variant="outlined"
                  className="marketplace-lakehouse-field-search-results__data-product-toggle"
                />
              )}
            </>
          ) : (
            <Typography className="marketplace-lakehouse-field-search-results__list-item-text marketplace-lakehouse-field-search-results__list-item-text--empty">
              {FieldSearchResultListItemLabel.EMPTY_VALUE}
            </Typography>
          )}
        </div>
      </div>
    );

    return (
      <LegendMarketplaceListItem
        className="marketplace-lakehouse-field-search-results__list-item"
        content={content}
      />
    );
  },
);
