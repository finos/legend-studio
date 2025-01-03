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
import { AllCommunityModule } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import { DataCubeIcon, Switch, cn, Global, css, clsx } from '@finos/legend-art';
import {
  generateBackgroundColorUtilityClassName,
  generateFontCaseUtilityClassName,
  generateFontFamilyUtilityClassName,
  generateFontSizeUtilityClassName,
  generateFontUnderlineUtilityClassName,
  generateTextAlignUtilityClassName,
  generateTextColorUtilityClassName,
  INTERNAL__GridClientUtilityCssClassName,
} from '../../../stores/view/grid/DataCubeGridClientEngine.js';
import {
  DataCubeFont,
  DataCubeFontCase,
  DataCubeFontFormatUnderlineVariant,
  DataCubeFontTextAlignment,
  DEFAULT_ROW_BACKGROUND_COLOR_LIGHT,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR_LIGHT,
  DEFAULT_ROW_BACKGROUND_COLOR_DARK,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR_DARK,
} from '../../../stores/core/DataCubeQueryEngine.js';
import { isNonNullable } from '@finos/legend-shared';
import type {
  DataCubeConfiguration,
  DataCubeConfigurationColorKey,
} from '../../../stores/core/models/DataCubeConfiguration.js';
import { generateBaseGridOptions } from '../../../stores/view/grid/DataCubeGridConfigurationBuilder.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/react-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console

function textColorStyle(
  key: DataCubeConfigurationColorKey,
  configuration: DataCubeConfiguration,
  darkMode: boolean,
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
        `.${darkMode ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT} .${generateTextColorUtilityClassName(color, key)}{color:${color};}`,
    )
    .join('\n')}`;
}

function backgroundColorStyle(
  key: DataCubeConfigurationColorKey,
  configuration: DataCubeConfiguration,
  darkMode: boolean,
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
        `.${darkMode ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT} .${generateBackgroundColorUtilityClassName(color, key)}{background-color:${color};}`,
    )
    .join('\n')};`;
}

export const DataCubeGridStyleController = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const grid = view.grid;
    const configuration = grid.queryConfiguration;
    const darkMode = configuration.darkMode;

    return (
      <Global
        styles={css`
          .${darkMode
              ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
              : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT} {
            --ag-odd-row-background-color: ${grid.queryConfiguration
              .alternateRowsStandardMode &&
            !grid.queryConfiguration.alternateRows
              ? darkMode
                ? DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR_DARK
                : DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR_LIGHT
              : darkMode
                ? DEFAULT_ROW_BACKGROUND_COLOR_DARK
                : DEFAULT_ROW_BACKGROUND_COLOR_LIGHT};
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
          .${darkMode
              ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
              : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT}
            .${INTERNAL__GridClientUtilityCssClassName.HIGHLIGHT_ROW} {
            background-color: ${grid.queryConfiguration.alternateRows
              ? grid.queryConfiguration.alternateRowsColor
              : darkMode
                ? DEFAULT_ROW_BACKGROUND_COLOR_DARK
                : DEFAULT_ROW_BACKGROUND_COLOR_LIGHT};
          }
          ${[
            DataCubeFont.ARIAL,
            DataCubeFont.ROBOTO,
            DataCubeFont.ROBOTO_CONDENSED,
          ]
            .map(
              (fontFamily) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},sans-serif;}`,
            )
            .join('\n')}
          ${[
            DataCubeFont.GEORGIA,
            DataCubeFont.ROBOTO_SERIF,
            DataCubeFont.TIMES_NEW_ROMAN,
          ]
            .map(
              (fontFamily) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},serif;}`,
            )
            .join('\n')}
        ${[
            DataCubeFont.JERBRAINS_MONO,
            DataCubeFont.ROBOTO_MONO,
            DataCubeFont.UBUNTU_MONO,
          ]
            .map(
              (fontFamily) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontFamilyUtilityClassName(fontFamily)}{font-family:${fontFamily},monospace;}`,
            )
            .join('\n')}
          .${INTERNAL__GridClientUtilityCssClassName.FONT_BOLD} {
            font-weight: 700;
          }
          ${[
            4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32,
            36, 48, 72,
          ]
            .map(
              (fontSize) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontSizeUtilityClassName(fontSize)}{font-size:${fontSize}px;}`,
            )
            .join('\n')}
          .${darkMode
            ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
            : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT}
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
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontUnderlineUtilityClassName(variant)}{text-decoration:underline ${variant};}`,
            )
            .join('\n')}
          .${darkMode
            ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
            : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT} .${INTERNAL__GridClientUtilityCssClassName.FONT_STRIKETHROUGH} {
            text-decoration: line-through;
          }
          ${[
            DataCubeFontCase.LOWERCASE,
            DataCubeFontCase.UPPERCASE,
            DataCubeFontCase.CAPITALIZE,
          ]
            .map(
              (fontCase) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateFontCaseUtilityClassName(fontCase)}{text-transform:${fontCase};}`,
            )
            .join('\n')}
          ${[
            DataCubeFontTextAlignment.LEFT,
            DataCubeFontTextAlignment.CENTER,
            DataCubeFontTextAlignment.RIGHT,
          ]
            .map(
              (alignment) =>
                `.${
                  darkMode
                    ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
                    : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT
                } .${generateTextAlignUtilityClassName(alignment)}{text-align:${alignment};}`,
            )
            .join('\n')};
          ${backgroundColorStyle('normal', configuration, darkMode)}
          ${backgroundColorStyle('zero', configuration, darkMode)}
        ${backgroundColorStyle('negative', configuration, darkMode)}
        ${backgroundColorStyle('error', configuration, darkMode)}
        ${textColorStyle('normal', configuration, darkMode)}
        ${textColorStyle('zero', configuration, darkMode)}
        ${textColorStyle('negative', configuration, darkMode)}
        ${textColorStyle('error', configuration, darkMode)}
        .${darkMode
            ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
            : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT}
          .${INTERNAL__GridClientUtilityCssClassName.BLUR} {
            filter: blur(3px);
          }
          .${darkMode
              ? INTERNAL__GridClientUtilityCssClassName.ROOT_DARK
              : INTERNAL__GridClientUtilityCssClassName.ROOT_LIGHT}
            .${INTERNAL__GridClientUtilityCssClassName.BLUR}:hover {
            filter: none;
          }
        `}
      />
    );
  },
);

const DataCubeGridScroller = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;
  const grid = view.grid;
  const scrollHintText = grid.scrollHintText;
  const gridClientSideBarElement = document.querySelector(
    '.data-cube-grid .ag-side-bar',
  );
  const gridVerticalScrollbar = document.querySelector(
    '.data-cube-grid  .ag-body-vertical-scroll',
  );

  return (
    <div
      className="absolute -top-10 flex items-center rounded-sm border border-neutral-300 bg-neutral-100 p-1 pr-2 text-neutral-500 shadow-sm"
      style={{
        right:
          (gridClientSideBarElement !== null
            ? gridClientSideBarElement.getBoundingClientRect().width + 6
            : 10) +
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

const DataCubeGridStatusBar = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;
  const grid = view.grid;

  return (
    <div className="relative flex h-5 w-full select-none justify-between border-b border-neutral-200 bg-neutral-100">
      {Boolean(grid.scrollHintText) && <DataCubeGridScroller view={view} />}
      <div />
      <div className="flex h-full items-center">
        <div className="flex h-full items-center px-2 font-mono text-sm text-neutral-500">
          {grid.clientDataSource.rowCount
            ? `Rows: ${grid.clientDataSource.rowCount}`
            : ''}
        </div>
        {grid.rowLimit !== undefined &&
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
                <div className="ml-1 text-sm font-semibold">{`Results truncated to fit within row limit (${grid.rowLimit})`}</div>
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

const DataCubeGridClient = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;
  const grid = view.grid;
  const darkMode = view.editor.generalProperties.configuration.darkMode;

  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'development' && !grid.isClientConfigured) {
    // eslint-disable-next-line no-console
    console.error = (message?: unknown, ...agrs: unknown[]) => {
      console.debug(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
    };
  }

  return (
    <div className="relative h-[calc(100%_-_20px)] w-full">
      <AgGridReact
        theme="legacy"
        className={clsx('data-cube-grid', {
          'ag-theme-quartz': !darkMode,
          'ag-theme-quartz-dark': darkMode,
        })}
        rowModelType="serverSide"
        serverSideDatasource={grid.clientDataSource}
        context={{
          view,
        }}
        onGridReady={(params) => {
          grid.configureClient(params.api);
          // eslint-disable-next-line no-process-env
          if (process.env.NODE_ENV === 'development') {
            // restore original error logging
            console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
          }
        }}
        modules={[AllCommunityModule, AllEnterpriseModule]}
        {...generateBaseGridOptions(view)}
      />
    </div>
  );
});

export const DataCubeGrid = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;

  return (
    <div className="h-[calc(100%_-_48px)] w-full">
      <DataCubeGridStyleController view={view} />
      <DataCubeGridClient view={view} />
      <DataCubeGridStatusBar view={view} />
    </div>
  );
});
