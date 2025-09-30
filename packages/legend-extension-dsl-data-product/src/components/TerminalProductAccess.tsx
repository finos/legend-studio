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

import { PencilEditIcon, clsx } from '@finos/legend-art';
import { Divider } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { TerminalProductViewerState } from '../stores/TerminalProduct/TerminalProductViewerState.js';
import { ProductWikiPlaceholder } from './ProductWiki.js';
import { UserRenderer } from './UserRenderer/UserRenderer.js';
import {
  DataGrid,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';

interface TerminalProductRowData {
  id: string;
  entity: string;
  cost: string;
  status: string;
}

const getFormattedPrice = (
  price?: string | number,
  tieredPrice?: string | number,
  totalFirmPrice?: string | number,
  options: {
    isAnnual?: boolean;
    showPeriod?: boolean;
  } = {},
): { price: number; formattedPrice: string; hasValidPrice: boolean } => {
  const { isAnnual = true, showPeriod = false } = options;

  const prices = [Number(price), Number(tieredPrice), Number(totalFirmPrice)];

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const validPrice = prices.find((p) => p > 0) || 0;
  const hasValidPrice = validPrice > 0;

  if (!hasValidPrice) {
    return {
      price: 0,
      formattedPrice: 'Price not available',
      hasValidPrice: false,
    };
  }

  const displayPrice = isAnnual ? validPrice : validPrice / 12;
  const period = showPeriod ? (isAnnual ? '/year' : '/month') : '';

  return {
    price: validPrice,
    formattedPrice: `$${displayPrice.toFixed(2)}${period}`,
    hasValidPrice: true,
  };
};

export const TerminalProductPrice = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;
    const [isAnnual, setIsAnnual] = useState(true);

    const { formattedPrice, hasValidPrice } = getFormattedPrice(
      terminal.price,
      terminal.tieredPrice,
      terminal.totalFirmPrice,
      { isAnnual, showPeriod: false },
    );

    if (!hasValidPrice) {
      return (
        <ProductWikiPlaceholder message="No price information available." />
      );
    }

    const handlePricingToggle = () => {
      setIsAnnual((prev) => !prev);
    };

    return (
      <button
        className="data-product__viewer__wiki__terminal__section__pricing"
        onClick={handlePricingToggle}
      >
        {formattedPrice} {isAnnual ? 'ANNUALLY' : 'MONTHLY'} PER LICENSE
      </button>
    );
  },
);

export const TerminalAccessAndTable = observer(
  ({
    terminalProductViewerState,
  }: {
    terminalProductViewerState: TerminalProductViewerState;
  }) => {
    const terminal = terminalProductViewerState.product;
    const [currentUser] = useState<string | undefined>(
      terminalProductViewerState.applicationStore.identityService.currentUser,
    );

    const productName =
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      terminal.productName || terminal.applicationName || 'Unknown Product';

    const { formattedPrice } = getFormattedPrice(
      terminal.price,
      terminal.tieredPrice,
      terminal.totalFirmPrice,
      { isAnnual: true, showPeriod: true },
    );

    const rowData: TerminalProductRowData[] = [
      {
        id: 'product-row',
        entity: productName,
        cost: formattedPrice,
        status: 'Request Access',
      },
    ];

    const columnDefs: DataGridColumnDefinition<TerminalProductRowData>[] = [
      {
        headerName: 'Entity',
        field: 'entity',
        flex: 1,
        sortable: true,
        resizable: true,
        cellClass:
          'data-product__viewer__content__terminal__access-table--cell--entity',
      },
      {
        headerName: 'Cost',
        field: 'cost',
        flex: 1,
        sortable: true,
        resizable: true,
        cellClass:
          'data-product__viewer__content__terminal__access-table--cell--cost',
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 1,
        sortable: false,
        resizable: true,
        cellClass:
          'data-product__viewer__content__terminal__access-table--cell--status',
      },
    ];

    const editButtonClick = () => {
      //To be implemented
    };

    return (
      <div>
        <div className="data-product__viewer__content__terminal__access-section">
          <h1 className="data-product__viewer__content__terminal__access-section__heading">
            Access
          </h1>
          <Divider className="data-product__divider" />

          <div className="data-product__viewer__content__terminal__access-section__container">
            <span>Showing access for</span>

            <UserRenderer
              userId={currentUser}
              applicationStore={terminalProductViewerState.applicationStore}
              userSearchService={terminalProductViewerState.userSearchService}
            />

            <PencilEditIcon
              className="data-product__viewer__content__terminal__access-section__user-edit-icon"
              onClick={editButtonClick}
            />
          </div>
        </div>

        <div className="data-product__viewer__content__terminal__access-table-container">
          <div
            className={clsx(
              'data-product__viewer__grid',
              'ag-theme-balham',
              'data-product__viewer__grid--auto-height',
              'data-product__viewer__grid--auto-height--non-empty',
            )}
          >
            <DataGrid
              rowData={rowData}
              columnDefs={columnDefs}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (params) => params.data.id,
                headerHeight: 40,
                rowHeight: 50,
              }}
              suppressFieldDotNotation={true}
              domLayout="autoHeight"
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);
