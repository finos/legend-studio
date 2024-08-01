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
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ServerSideRowModelModule } from '@ag-grid-enterprise/server-side-row-model';
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { SideBarModule } from '@ag-grid-enterprise/side-bar';
import { ColumnsToolPanelModule } from '@ag-grid-enterprise/column-tool-panel';
import { AgGridReact } from '@ag-grid-community/react';
import { CsvExportModule } from '@ag-grid-community/csv-export';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeIcon, Switch, cn, Global, css } from '@finos/legend-art';
import {
  generateBackgroundColorUtilityClassName,
  generateFontCaseUtilityClassName,
  generateFontFamilyUtilityClassName,
  generateFontSizeUtilityClassName,
  generateFontUnderlineUtilityClassName,
  generateTextAlignUtilityClassName,
  generateTextColorUtilityClassName,
  INTERNAL__GridClientUtilityCssClassName,
} from '../../../stores/dataCube/grid/DataCubeGridClientEngine.js';
import { RangeSelectionModule } from '@ag-grid-enterprise/range-selection';
import {
  DataCubeFont,
  DataCubeFontCase,
  DataCubeFontFormatUnderlineVariant,
  DataCubeFontTextAlignment,
  DEFAULT_ROW_BACKGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import { isNonNullable } from '@finos/legend-shared';
import type {
  DataCubeConfiguration,
  DataCubeConfigurationColorKey,
} from '../../../stores/dataCube/core/DataCubeConfiguration.js';
import { generateBaseGridOptions } from '../../../stores/dataCube/grid/DataCubeGridConfigurationBuilder.js';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/react-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console
// eslint-disable-next-line no-console
console.error = (message?: unknown, ...agrs: unknown[]) => {
  console.debug(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
};

function textColorStyle(
  key: DataCubeConfigurationColorKey,
  configuration: DataCubeConfiguration,
) {
  return `${Array.from(
    new Set([
      configuration[`${key}ForegroundColor`],
      ...configuration.columns
        .map((column) => column[`${key}ForegroundColor`])
        .filter(isNonNullable),
    ]).values(),
  )
    .map(
      (color) =>
        `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateTextColorUtilityClassName(color, key)}{color:${color};}`,
    )
    .join('\n')}`;
}

function backgroundColorStyle(
  key: DataCubeConfigurationColorKey,
  configuration: DataCubeConfiguration,
) {
  return `${Array.from(
    new Set([
      configuration[`${key}BackgroundColor`],
      ...configuration.columns
        .map((column) => column[`${key}BackgroundColor`])
        .filter(isNonNullable),
    ]).values(),
  )
    .map(
      (color) =>
        `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateBackgroundColorUtilityClassName(color, key)}{background-color:${color};}`,
    )
    .join('\n')};`;
}

export const DataCubeGridStyleController = observer(() => {
  const repl = useREPLStore();
  const dataCube = repl.dataCube;
  const grid = dataCube.grid;
  const configuration = grid.queryConfiguration;

  return (
    <Global
      styles={css`
        .${INTERNAL__GridClientUtilityCssClassName.ROOT} {
          --ag-odd-row-background-color: ${grid.queryConfiguration
            .alternateRowsStandardMode && !grid.queryConfiguration.alternateRows
            ? DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR
            : DEFAULT_ROW_BACKGROUND_COLOR};
          --ag-cell-horizontal-border: ${grid.queryConfiguration
            .showVerticalGridLines
            ? `1px solid
            ${grid.queryConfiguration.gridLineColor}`
            : 'none'};
          --ag-row-border-color: ${grid.queryConfiguration
            .showHorizontalGridLines
            ? grid.queryConfiguration.gridLineColor
            : 'transparent'};
        }
        .${INTERNAL__GridClientUtilityCssClassName.ROOT}
          .${INTERNAL__GridClientUtilityCssClassName.HIGHLIGHT_ROW} {
          background-color: ${grid.queryConfiguration.alternateRows
            ? grid.queryConfiguration.alternateRowsColor
            : DEFAULT_ROW_BACKGROUND_COLOR};
        }
        ${[
          DataCubeFont.ARIAL,
          DataCubeFont.ROBOTO,
          DataCubeFont.ROBOTO_CONDENSED,
        ]
          .map(
            (fontFamily) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},sans-serif;}`,
          )
          .join('\n')}
        ${[
          DataCubeFont.GEORGIA,
          DataCubeFont.ROBOTO_SERIF,
          DataCubeFont.TIMES_NEW_ROMAN,
        ]
          .map(
            (fontFamily) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},serif;}`,
          )
          .join('\n')}
        ${[
          DataCubeFont.JERBRAINS_MONO,
          DataCubeFont.ROBOTO_MONO,
          DataCubeFont.UBUNTU_MONO,
        ]
          .map(
            (fontFamily) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},monospace;}`,
          )
          .join('\n')}
          .${INTERNAL__GridClientUtilityCssClassName.FONT_BOLD} {
          font-weight: 700;
        }
        ${[
          4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36,
          48, 72,
        ]
          .map(
            (fontSize) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontSizeUtilityClassName(fontSize)}{font-size:${fontSize}px;}`,
          )
          .join('\n')}
        .${INTERNAL__GridClientUtilityCssClassName.ROOT}
          .${INTERNAL__GridClientUtilityCssClassName.FONT_ITALIC} {
          font-style: italic;
        }
        ${[
          DataCubeFontFormatUnderlineVariant.SOLID,
          DataCubeFontFormatUnderlineVariant.DASHED,
          DataCubeFontFormatUnderlineVariant.DOTTED,
          DataCubeFontFormatUnderlineVariant.DOUBLE,
          DataCubeFontFormatUnderlineVariant.WAVY,
        ]
          .map(
            (variant) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontUnderlineUtilityClassName(variant)}{text-decoration:underline ${variant};}`,
          )
          .join('\n')}
        .${INTERNAL__GridClientUtilityCssClassName.ROOT} .${INTERNAL__GridClientUtilityCssClassName.FONT_STRIKETHROUGH} {
          text-decoration: line-through;
        }
        ${[
          DataCubeFontCase.LOWERCASE,
          DataCubeFontCase.UPPERCASE,
          DataCubeFontCase.CAPITALIZE,
        ]
          .map(
            (fontCase) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateFontCaseUtilityClassName(fontCase)}{text-transform:${fontCase};}`,
          )
          .join('\n')}
        ${[
          DataCubeFontTextAlignment.LEFT,
          DataCubeFontTextAlignment.CENTER,
          DataCubeFontTextAlignment.RIGHT,
        ]
          .map(
            (alignment) =>
              `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .${generateTextAlignUtilityClassName(alignment)}{text-align:${alignment};}`,
          )
          .join('\n')};
        ${backgroundColorStyle('normal', configuration)}
        ${backgroundColorStyle('zero', configuration)}
        ${backgroundColorStyle('negative', configuration)}
        ${backgroundColorStyle('error', configuration)}
        ${textColorStyle('normal', configuration)}
        ${textColorStyle('zero', configuration)}
        ${textColorStyle('negative', configuration)}
        ${textColorStyle('error', configuration)}
        .${INTERNAL__GridClientUtilityCssClassName.ROOT}
          .${INTERNAL__GridClientUtilityCssClassName.BLUR} {
          filter: blur(3px);
        }
        .${INTERNAL__GridClientUtilityCssClassName.ROOT}
          .${INTERNAL__GridClientUtilityCssClassName.BLUR}:hover {
          filter: none;
        }
      `}
    />
  );
});

const DataCubeGridScroller = observer(() => {
  const repl = useREPLStore();
  const dataCube = repl.dataCube;
  const grid = dataCube.grid;
  const scrollHintText = grid.scrollHintText;
  const gridClientSideBarElement = document.querySelector(
    '.data-cube-grid .ag-side-bar',
  );
  const gridVerticalScrollbar = document.querySelector(
    '.data-cube-grid  .ag-body-vertical-scroll',
  );

  return (
    <div
      className="absolute -top-9 flex items-center rounded-sm border border-neutral-300 bg-neutral-100 p-1 pr-2 text-neutral-500 shadow-sm"
      style={{
        right:
          (gridClientSideBarElement !== null
            ? gridClientSideBarElement.getBoundingClientRect().width + 12
            : 16) +
          (gridVerticalScrollbar !== null
            ? gridVerticalScrollbar.getBoundingClientRect().width
            : 0),
      }}
    >
      <DataCubeIcon.TableScroll className="text-lg" />
      <div className="ml-1 font-mono text-sm">{scrollHintText ?? ''}</div>
    </div>
  );
});

const DataCubeGridStatusBar = observer(() => {
  const repl = useREPLStore();
  const dataCube = repl.dataCube;
  const grid = dataCube.grid;

  return (
    <div className="relative flex h-5 w-full select-none justify-between border-b border-neutral-200 bg-neutral-100">
      {Boolean(grid.scrollHintText) && <DataCubeGridScroller />}
      <div />
      <div className="flex h-full items-center">
        <div className="flex h-full items-center px-2 font-mono text-sm text-neutral-500">
          {grid.clientDataSource.rowCount
            ? `Rows: ${grid.clientDataSource.rowCount}`
            : ''}
        </div>
        {grid.datasourceConfiguration.limit !== undefined &&
          grid.queryConfiguration.showWarningForTruncatedResult && (
            // TODO: if we want to properly warn if the data has been truncated due to row limit,
            // this would require us to fetch n+1 rows when limit=n
            // This is feature is not difficult to implement, but it would be implemented most cleanly
            // when we change the query execution engine to return the total number of rows,
            // so for now, we simply just warn about truncation whenever a limit != -1 is specified
            <>
              <div className="h-3 w-[1px] bg-neutral-200" />
              <div className="flex h-full items-center px-2 text-orange-500">
                <DataCubeIcon.Warning className="stroke-[3px]" />
                <div className="ml-1 text-sm font-semibold">{`Results truncated to fit within row limit (${grid.datasourceConfiguration.limit})`}</div>
              </div>
            </>
          )}
        <div className="h-3 w-[1px] bg-neutral-200" />
        <button
          className="flex h-full items-center p-2"
          onClick={() => grid.setPaginationEnabled(!grid.isPaginationEnabled)}
        >
          <Switch
            checked={grid.isPaginationEnabled}
            classes={{
              root: 'p-0 w-6 h-5 flex items-center',
              input: 'w-2',
              checked: '!translate-x-2 ease-in-out duration-100 transition',
              thumb: cn('w-2 h-2', {
                'bg-sky-600': grid.isPaginationEnabled,
                'bg-neutral-500': !grid.isPaginationEnabled,
              }),
              switchBase:
                'p-0.5 mt-1 translate-x-0 ease-in-out duration-100 transition',
              track: cn('h-3 w-5 border', {
                '!bg-sky-100 border-sky-600': grid.isPaginationEnabled,
                '!bg-neutral-100 border-neutral-500': !grid.isPaginationEnabled,
              }),
            }}
            disableRipple={true}
            disableFocusRipple={true}
          />
          <div
            className={cn('text-sm', {
              'text-sky-600': grid.isPaginationEnabled,
              'text-neutral-500': !grid.isPaginationEnabled,
            })}
          >
            Pagination
          </div>
        </button>
      </div>
    </div>
  );
});

const DataCubeGridClient = observer(() => {
  const repl = useREPLStore();
  const dataCube = repl.dataCube;
  const grid = dataCube.grid;

  return (
    <div className="relative h-[calc(100%_-_20px)] w-full">
      <AgGridReact
        className="data-cube-grid ag-theme-quartz"
        rowModelType="serverSide"
        serverSideDatasource={grid.clientDataSource}
        context={{
          dataCube,
        }}
        onGridReady={(params) => {
          grid.configureClient(params.api);
          // restore original error logging
          console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
        }}
        modules={[
          // community
          ClientSideRowModelModule,
          CsvExportModule,
          // enterprise
          ServerSideRowModelModule,
          RowGroupingModule,
          MenuModule,
          ClipboardModule,
          RangeSelectionModule,
          SideBarModule,
          ColumnsToolPanelModule,
          ExcelExportModule,
        ]}
        {...generateBaseGridOptions(dataCube)}
      />
    </div>
  );
});

export const DataCubeGrid = observer(() => (
  <div className="h-full w-full">
    <DataCubeGridStyleController />
    <DataCubeGridClient />
    <DataCubeGridStatusBar />
  </div>
));
