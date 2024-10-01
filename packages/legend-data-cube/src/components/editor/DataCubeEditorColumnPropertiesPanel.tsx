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
import {
  FormBadge_Advanced,
  FormCheckbox,
  FormColorPickerButton,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuItemSeparator,
  FormDropdownMenuTrigger,
  FormNumberInput,
  FormTextInput,
  FormDocumentation,
} from '../shared/DataCubeFormUtils.js';
import {
  DataCubeQueryClientSideAggregateOperator,
  DataCubeColumnDataType,
  DataCubeColumnKind,
  DataCubeColumnPinPlacement,
  DataCubeFont,
  DataCubeFontCase,
  DataCubeFontFormatUnderlineVariant,
  DataCubeFontTextAlignment,
  DataCubeNumberScale,
  DEFAULT_COLUMN_MAX_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_URL_LABEL_QUERY_PARAM,
} from '../../stores/core/DataCubeQueryEngine.js';
import { DocumentationKey } from '../../application/DataCubeDocumentation.js';
import type { DataCubeViewState } from '../../stores/DataCubeViewState.js';
import { _sortByColName } from '../../stores/core/DataCubeQuerySnapshot.js';

export const DataCubeEditorColumnPropertiesPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const panel = view.editor.columnProperties;
    const gridConfiguration = view.editor.generalProperties.configuration;
    const selectedColumn = panel.selectedColumn;
    const [
      openColumnDropdown,
      closeColumnDropdown,
      columnDropdownProps,
      columnDropPropsOpen,
    ] = useDropdownMenu();
    const [
      openKindDropdown,
      closeKindDropdown,
      kindDropdownProps,
      kindDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openAggregationOperationDropdown,
      closeAggregationOperationDropdown,
      aggregationOperationDropdownProps,
      aggregationOperationDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openNumberScaleDropdown,
      closeNumberScaleDropdown,
      numberScaleDropdownProps,
      numberScaleDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openColumnPinDropdown,
      closeColumnPinDropdown,
      columnPinDropdownProps,
      columnPinDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openFontFamilyDropdown,
      closeFontFamilyDropdown,
      fontFamilyDropdownProps,
      fontFamilyDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openFontSizeDropdown,
      closeFontSizeDropdown,
      openFontSizeDropdownProps,
      openFontSizeDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openFontFormatUnderlineVariantDropdown,
      closeFontFormatUnderlineVariantDropdown,
      fontFormatUnderlineVariantDropdownProps,
    ] = useDropdownMenu();
    const [openFontCaseDropdown, closeFontCaseDropdown, fontCaseDropdownProps] =
      useDropdownMenu();

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6 justify-between">
          <div className="flex h-full">
            <div className="relative flex h-6 items-center text-xl font-medium">
              <DataCubeIcon.TableColumn />
              <DataCubeIcon.TableColumnOptions__Settings className="absolute bottom-1 right-0 bg-white text-xs" />
            </div>
            <div className="ml-1 flex h-6 items-center text-xl font-medium">
              Column Properties
            </div>
          </div>
          <div className="flex h-full items-center pr-2">
            <FormCheckbox
              label="Show advanced settings?"
              checked={panel.showAdvancedSettings}
              onChange={() =>
                panel.setShowAdvancedSettings(!panel.showAdvancedSettings)
              }
            />
            <FormBadge_Advanced />
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <div className="h-full w-full py-2">
            <div className="flex h-6 w-full items-center">
              <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                Choose Column:
              </div>
              <FormDropdownMenuTrigger
                className="w-80"
                onClick={openColumnDropdown}
                open={columnDropPropsOpen}
              >
                <div className="flex h-full w-full items-center">
                  <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {selectedColumn?.name ?? '(None)'}
                  </div>
                  {selectedColumn && (
                    <>
                      <div className="ml-1.5 mr-0.5 flex h-3.5 w-12 flex-shrink-0 items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-xs font-medium uppercase text-neutral-600">
                        {selectedColumn.dataType}
                      </div>
                      {Boolean(
                        panel.editor.leafExtendColumns.find(
                          (col) => col.name === selectedColumn.name,
                        ),
                      ) && (
                        <div className="mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
                          {`Extended (Leaf Level)`}
                        </div>
                      )}
                      {Boolean(
                        panel.editor.groupExtendColumns.find(
                          (col) => col.name === selectedColumn.name,
                        ),
                      ) && (
                        <div className="mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
                          {`Extended (Group Level)`}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </FormDropdownMenuTrigger>
              <FormDropdownMenu className="w-80" {...columnDropdownProps}>
                {panel.columns
                  .slice()
                  .sort(_sortByColName)
                  .map((column) => (
                    <FormDropdownMenuItem
                      key={column.name}
                      onClick={() => {
                        panel.setSelectedColumnName(column.name);
                        closeColumnDropdown();
                      }}
                      autoFocus={column.name === selectedColumn?.name}
                    >
                      <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
                        {column.name}
                      </div>
                      <div className="ml-1.5 mr-0.5 flex h-3.5 w-12 flex-shrink-0 items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-xs font-medium uppercase text-neutral-600">
                        {column.dataType}
                      </div>
                      {Boolean(
                        panel.editor.leafExtendColumns.find(
                          (col) => col.name === column.name,
                        ),
                      ) && (
                        <div className="mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
                          {`Extended (Leaf Level)`}
                        </div>
                      )}
                      {Boolean(
                        panel.editor.groupExtendColumns.find(
                          (col) => col.name === column.name,
                        ),
                      ) && (
                        <div className="mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
                          {`Extended (Group Level)`}
                        </div>
                      )}
                    </FormDropdownMenuItem>
                  ))}
              </FormDropdownMenu>
              {panel.showAdvancedSettings && selectedColumn && (
                <>
                  <div className="mx-2 h-[1px] w-4 flex-shrink-0 bg-neutral-400" />
                  <div className="flex h-6 items-center">
                    <div className="flex h-full flex-shrink-0 items-center text-sm">
                      Column Kind:
                      <FormDocumentation
                        className="ml-1"
                        documentationKey={
                          DocumentationKey.DATA_CUBE_COLUMN_KINDS
                        }
                      />
                    </div>
                    <FormDropdownMenuTrigger
                      className="ml-1.5 w-20"
                      onClick={openKindDropdown}
                      open={kindDropdownPropsOpen}
                      // disallow changing the column kind if the column is being used as pivot column
                      disabled={Boolean(
                        panel.editor.verticalPivots.selector.selectedColumns.find(
                          (col) => col.name === selectedColumn.name,
                        ) ??
                          panel.editor.horizontalPivots.selector.selectedColumns.find(
                            (col) => col.name === selectedColumn.name,
                          ),
                      )}
                    >
                      {selectedColumn.kind}
                    </FormDropdownMenuTrigger>
                    <FormDropdownMenu className="w-20" {...kindDropdownProps}>
                      {[
                        DataCubeColumnKind.DIMENSION,
                        DataCubeColumnKind.MEASURE,
                      ].map((kind) => (
                        <FormDropdownMenuItem
                          key={kind}
                          onClick={() => {
                            if (kind !== selectedColumn.kind) {
                              selectedColumn.setKind(kind);
                              selectedColumn.setExcludedFromPivot(
                                kind === DataCubeColumnKind.DIMENSION,
                              );
                              selectedColumn.setPivotStatisticColumnFunction(
                                kind === DataCubeColumnKind.DIMENSION
                                  ? undefined
                                  : DataCubeQueryClientSideAggregateOperator.SUM,
                              );
                            }
                            closeKindDropdown();
                          }}
                          autoFocus={kind === selectedColumn.kind}
                        >
                          {kind}
                        </FormDropdownMenuItem>
                      ))}
                    </FormDropdownMenu>
                    <FormBadge_Advanced />
                  </div>
                </>
              )}
            </div>

            <div className="-ml-2 mb-2 mt-3 h-[1px] w-[calc(100%_+_16px)] bg-neutral-200" />

            {selectedColumn && (
              <>
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Display Name:
                  </div>
                  <FormTextInput
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

                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Aggregation:
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-32"
                    onClick={openAggregationOperationDropdown}
                    disabled={
                      selectedColumn.kind === DataCubeColumnKind.DIMENSION
                    }
                    open={aggregationOperationDropdownPropsOpen}
                  >
                    {selectedColumn.aggregateOperation.operator}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu
                    className="w-32"
                    {...aggregationOperationDropdownProps}
                  >
                    {panel.view.engine.aggregateOperations
                      .filter((op) => op.isCompatibleWithColumn(selectedColumn))
                      .map((op) => (
                        <FormDropdownMenuItem
                          key={op.operator}
                          onClick={() => {
                            selectedColumn.setAggregateOperation(op);
                            closeAggregationOperationDropdown();
                          }}
                          autoFocus={op === selectedColumn.aggregateOperation}
                        >
                          {op.label}
                        </FormDropdownMenuItem>
                      ))}
                  </FormDropdownMenu>

                  <FormCheckbox
                    className="ml-3"
                    label="Exclude from H-Pivot"
                    checked={selectedColumn.excludedFromPivot}
                    onChange={() =>
                      selectedColumn.setExcludedFromPivot(
                        !selectedColumn.excludedFromPivot,
                      )
                    }
                    disabled={
                      selectedColumn.kind === DataCubeColumnKind.DIMENSION
                    }
                  />
                </div>

                {selectedColumn.dataType === DataCubeColumnDataType.NUMBER && (
                  <>
                    <div className="mt-2 flex h-5 w-full items-center">
                      <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                        Number Format:
                      </div>
                      <FormNumberInput
                        className="w-16 text-sm"
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
                      <FormCheckbox
                        className="ml-3"
                        label="Display commas"
                        checked={selectedColumn.displayCommas}
                        onChange={() =>
                          selectedColumn.setDisplayCommas(
                            !selectedColumn.displayCommas,
                          )
                        }
                      />
                      <FormCheckbox
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

                    <div className="mt-2 flex h-5 w-full items-center">
                      <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                        Number Scale:
                      </div>
                      <FormDropdownMenuTrigger
                        className="w-32"
                        onClick={openNumberScaleDropdown}
                        open={numberScaleDropdownPropsOpen}
                      >
                        {selectedColumn.numberScale ?? '(None)'}
                      </FormDropdownMenuTrigger>
                      <FormDropdownMenu
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
                          <FormDropdownMenuItem
                            key={scale ?? ''}
                            onClick={() => {
                              selectedColumn.setNumberScale(scale);
                              closeNumberScaleDropdown();
                            }}
                            autoFocus={scale === selectedColumn.numberScale}
                          >
                            {scale ?? '(None)'}
                          </FormDropdownMenuItem>
                        ))}
                      </FormDropdownMenu>
                    </div>
                  </>
                )}

                {selectedColumn.dataType === DataCubeColumnDataType.TEXT && (
                  <>
                    <div className="mt-2 flex h-5 w-full items-center">
                      <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                        Dislay as Link?
                        <FormDocumentation
                          className="ml-1"
                          documentationKey={
                            DocumentationKey.DATA_CUBE_COLUMN_DISPLAY_AS_LINK
                          }
                        />
                      </div>
                      <FormCheckbox
                        checked={selectedColumn.displayAsLink}
                        onChange={() =>
                          selectedColumn.setDisplayAsLink(
                            !selectedColumn.displayAsLink,
                          )
                        }
                      />
                      <div className="ml-1 h-[1px] w-2 flex-shrink-0 bg-neutral-400" />
                      <div className="ml-2 mr-1.5 flex h-full flex-shrink-0 items-center text-sm">
                        Use parameter in link as label:
                      </div>
                      <FormTextInput
                        className="w-48"
                        placeholder={DEFAULT_URL_LABEL_QUERY_PARAM}
                        value={selectedColumn.linkLabelParameter ?? ''}
                        onChange={(event) => {
                          const value = event.target.value.trim();
                          selectedColumn.setLinkLabelParameter(
                            value !== '' ? value : undefined,
                          );
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    {`Missing Value Format:`}
                    <FormDocumentation
                      className="ml-1"
                      documentationKey={
                        DocumentationKey.DATA_CUBE_COLUMN_MISSING_VALUE_FORMAT
                      }
                    />
                  </div>
                  <FormTextInput
                    className="w-16"
                    value={selectedColumn.missingValueDisplayText ?? ''}
                    onChange={(event) => {
                      const value = event.target.value.trim();
                      selectedColumn.setMissingValueDisplayText(
                        value !== '' ? value : undefined,
                      );
                    }}
                    placeholder="(empty)"
                  />
                </div>

                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Visibility:
                  </div>
                  <FormCheckbox
                    label="Blur content"
                    checked={selectedColumn.blur}
                    onChange={() =>
                      selectedColumn.setBlur(!selectedColumn.blur)
                    }
                    disabled={selectedColumn.hideFromView}
                  />
                  <FormCheckbox
                    className="ml-3"
                    label="Hide from view"
                    checked={selectedColumn.hideFromView}
                    onChange={() =>
                      selectedColumn.setHideFromView(
                        !selectedColumn.hideFromView,
                      )
                    }
                  />
                </div>

                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Pin:
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-16"
                    onClick={openColumnPinDropdown}
                    open={columnPinDropdownPropsOpen}
                  >
                    {selectedColumn.pinned ?? '(None)'}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu
                    className="w-16"
                    {...columnPinDropdownProps}
                  >
                    {[
                      undefined,
                      DataCubeColumnPinPlacement.LEFT,
                      DataCubeColumnPinPlacement.RIGHT,
                    ].map((placement) => (
                      <FormDropdownMenuItem
                        key={placement ?? ''}
                        onClick={() => {
                          selectedColumn.setPinned(placement);
                          closeColumnPinDropdown();
                        }}
                        autoFocus={placement === selectedColumn.pinned}
                      >
                        {placement ?? '(None)'}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>
                </div>

                <div className="mt-1.5 flex h-6 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Width:
                  </div>
                  <FormCheckbox
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

                  <FormCheckbox
                    className="ml-3"
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
                  <div className="ml-1 h-[1px] w-2 flex-shrink-0 bg-neutral-400" />
                  <FormNumberInput
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

                  <FormCheckbox
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
                  <div className="ml-1 h-[1px] w-2 flex-shrink-0 bg-neutral-400" />
                  <FormNumberInput
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
                  <div className="ml-1 h-[1px] w-1 flex-shrink-0 bg-neutral-400" />
                  <FormNumberInput
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

                <div className="my-2 h-[1px] w-full bg-neutral-200" />

                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                    Font:
                  </div>
                  <FormDropdownMenuTrigger
                    className="w-28"
                    onClick={openFontFamilyDropdown}
                    open={fontFamilyDropdownPropsOpen}
                  >
                    {selectedColumn.fontFamily ?? gridConfiguration.fontFamily}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu
                    className="w-28"
                    {...fontFamilyDropdownProps}
                  >
                    {[
                      DataCubeFont.ARIAL,
                      DataCubeFont.ROBOTO,
                      DataCubeFont.ROBOTO_CONDENSED,
                    ].map((font) => (
                      <FormDropdownMenuItem
                        key={font}
                        onClick={() => {
                          selectedColumn.setFontFamily(font);
                          closeFontFamilyDropdown();
                        }}
                        autoFocus={
                          font ===
                          (selectedColumn.fontFamily ??
                            gridConfiguration.fontFamily)
                        }
                      >
                        {font}
                      </FormDropdownMenuItem>
                    ))}
                    <FormDropdownMenuItemSeparator />
                    {[
                      DataCubeFont.GEORGIA,
                      DataCubeFont.ROBOTO_SERIF,
                      DataCubeFont.TIMES_NEW_ROMAN,
                    ].map((font) => (
                      <FormDropdownMenuItem
                        key={font}
                        onClick={() => {
                          selectedColumn.setFontFamily(font);
                          closeFontFamilyDropdown();
                        }}
                        autoFocus={
                          font ===
                          (selectedColumn.fontFamily ??
                            gridConfiguration.fontFamily)
                        }
                      >
                        {font}
                      </FormDropdownMenuItem>
                    ))}
                    <FormDropdownMenuItemSeparator />
                    {[
                      DataCubeFont.JERBRAINS_MONO,
                      DataCubeFont.ROBOTO_MONO,
                      DataCubeFont.UBUNTU_MONO,
                    ].map((font) => (
                      <FormDropdownMenuItem
                        key={font}
                        onClick={() => {
                          selectedColumn.setFontFamily(font);
                          closeFontFamilyDropdown();
                        }}
                        autoFocus={
                          font ===
                          (selectedColumn.fontFamily ??
                            gridConfiguration.fontFamily)
                        }
                      >
                        {font}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>

                  <FormDropdownMenuTrigger
                    className="ml-1 w-10"
                    onClick={openFontSizeDropdown}
                    open={openFontSizeDropdownPropsOpen}
                  >
                    {selectedColumn.fontSize ?? gridConfiguration.fontSize}
                  </FormDropdownMenuTrigger>
                  <FormDropdownMenu
                    className="w-10"
                    {...openFontSizeDropdownProps}
                  >
                    {[
                      4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26,
                      28, 32, 36, 48, 72,
                    ].map((size) => (
                      <FormDropdownMenuItem
                        key={size}
                        onClick={() => {
                          selectedColumn.setFontSize(size);
                          closeFontSizeDropdown();
                        }}
                        autoFocus={
                          size ===
                          (selectedColumn.fontSize ??
                            gridConfiguration.fontSize)
                        }
                      >
                        {size}
                      </FormDropdownMenuItem>
                    ))}
                  </FormDropdownMenu>

                  <div className="relative ml-2 flex h-5">
                    <button
                      title="Bold"
                      className={cn(
                        'relative flex h-5 w-5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            selectedColumn.fontBold ??
                            gridConfiguration.fontBold,
                        },
                      )}
                      onClick={() =>
                        selectedColumn.setFontBold(
                          !(
                            selectedColumn.fontBold ??
                            gridConfiguration.fontBold
                          ),
                        )
                      }
                    >
                      <DataCubeIcon.FontBold />
                    </button>
                    <button
                      title="Italic"
                      className={cn(
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            selectedColumn.fontItalic ??
                            gridConfiguration.fontItalic,
                        },
                      )}
                      onClick={() =>
                        selectedColumn.setFontItalic(
                          !(
                            selectedColumn.fontItalic ??
                            gridConfiguration.fontItalic
                          ),
                        )
                      }
                    >
                      <DataCubeIcon.FontItalic />
                    </button>
                    <button
                      title={`Underline${(selectedColumn.fontUnderline ?? gridConfiguration.fontUnderline) ? ` (${selectedColumn.fontUnderline ?? gridConfiguration.fontUnderline})` : ''}`}
                      className={cn(
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-r-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            (selectedColumn.fontUnderline ??
                              gridConfiguration.fontUnderline) !== undefined,
                        },
                      )}
                      onClick={() => {
                        if (
                          (selectedColumn.fontUnderline ??
                            gridConfiguration.fontUnderline) === undefined
                        ) {
                          selectedColumn.setFontUnderline(
                            DataCubeFontFormatUnderlineVariant.SOLID,
                          );
                          selectedColumn.setFontStrikethrough(false);
                        } else {
                          selectedColumn.setFontUnderline(undefined);
                        }
                      }}
                    >
                      <DataCubeIcon.FontUnderline />
                    </button>
                    <button
                      className="text-2xs relative -ml-[1px] flex h-5 w-2.5 items-center justify-center border border-l-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-600 focus:z-[1]"
                      onClick={openFontFormatUnderlineVariantDropdown}
                    >
                      <div
                        className={cn('h-4 w-[0.5px] bg-neutral-200', {
                          'opacity-0':
                            (selectedColumn.fontUnderline ??
                              gridConfiguration.fontUnderline) !== undefined,
                        })}
                      />
                      <DataCubeIcon.CaretDown />
                    </button>
                    <FormDropdownMenu
                      className="w-14"
                      {...fontFormatUnderlineVariantDropdownProps}
                    >
                      {[
                        DataCubeFontFormatUnderlineVariant.SOLID,
                        DataCubeFontFormatUnderlineVariant.DASHED,
                        DataCubeFontFormatUnderlineVariant.DOTTED,
                        DataCubeFontFormatUnderlineVariant.DOUBLE,
                        DataCubeFontFormatUnderlineVariant.WAVY,
                      ].map((variant) => (
                        <FormDropdownMenuItem
                          className="relative"
                          key={variant}
                          onClick={() => {
                            selectedColumn.setFontUnderline(variant);
                            selectedColumn.setFontStrikethrough(false);
                            closeFontFormatUnderlineVariantDropdown();
                          }}
                          autoFocus={
                            variant ===
                            (selectedColumn.fontUnderline ??
                              gridConfiguration.fontUnderline)
                          }
                        >
                          <div
                            className={cn(
                              '!hover:underline absolute top-0 !underline',
                              {
                                '!hover:decoration-solid !decoration-solid':
                                  variant ===
                                  DataCubeFontFormatUnderlineVariant.SOLID,
                                '!hover:decoration-dashed !decoration-dashed':
                                  variant ===
                                  DataCubeFontFormatUnderlineVariant.DASHED,
                                '!hover:decoration-dotted !decoration-dotted':
                                  variant ===
                                  DataCubeFontFormatUnderlineVariant.DOTTED,
                                '!hover:decoration-double !decoration-double':
                                  variant ===
                                  DataCubeFontFormatUnderlineVariant.DOUBLE,
                                '!hover:decoration-wavy !decoration-wavy':
                                  variant ===
                                  DataCubeFontFormatUnderlineVariant.WAVY,
                              },
                            )}
                          >
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          </div>
                        </FormDropdownMenuItem>
                      ))}
                    </FormDropdownMenu>
                    <button
                      title="Strikethrough"
                      className={cn(
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            selectedColumn.fontStrikethrough ??
                            gridConfiguration.fontStrikethrough,
                        },
                      )}
                      onClick={() => {
                        if (
                          selectedColumn.fontStrikethrough ??
                          gridConfiguration.fontStrikethrough
                        ) {
                          selectedColumn.setFontStrikethrough(false);
                        } else {
                          selectedColumn.setFontStrikethrough(true);
                          selectedColumn.setFontUnderline(undefined);
                        }
                      }}
                    >
                      <DataCubeIcon.FontStrikethrough />
                    </button>
                    <button
                      title={`Case${(selectedColumn.fontCase ?? gridConfiguration.fontCase) ? ` (${selectedColumn.fontCase ?? gridConfiguration.fontCase})` : ''}`}
                      className={cn(
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-r-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            (selectedColumn.fontCase ??
                              gridConfiguration.fontCase) !== undefined,
                        },
                      )}
                      onClick={() => {
                        if (
                          (selectedColumn.fontCase ??
                            gridConfiguration.fontCase) === undefined
                        ) {
                          selectedColumn.setFontCase(
                            DataCubeFontCase.UPPERCASE,
                          );
                        } else {
                          selectedColumn.setFontCase(undefined);
                        }
                      }}
                    >
                      <DataCubeIcon.FontCase className="stroke-[0.5px]" />
                    </button>
                    <button
                      className="text-2xs relative -ml-[1px] flex h-5 w-2.5 items-center justify-center rounded-br-sm rounded-tr-sm border border-l-0 border-neutral-400 bg-neutral-50 p-0 text-neutral-600 focus:z-[1]"
                      onClick={openFontCaseDropdown}
                    >
                      <div
                        className={cn('h-4 w-[0.5px] bg-neutral-200', {
                          'opacity-0':
                            (selectedColumn.fontCase ??
                              gridConfiguration.fontCase) !== undefined,
                        })}
                      />
                      <DataCubeIcon.CaretDown />
                    </button>
                    <FormDropdownMenu
                      className="w-20"
                      {...fontCaseDropdownProps}
                    >
                      {[
                        DataCubeFontCase.LOWERCASE,
                        DataCubeFontCase.UPPERCASE,
                        DataCubeFontCase.CAPITALIZE,
                      ].map((fontCase) => (
                        <FormDropdownMenuItem
                          key={fontCase}
                          onClick={() => {
                            selectedColumn.setFontCase(fontCase);
                            closeFontCaseDropdown();
                          }}
                          autoFocus={
                            fontCase ===
                            (selectedColumn.fontCase ??
                              gridConfiguration.fontCase)
                          }
                        >
                          <div
                            className={cn({
                              lowercase:
                                fontCase === DataCubeFontCase.LOWERCASE,
                              uppercase:
                                fontCase === DataCubeFontCase.UPPERCASE,
                              capitalize:
                                fontCase === DataCubeFontCase.CAPITALIZE,
                            })}
                          >
                            {fontCase}
                          </div>
                        </FormDropdownMenuItem>
                      ))}
                    </FormDropdownMenu>
                  </div>

                  <div className="relative ml-2 flex h-5">
                    <button
                      title="Align Left"
                      className={cn(
                        'relative flex h-5 w-5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            (selectedColumn.textAlign ??
                              gridConfiguration.textAlign) ===
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
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            (selectedColumn.textAlign ??
                              gridConfiguration.textAlign) ===
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
                        'relative -ml-[1px] flex h-5 w-5 items-center justify-center rounded-br-sm rounded-tr-sm border border-neutral-400 bg-neutral-50 p-0 text-neutral-700 focus:z-[1]',
                        {
                          'bg-neutral-200':
                            (selectedColumn.textAlign ??
                              gridConfiguration.textAlign) ===
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
                        <FormColorPickerButton
                          color={
                            selectedColumn.normalForegroundColor ??
                            gridConfiguration.normalForegroundColor
                          }
                          defaultColor={gridConfiguration.normalForegroundColor}
                          onChange={(value) =>
                            selectedColumn.setNormalForegroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.negativeForegroundColor ??
                            gridConfiguration.negativeForegroundColor
                          }
                          defaultColor={
                            gridConfiguration.negativeForegroundColor
                          }
                          onChange={(value) =>
                            selectedColumn.setNegativeForegroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.zeroForegroundColor ??
                            gridConfiguration.zeroForegroundColor
                          }
                          defaultColor={gridConfiguration.zeroForegroundColor}
                          onChange={(value) =>
                            selectedColumn.setZeroForegroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.errorForegroundColor ??
                            gridConfiguration.errorForegroundColor
                          }
                          defaultColor={gridConfiguration.errorForegroundColor}
                          onChange={(value) =>
                            selectedColumn.setErrorForegroundColor(value)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex h-6">
                      <div className="flex h-full w-16 flex-shrink-0 items-center text-sm">
                        Background:
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.normalBackgroundColor ??
                            gridConfiguration.normalBackgroundColor
                          }
                          defaultColor={gridConfiguration.normalBackgroundColor}
                          onChange={(value) =>
                            selectedColumn.setNormalBackgroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.negativeBackgroundColor ??
                            gridConfiguration.negativeBackgroundColor
                          }
                          defaultColor={
                            gridConfiguration.negativeBackgroundColor
                          }
                          onChange={(value) =>
                            selectedColumn.setNegativeBackgroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.zeroBackgroundColor ??
                            gridConfiguration.zeroBackgroundColor
                          }
                          defaultColor={gridConfiguration.zeroBackgroundColor}
                          onChange={(value) =>
                            selectedColumn.setZeroBackgroundColor(value)
                          }
                        />
                      </div>
                      <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
                        <FormColorPickerButton
                          color={
                            selectedColumn.errorBackgroundColor ??
                            gridConfiguration.errorBackgroundColor
                          }
                          defaultColor={gridConfiguration.errorBackgroundColor}
                          onChange={(value) =>
                            selectedColumn.setErrorBackgroundColor(value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex w-full">
                  <div className="flex h-6 w-32 flex-shrink-0 items-center text-sm" />
                  <div className="w-80">
                    <div className="mb-2 h-[1px] w-full bg-neutral-200" />
                    <button
                      className="flex h-5 items-center justify-center rounded-sm border border-neutral-400 bg-neutral-200 p-0 px-1 text-sm text-neutral-700 disabled:text-neutral-400"
                      disabled={selectedColumn.isUsingDefaultStyling}
                      onClick={() => selectedColumn.useDefaultStyling()}
                    >
                      Use Default Styling
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);
