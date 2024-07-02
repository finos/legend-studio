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

import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useREPLStore } from '../../REPLStoreProvider.js';
import {
  DataCubeEditorCheckbox,
  DataCubeEditorColorPickerButton,
  DataCubeEditorDropdownMenu,
  DataCubeEditorDropdownMenuItem,
  DataCubeEditorDropdownMenuItemSeparator,
  DataCubeEditorDropdownMenuTrigger,
  DataCubeEditorNumberInput,
  DataCubeEditorTextInput,
  WIP_Badge,
} from './DataCubeEditorShared.js';
import {
  DataCubeAggregateFunction,
  DataCubeColumnDataType,
  DataCubeColumnPinPlacement,
  DataCubeFont,
  DataCubeFontFormatUnderlinedVariant,
  DataCubeFontTextAlignment,
  DataCubeNumberScale,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_COLUMN_MAX_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';

export const DataCubeEditorColumnPropertiesPanel = observer(() => {
  const replStore = useREPLStore();
  const dataCube = replStore.dataCube;
  const panel = dataCube.editor.columnPropertiesPanel;
  const selectedColumn = panel.selectedColumn;
  const [openColumnsDropdown, closeColumnsDropdown, columnsDropdownProps] =
    useDropdownMenu();
  const [
    openAggregationTypeDropdown,
    closeAggregationTypeDropdown,
    aggregationTypeDropdownProps,
  ] = useDropdownMenu();
  const [
    openNumberScaleDropdown,
    closeNumberScaleDropdown,
    numberScaleDropdownProps,
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
  const [
    openColumnPinDropdown,
    closeColumnPinDropdown,
    columnPinDropdownProps,
  ] = useDropdownMenu();

  return (
    <div className="h-full w-full select-none p-2">
      <div className="flex h-6">
        <div className="relative flex h-6 items-center text-xl font-medium">
          <DataCubeIcon.TableColumn />
          <DataCubeIcon.TableColumnOptions__Settings className="absolute bottom-1 right-0 bg-white text-xs" />
        </div>
        <div className="ml-1 flex h-6 items-center text-xl font-medium">
          Column Properties
        </div>
      </div>
      <div className="flex h-[calc(100%_-_24px)] w-full">
        <div className="h-full w-full py-2">
          <div className="flex h-6 w-full items-center">
            <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
              Choose Column:
            </div>
            <DataCubeEditorDropdownMenuTrigger
              className="w-80"
              onClick={openColumnsDropdown}
            >
              {selectedColumn?.name ?? '(None)'}
            </DataCubeEditorDropdownMenuTrigger>
            <DataCubeEditorDropdownMenu
              className="w-80"
              {...columnsDropdownProps}
            >
              {panel.columns.map((column) => (
                <DataCubeEditorDropdownMenuItem
                  key={column.name}
                  onClick={() => {
                    panel.setSelectedColumnName(column.name);
                    closeColumnsDropdown();
                  }}
                >
                  {column.name}
                </DataCubeEditorDropdownMenuItem>
              ))}
            </DataCubeEditorDropdownMenu>
            {selectedColumn && (
              // TODO: if this is an extended column, show the info and link it
              // e.g. `Extended Column (Leaf)`, `Extended Column (Group)`
              // with arrow button to go to the extended column editor
              <>
                <div className="ml-2 h-[1px] w-4 bg-neutral-400" />
                <div className="ml-2 flex h-4 items-center justify-center rounded-sm border border-neutral-500 px-2 font-mono text-sm font-medium text-neutral-500">
                  <div className="mr-1.5 flex h-full items-center uppercase">
                    {selectedColumn.dataType}
                  </div>
                  <div className="flex h-full items-center border-l border-l-neutral-500 pl-1.5 uppercase">
                    {selectedColumn.kind}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="-ml-2 mb-2 mt-3 h-[1px] w-[calc(100%_+_16px)] bg-neutral-200" />

          {selectedColumn && (
            <>
              <div className="mt-3 flex h-6 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Display Name:
                </div>
                <DataCubeEditorTextInput
                  className="w-80"
                  value={selectedColumn.displayName ?? ''}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    selectedColumn.setDisplayName(
                      value !== '' ? value : undefined,
                    );
                  }}
                />
              </div>

              {selectedColumn.dataType === DataCubeColumnDataType.NUMBER && (
                <>
                  <div className="mt-2 flex h-6 w-full items-center">
                    <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                      Number Format:
                    </div>
                    <DataCubeEditorNumberInput
                      className="w-10 text-sm"
                      min={0}
                      step={1}
                      value={selectedColumn.decimals ?? 0}
                      setValue={(value) => {
                        selectedColumn.setDecimals(value);
                      }}
                    />
                    <div className="ml-1 flex-shrink-0 text-sm">
                      Decimal places
                    </div>
                    <DataCubeEditorCheckbox
                      className="ml-3"
                      label="Display commas"
                      checked={selectedColumn.displayCommas}
                      onChange={() =>
                        selectedColumn.setDisplayCommas(
                          !selectedColumn.displayCommas,
                        )
                      }
                    />
                    <DataCubeEditorCheckbox
                      className="ml-3"
                      label="Negative number in parens"
                      checked={selectedColumn.negativeNumberInParens}
                      onChange={() =>
                        selectedColumn.setNegativeNumberInParens(
                          !selectedColumn.negativeNumberInParens,
                        )
                      }
                    />
                  </div>

                  <div className="mt-2 flex h-6 w-full items-center">
                    <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                      Number Scale:
                    </div>
                    <DataCubeEditorDropdownMenuTrigger
                      className="w-32"
                      onClick={openNumberScaleDropdown}
                    >
                      {selectedColumn.numberScale ?? '(None)'}
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
                        DataCubeNumberScale.AUTO,
                      ].map((scale) => (
                        <DataCubeEditorDropdownMenuItem
                          key={scale ?? ''}
                          onClick={() => {
                            selectedColumn.setNumberScale(scale);
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
                      Aggregation Type:
                    </div>
                    <DataCubeEditorDropdownMenuTrigger
                      className="w-32"
                      onClick={openAggregationTypeDropdown}
                      disabled={true}
                    >
                      {selectedColumn.aggregateFunction ?? '(None)'}
                    </DataCubeEditorDropdownMenuTrigger>
                    <DataCubeEditorDropdownMenu
                      className="w-32"
                      {...aggregationTypeDropdownProps}
                    >
                      {[
                        DataCubeAggregateFunction.SUM,
                        DataCubeAggregateFunction.AVERAGE,
                        DataCubeAggregateFunction.COUNT,
                        DataCubeAggregateFunction.MIN,
                        DataCubeAggregateFunction.MAX,
                      ].map((fn) => (
                        <DataCubeEditorDropdownMenuItem
                          key={fn}
                          onClick={() => {
                            selectedColumn.setAggregateFunction(fn);
                            closeAggregationTypeDropdown();
                          }}
                        >
                          {fn}
                        </DataCubeEditorDropdownMenuItem>
                      ))}
                    </DataCubeEditorDropdownMenu>
                    <WIP_Badge />
                    <div className="ml-2 h-[1px] w-4 bg-neutral-400" />
                    <div className="mx-2 flex h-full flex-shrink-0 items-center text-sm">
                      Weight Column:
                    </div>
                    <DataCubeEditorDropdownMenuTrigger
                      className="w-32"
                      disabled={true}
                    >
                      {selectedColumn.weightColumn ?? '(None)'}
                    </DataCubeEditorDropdownMenuTrigger>
                    <WIP_Badge />
                  </div>

                  <div className="mt-2 flex h-4 w-full items-center">
                    <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                      Exclude from HPivot?
                    </div>
                    <DataCubeEditorCheckbox
                      checked={selectedColumn.excludedFromHPivot}
                      onChange={() =>
                        selectedColumn.setExcludedFromHPivot(
                          !selectedColumn.excludedFromHPivot,
                        )
                      }
                      disabled={true}
                    />
                    <WIP_Badge />
                  </div>
                </>
              )}

              {selectedColumn.dataType === DataCubeColumnDataType.TEXT && (
                <>
                  <div className="mt-2 flex h-4 w-full items-center">
                    <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                      Dislay as Link?
                    </div>
                    <DataCubeEditorCheckbox
                      checked={selectedColumn.displayAsLink}
                      onChange={() =>
                        selectedColumn.setDisplayAsLink(
                          !selectedColumn.displayAsLink,
                        )
                      }
                    />
                  </div>
                </>
              )}

              <div className="my-2 h-[1px] w-full bg-neutral-200" />

              <div className="mt-3 flex h-6 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Font:
                </div>
                <DataCubeEditorDropdownMenuTrigger
                  className="w-28"
                  onClick={openFontFamilyDropdown}
                >
                  {selectedColumn.fontFamily}
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
                        selectedColumn.setFontFamily(font);
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
                        selectedColumn.setFontFamily(font);
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
                        selectedColumn.setFontFamily(font);
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
                  {selectedColumn.fontSize}
                </DataCubeEditorDropdownMenuTrigger>
                <DataCubeEditorDropdownMenu
                  className="w-10"
                  {...openFontSizeDropdownProps}
                >
                  {[
                    4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26,
                    28, 32, 36, 48, 72,
                  ].map((size) => (
                    <DataCubeEditorDropdownMenuItem
                      key={size}
                      onClick={() => {
                        selectedColumn.setFontSize(size);
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
                        'bg-neutral-200': selectedColumn.fontBold,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setFontBold(!selectedColumn.fontBold)
                    }
                  >
                    <DataCubeIcon.FontBold />
                  </button>
                  <button
                    title="Italic"
                    className={cn(
                      'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                      {
                        'bg-neutral-200': selectedColumn.fontItalic,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setFontItalic(!selectedColumn.fontItalic)
                    }
                  >
                    <DataCubeIcon.FontItalic />
                  </button>
                  <button
                    title={`Underline${selectedColumn.fontUnderlined ? ` (${selectedColumn.fontUnderlined})` : ''}`}
                    className={cn(
                      'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-r-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus-visible:z-[1]',
                      {
                        'bg-neutral-200':
                          selectedColumn.fontUnderlined !== undefined,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setFontUnderlined(
                        selectedColumn.fontUnderlined === undefined
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
                          selectedColumn.setFontUnderlined(variant);
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
                                variant === selectedColumn.fontUnderlined,
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
                        'bg-neutral-200': selectedColumn.fontStrikethrough,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setFontStrikethrough(
                        !selectedColumn.fontStrikethrough,
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
                          selectedColumn.textAlign ===
                          DataCubeFontTextAlignment.LEFT,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setTextAlign(
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
                          selectedColumn.textAlign ===
                          DataCubeFontTextAlignment.CENTER,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setTextAlign(
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
                          selectedColumn.textAlign ===
                          DataCubeFontTextAlignment.RIGHT,
                      },
                    )}
                    onClick={() =>
                      selectedColumn.setTextAlign(
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
                  Colors:
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
                        color={selectedColumn.foregroundColor}
                        defaultColor={DEFAULT_FOREGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setForegroundColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.foregroundNegativeColor}
                        defaultColor={DEFAULT_NEGATIVE_FOREGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setForegroundNegativeColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.foregroundZeroColor}
                        defaultColor={DEFAULT_ZERO_FOREGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setForegroundZeroColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.foregroundErrorColor}
                        defaultColor={DEFAULT_ERROR_FOREGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setForegroundErrorColor(value)
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
                        color={selectedColumn.backgroundColor}
                        defaultColor={DEFAULT_BACKGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setBackgroundColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.backgroundNegativeColor}
                        defaultColor={DEFAULT_BACKGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setBackgroundNegativeColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.backgroundZeroColor}
                        defaultColor={DEFAULT_BACKGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setBackgroundZeroColor(value)
                        }
                      />
                    </div>
                    <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                      <DataCubeEditorColorPickerButton
                        color={selectedColumn.backgroundErrorColor}
                        defaultColor={DEFAULT_BACKGROUND_COLOR}
                        onChange={(value) =>
                          selectedColumn.setBackgroundErrorColor(value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex h-4 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Hide from View?
                </div>
                <DataCubeEditorCheckbox
                  checked={selectedColumn.hideFromView}
                  onChange={() =>
                    selectedColumn.setHideFromView(!selectedColumn.hideFromView)
                  }
                  disabled={true}
                />
                <WIP_Badge />
              </div>

              <div className="mt-2 flex h-6 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Pin:
                </div>
                <DataCubeEditorDropdownMenuTrigger
                  className="w-14"
                  onClick={openColumnPinDropdown}
                >
                  {selectedColumn.pinned ?? '(None)'}
                </DataCubeEditorDropdownMenuTrigger>
                <DataCubeEditorDropdownMenu
                  className="w-14"
                  {...columnPinDropdownProps}
                >
                  {[
                    undefined,
                    DataCubeColumnPinPlacement.LEFT,
                    DataCubeColumnPinPlacement.RIGHT,
                  ].map((placement) => (
                    <DataCubeEditorDropdownMenuItem
                      key={placement ?? ''}
                      onClick={() => {
                        selectedColumn.setPinned(placement);
                        closeColumnPinDropdown();
                      }}
                    >
                      {placement ?? '(None)'}
                    </DataCubeEditorDropdownMenuItem>
                  ))}
                </DataCubeEditorDropdownMenu>
              </div>

              <div className="mt-2 flex h-6 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Width:
                </div>
                <DataCubeEditorCheckbox
                  label="(Any)"
                  checked={
                    selectedColumn.fixedWidth === undefined &&
                    selectedColumn.minWidth === undefined &&
                    selectedColumn.maxWidth === undefined
                  }
                  onChange={() => {
                    if (
                      selectedColumn.fixedWidth === undefined &&
                      selectedColumn.minWidth === undefined &&
                      selectedColumn.maxWidth === undefined
                    ) {
                      selectedColumn.setFixedWidth(DEFAULT_COLUMN_WIDTH);
                      selectedColumn.setMinWidth(undefined);
                      selectedColumn.setMaxWidth(undefined);
                    } else {
                      selectedColumn.setFixedWidth(undefined);
                      selectedColumn.setMinWidth(undefined);
                      selectedColumn.setMaxWidth(undefined);
                    }
                  }}
                />

                <DataCubeEditorCheckbox
                  className="ml-2"
                  label="Fixed"
                  checked={selectedColumn.fixedWidth !== undefined}
                  onChange={() => {
                    selectedColumn.setFixedWidth(
                      selectedColumn.fixedWidth !== undefined
                        ? undefined
                        : DEFAULT_COLUMN_WIDTH,
                    );
                    selectedColumn.setMinWidth(undefined);
                    selectedColumn.setMaxWidth(undefined);
                  }}
                />
                <div className="ml-1 h-[1px] w-2 bg-neutral-400" />
                <DataCubeEditorNumberInput
                  className="ml-1 w-16 text-sm"
                  min={0}
                  step={50}
                  defaultValue={undefined}
                  isValid={(value) => value !== undefined && value > 0}
                  value={selectedColumn.fixedWidth}
                  setValue={(value) => {
                    selectedColumn.setFixedWidth(value);
                  }}
                  disabled={
                    selectedColumn.minWidth !== undefined ||
                    selectedColumn.maxWidth !== undefined
                  }
                />

                <DataCubeEditorCheckbox
                  className="ml-3"
                  label="In range"
                  checked={
                    selectedColumn.minWidth !== undefined ||
                    selectedColumn.maxWidth !== undefined
                  }
                  onChange={() => {
                    if (
                      selectedColumn.minWidth === undefined &&
                      selectedColumn.maxWidth === undefined
                    ) {
                      selectedColumn.setMinWidth(DEFAULT_COLUMN_MIN_WIDTH);
                      selectedColumn.setMaxWidth(DEFAULT_COLUMN_MAX_WIDTH);
                      selectedColumn.setFixedWidth(undefined);
                    } else {
                      selectedColumn.setMinWidth(undefined);
                      selectedColumn.setMaxWidth(undefined);
                      selectedColumn.setFixedWidth(undefined);
                    }
                  }}
                />
                <div className="ml-1 h-[1px] w-2 bg-neutral-400" />
                <DataCubeEditorNumberInput
                  className="ml-1 w-16 text-sm"
                  min={0}
                  step={50}
                  defaultValue={undefined}
                  isValid={(value) => value !== undefined && value > 0}
                  value={selectedColumn.minWidth}
                  setValue={(value) => {
                    selectedColumn.setMinWidth(value);
                  }}
                  disabled={selectedColumn.fixedWidth !== undefined}
                />
                <div className="ml-1 h-[1px] w-1 bg-neutral-400" />
                <DataCubeEditorNumberInput
                  className="ml-1 w-16 text-sm"
                  min={selectedColumn.minWidth ?? 0}
                  step={50}
                  defaultValue={undefined}
                  isValid={(value) =>
                    value !== undefined &&
                    value >= (selectedColumn.minWidth ?? 0)
                  }
                  value={selectedColumn.maxWidth}
                  setValue={(value) => {
                    selectedColumn.setMaxWidth(value);
                  }}
                  disabled={selectedColumn.fixedWidth !== undefined}
                />
              </div>

              <div className="mt-2 flex h-4 w-full items-center">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Blur Content?
                </div>
                <DataCubeEditorCheckbox
                  checked={selectedColumn.blur}
                  onChange={() => selectedColumn.setBlur(!selectedColumn.blur)}
                  disabled={true}
                />
                <WIP_Badge />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
