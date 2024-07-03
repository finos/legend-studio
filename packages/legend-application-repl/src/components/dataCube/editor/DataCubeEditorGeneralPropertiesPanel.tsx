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
import { useREPLStore } from '../../REPLStoreProvider.js';
import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  DataCubeFont,
  DataCubeFontFormatUnderlinedVariant,
  DataCubeFontTextAlignment,
  DataCubeNumberScale,
  DataCubeSelectionStat,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_GRID_LINE_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import {
  DataCubeEditorCheckbox,
  DataCubeEditorColorPickerButton,
  DataCubeEditorDropdownMenu,
  DataCubeEditorDropdownMenuItem,
  DataCubeEditorDropdownMenuItemSeparator,
  DataCubeEditorDropdownMenuTrigger,
  DataCubeEditorTextInput,
  DataCubeEditorNumberInput,
  WIP_Badge,
} from './DataCubeEditorShared.js';

export const DataCubeEditorGeneralPropertiesPanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCube.editor.generalPropertiesPanel;
  const configuration = panel.configuration;
  const [
    openInitialExpandLevelDropdown,
    closeInitialExpandLevelDropdown,
    initialExpandLevelDropdownProps,
  ] = useDropdownMenu();
  const [
    openNumberScaleDropdown,
    closeNumberScaleDropdown,
    numberScaleDropdownProps,
  ] = useDropdownMenu();
  const [
    openSelectionStatDropdown,
    closeSelectionStatDropdown,
    selectionStatDropdownProps,
  ] = useDropdownMenu();
  const [
    openFontFamilyDropdown,
    closeFontFamilyDropdown,
    fontFamilyDropdownProps,
  ] = useDropdownMenu();
  const [
    openFontSizeDropdown,
    closeFontSizeDropdown,
    openFontSizeDropdownProps,
  ] = useDropdownMenu();
  const [
    openFontFormatUnderlinedVariantDropdown,
    closeFontFormatUnderlinedVariantDropdown,
    fontFormatUnderlinedVariantDropdownProps,
  ] = useDropdownMenu();

  return (
    <div className="h-full w-full select-none p-2">
      <div className="flex h-6">
        <div className="flex h-6 items-center text-xl font-medium">
          <DataCubeIcon.TableOptions />
        </div>
        <div className="ml-1 flex h-6 items-center text-xl font-medium">
          General Properties
        </div>
      </div>
      <div className="flex h-[calc(100%_-_24px)] w-full">
        <div className="h-full w-full py-2">
          <div className="flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Report Title:
            </div>
            <DataCubeEditorTextInput
              className="w-96 text-lg font-semibold"
              value={panel.name}
              onChange={(event) => {
                panel.setName(event.target.value);
              }}
            />
          </div>

          <div className="mt-2 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Initially Expand to Level:
            </div>
            <DataCubeEditorDropdownMenuTrigger
              className="w-14"
              onClick={openInitialExpandLevelDropdown}
              disabled={true}
            >
              {configuration.initialExpandLevel ?? '(None)'}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-14"
              {...initialExpandLevelDropdownProps}
            >
              {[undefined, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                <DataCubeEditorDropdownMenuItem
                  key={level ?? ''}
                  onClick={() => {
                    configuration.setInitialExpandLevel(level);
                    closeInitialExpandLevelDropdown();
                  }}
                >
                  {level ?? '(None)'}
                </DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>
            <WIP_Badge />
          </div>

          <div className="mt-2 flex h-4 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Show Root Aggregation?
            </div>
            <DataCubeEditorCheckbox
              checked={configuration.showRootAggregation}
              onChange={() =>
                configuration.setShowRootAggregation(
                  !configuration.showRootAggregation,
                )
              }
              disabled={true}
            />
            <WIP_Badge />
          </div>

          <div className="mt-2 flex h-4 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Show Leaf Count?
            </div>
            <DataCubeEditorCheckbox
              checked={configuration.showLeafCount}
              onChange={() =>
                configuration.setShowLeafCount(!configuration.showLeafCount)
              }
              disabled={true}
            />
            <WIP_Badge />
          </div>

          <div className="mt-2 flex h-4 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Show Lines?
            </div>
            <DataCubeEditorCheckbox
              label="Tree"
              checked={configuration.showTreeLines}
              onChange={() =>
                configuration.setShowTreeLines(!configuration.showTreeLines)
              }
              disabled={true}
            />
            <WIP_Badge />
            <DataCubeEditorCheckbox
              className="ml-2"
              label="Horizontal"
              checked={configuration.showHorizontalGridLines}
              onChange={() =>
                configuration.setShowHorizontalGridLines(
                  !configuration.showHorizontalGridLines,
                )
              }
            />
            <DataCubeEditorCheckbox
              className="ml-2"
              label="Vertical"
              checked={configuration.showVerticalGridLines}
              onChange={() =>
                configuration.setShowVerticalGridLines(
                  !configuration.showVerticalGridLines,
                )
              }
            />
            <div className="ml-2 h-[1px] w-2 bg-neutral-400" />
            <DataCubeEditorColorPickerButton
              className="ml-2"
              color={configuration.gridLineColor}
              defaultColor={DEFAULT_GRID_LINE_COLOR}
              onChange={(value) => configuration.setGridLineColor(value)}
            />
          </div>

          <div className="mt-2 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Default Number Scale:
            </div>
            <DataCubeEditorDropdownMenuTrigger
              className="w-32"
              onClick={openNumberScaleDropdown}
            >
              {configuration.numberScale ?? '(None)'}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-32"
              {...numberScaleDropdownProps}
            >
              {[
                undefined,
                DataCubeNumberScale.PERCENT,
                DataCubeNumberScale.BASIS_POINT,
                DataCubeNumberScale.THOUSANDS,
                DataCubeNumberScale.MILLIONS,
                DataCubeNumberScale.BILLIONS,
                DataCubeNumberScale.TRILLIONS,
                DataCubeNumberScale.AUTO,
              ].map((scale) => (
                <DataCubeEditorDropdownMenuItem
                  key={scale ?? ''}
                  onClick={() => {
                    configuration.setNumberScale(scale);
                    closeNumberScaleDropdown();
                  }}
                >
                  {scale ?? '(None)'}
                </DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>
          </div>

          <div className="mt-2 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Show Selection Stats:
            </div>
            <DataCubeEditorDropdownMenuTrigger
              className="w-14"
              onClick={openSelectionStatDropdown}
              disabled={true}
            >
              {'(None)'}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-14"
              {...selectionStatDropdownProps}
            >
              {[
                DataCubeSelectionStat.SUM,
                DataCubeSelectionStat.AVERAGE,
                DataCubeSelectionStat.COUNT,
                DataCubeSelectionStat.MIN,
                DataCubeSelectionStat.MAX,
              ].map((operation) => (
                <DataCubeEditorDropdownMenuItem
                  key={operation}
                  onClick={() => {
                    // TODO
                    closeSelectionStatDropdown();
                  }}
                ></DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>
            <WIP_Badge />
          </div>

          <div className="mt-2 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Row Limit:
            </div>
            <DataCubeEditorNumberInput
              className="w-14 text-sm"
              value={panel.limit}
              min={-1}
              step={1}
              defaultValue={-1}
              isValid={(value) =>
                value !== undefined && (value === -1 || value > 0)
              }
              setValue={(value) => panel.setLimit(value ?? -1)}
            />
            <div className="flex-shrink-0 pl-1 text-sm italic text-neutral-500">
              Truncate result to this many rows at every level. Use -1 for
              unlimited.
            </div>
          </div>

          <div className="mt-1 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm" />
            <DataCubeEditorCheckbox
              label="Display warning when truncated"
              checked={configuration.showWarningForTruncatedResult}
              onChange={() =>
                configuration.setShowWarningForTruncatedResult(
                  !configuration.showWarningForTruncatedResult,
                )
              }
            />
          </div>

          <div className="my-2 h-[1px] w-full bg-neutral-200" />

          <div className="mt-3 flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Default Font:
            </div>
            <DataCubeEditorDropdownMenuTrigger
              className="w-28"
              onClick={openFontFamilyDropdown}
            >
              {configuration.defaultFontFamily}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-28"
              {...fontFamilyDropdownProps}
            >
              {[
                DataCubeFont.ARIAL,
                DataCubeFont.ROBOTO,
                DataCubeFont.ROBOTO_CONDENSED,
              ].map((font) => (
                <DataCubeEditorDropdownMenuItem
                  key={font}
                  onClick={() => {
                    configuration.setDefaultFontFamily(font);
                    closeFontFamilyDropdown();
                  }}
                >
                  {font}
                </DataCubeEditorDropdownMenuItem>
              ))}
              <DataCubeEditorDropdownMenuItemSeparator />
              {[
                DataCubeFont.GEORGIA,
                DataCubeFont.ROBOTO_SERIF,
                DataCubeFont.TIMES_NEW_ROMAN,
              ].map((font) => (
                <DataCubeEditorDropdownMenuItem
                  key={font}
                  onClick={() => {
                    configuration.setDefaultFontFamily(font);
                    closeFontFamilyDropdown();
                  }}
                >
                  {font}
                </DataCubeEditorDropdownMenuItem>
              ))}
              <DataCubeEditorDropdownMenuItemSeparator />
              {[
                DataCubeFont.JERBRAINS_MONO,
                DataCubeFont.ROBOTO_MONO,
                DataCubeFont.UBUNTU_MONO,
              ].map((font) => (
                <DataCubeEditorDropdownMenuItem
                  key={font}
                  onClick={() => {
                    configuration.setDefaultFontFamily(font);
                    closeFontFamilyDropdown();
                  }}
                >
                  {font}
                </DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>

            <DataCubeEditorDropdownMenuTrigger
              className="ml-1 w-10"
              onClick={openFontSizeDropdown}
            >
              {configuration.defaultFontSize}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-10"
              {...openFontSizeDropdownProps}
            >
              {[
                4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28,
                32, 36, 48, 72,
              ].map((size) => (
                <DataCubeEditorDropdownMenuItem
                  key={size}
                  onClick={() => {
                    configuration.setDefaultFontSize(size);
                    closeFontSizeDropdown();
                  }}
                >
                  {size}
                </DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>

            <div className="relative ml-2 flex h-5">
              <button
                title="Bold"
                className={cn(
                  'relative flex h-5 w-5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200': configuration.defaultFontBold,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultFontBold(
                    !configuration.defaultFontBold,
                  )
                }
              >
                <DataCubeIcon.FontBold />
              </button>
              <button
                title="Italic"
                className={cn(
                  'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200': configuration.defaultFontItalic,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultFontItalic(
                    !configuration.defaultFontItalic,
                  )
                }
              >
                <DataCubeIcon.FontItalic />
              </button>
              <button
                title={`Underline${configuration.defaultFontUnderlined ? ` (${configuration.defaultFontUnderlined})` : ''}`}
                className={cn(
                  'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-r-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200':
                      configuration.defaultFontUnderlined !== undefined,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultFontUnderlined(
                    configuration.defaultFontUnderlined === undefined
                      ? DataCubeFontFormatUnderlinedVariant.SOLID
                      : undefined,
                  )
                }
              >
                <DataCubeIcon.FontUnderlined />
              </button>
              <button
                className="text-2xs relative -ml-[1px] flex h-5 w-2.5 items-center justify-center border border-neutral-400 border-l-neutral-200 bg-neutral-50 p-0 text-neutral-600 focus-visible:z-[1]"
                onClick={openFontFormatUnderlinedVariantDropdown}
              >
                <DataCubeIcon.CaretDown />
              </button>
              <DataCubeEditorDropdownMenu
                className="w-14"
                {...fontFormatUnderlinedVariantDropdownProps}
              >
                {[
                  DataCubeFontFormatUnderlinedVariant.SOLID,
                  DataCubeFontFormatUnderlinedVariant.DASHED,
                  DataCubeFontFormatUnderlinedVariant.DOTTED,
                  DataCubeFontFormatUnderlinedVariant.DOUBLE,
                  DataCubeFontFormatUnderlinedVariant.WAVY,
                ].map((variant) => (
                  <DataCubeEditorDropdownMenuItem
                    className="relative"
                    key={variant}
                    onClick={() => {
                      configuration.setDefaultFontUnderlined(variant);
                      closeFontFormatUnderlinedVariantDropdown();
                    }}
                  >
                    <div
                      className={cn(
                        '!hover:underline absolute top-0 !underline',
                        {
                          '!hover:decoration-solid !decoration-solid':
                            variant ===
                            DataCubeFontFormatUnderlinedVariant.SOLID,
                          '!hover:decoration-dashed !decoration-dashed':
                            variant ===
                            DataCubeFontFormatUnderlinedVariant.DASHED,
                          '!hover:decoration-dotted !decoration-dotted':
                            variant ===
                            DataCubeFontFormatUnderlinedVariant.DOTTED,
                          '!hover:decoration-double !decoration-double':
                            variant ===
                            DataCubeFontFormatUnderlinedVariant.DOUBLE,
                          '!hover:decoration-wavy !decoration-wavy':
                            variant ===
                            DataCubeFontFormatUnderlinedVariant.WAVY,
                          'text-sky-600':
                            variant === configuration.defaultFontUnderlined,
                        },
                      )}
                    >
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </div>
                  </DataCubeEditorDropdownMenuItem>
                ))}
              </DataCubeEditorDropdownMenu>
              <button
                title="Strikethrough"
                className={cn(
                  'relative -ml-[1px] flex h-5 w-5 items-center justify-center rounded-br-sm rounded-tr-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200': configuration.defaultFontStrikethrough,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultFontStrikethrough(
                    !configuration.defaultFontStrikethrough,
                  )
                }
              >
                <DataCubeIcon.FontStrikethrough />
              </button>
            </div>

            <div className="relative ml-2 flex h-5">
              <button
                title="Align Left"
                className={cn(
                  'relative flex h-5 w-5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200':
                      configuration.defaultTextAlign ===
                      DataCubeFontTextAlignment.LEFT,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultTextAlign(
                    DataCubeFontTextAlignment.LEFT,
                  )
                }
              >
                <DataCubeIcon.TextAlignLeft />
              </button>
              <button
                title="Align Center"
                className={cn(
                  'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200':
                      configuration.defaultTextAlign ===
                      DataCubeFontTextAlignment.CENTER,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultTextAlign(
                    DataCubeFontTextAlignment.CENTER,
                  )
                }
              >
                <DataCubeIcon.TextAlignCenter />
              </button>
              <button
                title="Align Right"
                className={cn(
                  'relative -ml-[1px] flex h-5 w-5 items-center justify-center rounded-br-sm rounded-tr-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                  {
                    'bg-neutral-200':
                      configuration.defaultTextAlign ===
                      DataCubeFontTextAlignment.RIGHT,
                  },
                )}
                onClick={() =>
                  configuration.setDefaultTextAlign(
                    DataCubeFontTextAlignment.RIGHT,
                  )
                }
              >
                <DataCubeIcon.TextAlignRight />
              </button>
            </div>
          </div>

          <div className="mt-2 flex w-full">
            <div className="flex h-6 w-32 flex-shrink-0 items-center text-sm">
              Default Colors:
            </div>
            <div className="h-18">
              <div className="flex h-6">
                <div className="w-16 flex-shrink-0" />
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center text-sm">
                  Normal
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center text-sm">
                  Negative
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center text-sm">
                  Zero
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center text-sm">
                  Error
                </div>
              </div>
              <div className="flex h-6">
                <div className="flex h-full w-16 flex-shrink-0 items-center text-sm">
                  Foreground:
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultForegroundColor}
                    defaultColor={DEFAULT_FOREGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultForegroundColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultForegroundNegativeColor}
                    defaultColor={DEFAULT_NEGATIVE_FOREGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultForegroundNegativeColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultForegroundZeroColor}
                    defaultColor={DEFAULT_ZERO_FOREGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultForegroundZeroColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultForegroundErrorColor}
                    defaultColor={DEFAULT_ERROR_FOREGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultForegroundErrorColor(value)
                    }
                  />
                </div>
              </div>
              <div className="flex h-6">
                <div className="flex h-full w-16 flex-shrink-0 items-center text-sm">
                  Background:
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultBackgroundColor}
                    defaultColor={DEFAULT_BACKGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultBackgroundColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultBackgroundNegativeColor}
                    defaultColor={DEFAULT_BACKGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultBackgroundNegativeColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultBackgroundZeroColor}
                    defaultColor={DEFAULT_BACKGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultBackgroundZeroColor(value)
                    }
                  />
                </div>
                <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                  <DataCubeEditorColorPickerButton
                    color={configuration.defaultBackgroundErrorColor}
                    defaultColor={DEFAULT_BACKGROUND_COLOR}
                    onChange={(value) =>
                      configuration.setDefaultBackgroundErrorColor(value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex h-4 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Hightlight Rows:
            </div>
            <DataCubeEditorCheckbox
              label="Standard Mode"
              checked={configuration.alternateRowsStandardMode}
              onChange={() => {
                if (configuration.alternateRowsStandardMode) {
                  configuration.setAlternateRowsStandardMode(false);
                } else {
                  configuration.setAlternateRowsStandardMode(true);
                  configuration.setAlternateRows(false);
                }
              }}
            />
            <DataCubeEditorCheckbox
              className="ml-3"
              label="Custom: Alternate color every"
              checked={configuration.alternateRows}
              onChange={() => {
                if (configuration.alternateRows) {
                  configuration.setAlternateRows(false);
                } else {
                  configuration.setAlternateRows(true);
                  configuration.setAlternateRowsStandardMode(false);
                }
              }}
            />
            <DataCubeEditorNumberInput
              className="ml-1.5 w-14 text-sm"
              disabled={!configuration.alternateRows}
              min={1}
              step={1}
              defaultValue={1}
              isValid={(value) => value !== undefined && value > 0}
              value={configuration.alternateRowsCount}
              setValue={(value) =>
                configuration.setAlternateRowsCount(value ?? 1)
              }
            />
            <div className="ml-1.5 flex-shrink-0 text-sm">{`row(s)`}</div>
            <DataCubeEditorColorPickerButton
              className="ml-[5px]"
              disabled={!configuration.alternateRows}
              color={configuration.alternateRowsColor}
              defaultColor={DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR}
              onChange={(value) =>
                configuration.setDefaultBackgroundErrorColor(value)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
});
