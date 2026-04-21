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

import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useRef } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { clsx, DownloadIcon, StarIcon } from '@finos/legend-art';
import type {
  LegendMarketplaceDataAPIsStore,
  LegendServiceCardState,
} from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import { ServiceOwnershipType } from '@finos/legend-graph';
import { isString } from '@finos/legend-shared';
import {
  DataGrid,
  type DataGridApi,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';

const FavoriteCellRenderer = observer(
  (
    params: DataGridCellRendererParams<LegendServiceCardState> & {
      store: LegendMarketplaceDataAPIsStore;
    },
  ): React.ReactNode => {
    const { data, store } = params;
    if (!data) {
      return null;
    }
    const isFav = store.isFavorite(data.service.pattern);
    return (
      <button
        className={clsx('marketplace-legend-service-grid__star-btn', {
          'marketplace-legend-service-grid__star-btn--active': isFav,
        })}
        onClick={(e) => {
          e.stopPropagation();
          store.toggleFavorite(data.service.pattern);
        }}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <StarIcon />
      </button>
    );
  },
);

const OwnersCellRenderer = observer(
  (
    params: DataGridCellRendererParams<LegendServiceCardState>,
  ): React.ReactNode => {
    const data = params.data;
    if (!data) {
      return null;
    }
    return (
      <div className="marketplace-legend-service-grid__chips">
        {data.owners.map((owner) => (
          <Chip
            key={owner}
            size="small"
            label={owner}
            className={`marketplace-legend-service-list-row__chip marketplace-legend-service-list-row__chip--${
              data.ownershipType === ServiceOwnershipType.DEPLOYMENT_OWNERSHIP
                ? 'did'
                : 'owner'
            }`}
          />
        ))}
      </div>
    );
  },
);

export const LegendServiceGridView = observer(
  (props: {
    services: LegendServiceCardState[];
    store: LegendMarketplaceDataAPIsStore;
    onRowClick: (serviceCardState: LegendServiceCardState) => void;
  }): React.ReactNode => {
    const { services, store, onRowClick } = props;
    const gridApiRef = useRef<DataGridApi<LegendServiceCardState> | null>(null);

    const columnDefs: DataGridColumnDefinition<LegendServiceCardState>[] =
      useMemo(
        () => [
          {
            headerName: '',
            colId: 'favorite',
            cellRenderer: FavoriteCellRenderer,
            cellRendererParams: { store },
            width: 50,
            maxWidth: 50,
            minWidth: 50,
            resizable: false,
            sortable: false,
            filter: false,
            suppressHeaderMenuButton: true,
          },
          {
            headerName: 'Title',
            colId: 'title',
            valueGetter: (p) => p.data?.title,
            minWidth: 150,
            flex: 2,
            filter: true,
            resizable: true,
          },
          {
            headerName: 'URL Path',
            colId: 'urlPath',
            valueGetter: (p) => p.data?.service.pattern,
            minWidth: 200,
            flex: 3,
            filter: true,
            resizable: true,
          },
          {
            headerName: 'Description',
            colId: 'description',
            valueGetter: (p) => p.data?.description,
            minWidth: 200,
            flex: 4,
            filter: true,
            resizable: true,
          },
          {
            headerName: 'Owner / DID',
            colId: 'owners',
            cellRenderer: OwnersCellRenderer,
            valueGetter: (p) => p.data?.owners.join(', '),
            minWidth: 150,
            flex: 2,
            filter: true,
            resizable: true,
            autoHeight: true,
            wrapText: true,
          },
        ],
        [store],
      );

    const exportToCSV = useCallback((): void => {
      gridApiRef.current?.exportDataAsCsv({
        fileName: 'legend-services.csv',
        columnKeys: ['title', 'urlPath', 'description', 'owners'],
        processCellCallback: (params) => {
          const value: unknown = params.value;
          if (isString(value)) {
            return value.replaceAll(/[\r\n]+/g, ' ');
          }
          return isString(value) ? value : '';
        },
      });
    }, []);

    return (
      <div className="marketplace-legend-service-grid">
        <div className="marketplace-legend-service-grid__toolbar">
          <span className="marketplace-legend-service-grid__toolbar__count">
            {`${services.length} result${services.length === 1 ? '' : 's'}`}
          </span>
          <Tooltip title="Export visible rows to CSV" placement="left">
            <button
              className="marketplace-legend-service-grid__toolbar__export-btn"
              onClick={exportToCSV}
            >
              <DownloadIcon />
              Export to CSV
            </button>
          </Tooltip>
        </div>
        <div className="marketplace-legend-service-grid__ag-grid ag-theme-balham">
          <DataGrid
            rowData={services}
            columnDefs={columnDefs}
            onGridReady={(params) => {
              gridApiRef.current = params.api;
            }}
            onCellClicked={(event) => {
              if (event.data && event.column.getColId() !== 'favorite') {
                onRowClick(event.data);
              }
            }}
            suppressCellFocus={true}
            overlayNoRowsTemplate="No services match the filters."
          />
        </div>
      </div>
    );
  },
);
