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

import { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  DataGrid,
  type DataGridColumnDefinition,
} from '../../data-grid/index.js';
import {
  type LegendAIGridData,
  buildColumnDefsFromNames,
} from '../LegendAITypes.js';

const FIT_GRID_WIDTH_COLUMN_THRESHOLD = 6;

export const LegendAIResultGrid = (props: {
  data: LegendAIGridData;
}): React.ReactNode => {
  const { data } = props;
  const gridRef = useRef<HTMLDivElement>(null);

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 120,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    [],
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    const container = gridRef.current;
    if (!container) {
      return;
    }
    const viewport = container.querySelector<HTMLElement>(
      '.ag-body-horizontal-scroll-viewport',
    );
    if (!viewport) {
      return;
    }

    if (e.shiftKey && e.deltaY !== 0) {
      viewport.scrollLeft += e.deltaY;
      e.preventDefault();
      return;
    }

    const body = container.querySelector<HTMLElement>('.ag-body-viewport');
    if (body && e.deltaY !== 0) {
      const atTop = body.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        body.scrollTop + body.clientHeight >= body.scrollHeight - 1 &&
        e.deltaY > 0;
      if (atTop || atBottom) {
        viewport.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) {
      return undefined;
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return (): void => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const effectiveColumnDefs: DataGridColumnDefinition[] = useMemo(() => {
    if (data.columnDefs.length > 0) {
      return data.columnDefs;
    }
    const firstRow = data.rowData[0];
    if (firstRow) {
      return buildColumnDefsFromNames(Object.keys(firstRow));
    }
    return [];
  }, [data.columnDefs, data.rowData]);

  if (effectiveColumnDefs.length === 0) {
    return <div className="legend-ai__grid--empty">No results to display</div>;
  }

  const fewColumns =
    effectiveColumnDefs.length <= FIT_GRID_WIDTH_COLUMN_THRESHOLD;

  return (
    <div ref={gridRef} className="legend-ai__grid ag-theme-balham">
      <DataGrid
        columnDefs={effectiveColumnDefs}
        rowData={data.rowData}
        defaultColDef={defaultColDef}
        suppressFieldDotNotation={true}
        autoSizeStrategy={
          fewColumns
            ? { type: 'fitGridWidth', defaultMinWidth: 120 }
            : { type: 'fitCellContents' }
        }
        alwaysShowHorizontalScroll={!fewColumns}
        enableRangeSelection={true}
        copyHeadersToClipboard={true}
        enableCharts={true}
        statusBar={{
          statusPanels: [
            { statusPanel: 'agTotalRowCountComponent', align: 'left' },
            { statusPanel: 'agAggregationComponent', align: 'right' },
          ],
        }}
      />
    </div>
  );
};
