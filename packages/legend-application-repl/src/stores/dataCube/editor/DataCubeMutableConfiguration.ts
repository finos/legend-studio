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

import {
  getDataType,
  type DataCubeColumnKind,
  type DataCubeFont,
  type DataCubeAggregateFunction,
  type DataCubeNumberScale,
  type DataCubeSelectionStat,
  type DataCubeFontFormatUnderlineVariant,
  type DataCubeFontCase,
  type DataCubeFontTextAlignment,
  type DataCubeColumnDataType,
  type DataCubeColumnPinPlacement,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_BOLD,
  DEFAULT_FONT_ITALIC,
  DEFAULT_FONT_UNDERLINED,
  DEFAULT_FONT_STRIKETHROUGH,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_BACKGROUND_COLOR,
} from '../core/DataCubeQueryEngine.js';
import { type PlainObject, type Writable } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';

export class DataCubeMutableColumnConfiguration extends DataCubeColumnConfiguration {
  aggregateFunction?: DataCubeAggregateFunction | undefined;
  excludedFromHPivot = true;

  readonly dataType!: DataCubeColumnDataType;

  static create(
    json: PlainObject<DataCubeColumnConfiguration>,
  ): DataCubeMutableColumnConfiguration {
    const configuration = Object.assign(
      new DataCubeMutableColumnConfiguration('', ''),
      DataCubeColumnConfiguration.serialization.fromJson(json),
    );
    (configuration as Writable<DataCubeMutableColumnConfiguration>).dataType =
      getDataType(configuration.type);

    makeObservable(configuration, {
      kind: observable,
      setKind: action,

      displayName: observable,
      setDisplayName: action,

      decimals: observable,
      setDecimals: action,

      displayCommas: observable,
      setDisplayCommas: action,

      negativeNumberInParens: observable,
      setNegativeNumberInParens: action,

      numberScale: observable,
      setNumberScale: action,

      hPivotSortFunction: observable,
      setHPivotSortFunction: action,

      fontFamily: observable,
      setFontFamily: action,

      fontSize: observable,
      setFontSize: action,

      fontBold: observable,
      setFontBold: action,

      fontItalic: observable,
      setFontItalic: action,

      fontUnderline: observable,
      setFontUnderline: action,

      fontStrikethrough: observable,
      setFontStrikethrough: action,

      fontCase: observable,
      setFontCase: action,

      textAlign: observable,
      setTextAlign: action,

      foregroundColor: observable,
      setForegroundColor: action,

      negativeForegroundColor: observable,
      setNegativeForegroundColor: action,

      zeroForegroundColor: observable,
      setZeroForegroundColor: action,

      errorForegroundColor: observable,
      setErrorForegroundColor: action,

      backgroundColor: observable,
      setBackgroundColor: action,

      negativeBackgroundColor: observable,
      setNegativeBackgroundColor: action,

      zeroBackgroundColor: observable,
      setZeroBackgroundColor: action,

      errorBackgroundColor: observable,
      setErrorBackgroundColor: action,

      blur: observable,
      setBlur: action,

      hideFromView: observable,
      setHideFromView: action,

      aggregateFunction: observable,
      setAggregateFunction: action,

      excludedFromHPivot: observable,
      setExcludedFromHPivot: action,

      fixedWidth: observable,
      setFixedWidth: action,

      minWidth: observable,
      setMinWidth: action,

      maxWidth: observable,
      setMaxWidth: action,

      pinned: observable,
      setPinned: action,

      displayAsLink: observable,
      setDisplayAsLink: action,

      isUsingDefaultStyling: computed,
      useDefaultStyling: action,
    });

    return configuration;
  }

  serialize(): PlainObject<DataCubeColumnConfiguration> {
    return DataCubeColumnConfiguration.serialization.toJson(this);
  }

  get isUsingDefaultStyling(): boolean {
    return (
      this.fontFamily === undefined &&
      this.fontSize === undefined &&
      this.fontBold === undefined &&
      this.fontItalic === undefined &&
      this.fontUnderline === undefined &&
      this.fontStrikethrough === undefined &&
      this.textAlign === undefined &&
      this.foregroundColor === undefined &&
      this.negativeForegroundColor === undefined &&
      this.zeroForegroundColor === undefined &&
      this.errorForegroundColor === undefined &&
      this.backgroundColor === undefined &&
      this.negativeBackgroundColor === undefined &&
      this.zeroBackgroundColor === undefined &&
      this.errorBackgroundColor === undefined
    );
  }

  useDefaultStyling(): void {
    this.fontFamily = undefined;
    this.fontSize = undefined;
    this.fontBold = undefined;
    this.fontItalic = undefined;
    this.fontUnderline = undefined;
    this.fontStrikethrough = undefined;
    this.textAlign = undefined;
    this.foregroundColor = undefined;
    this.negativeForegroundColor = undefined;
    this.zeroForegroundColor = undefined;
    this.errorForegroundColor = undefined;
    this.backgroundColor = undefined;
    this.negativeBackgroundColor = undefined;
    this.zeroBackgroundColor = undefined;
    this.errorBackgroundColor = undefined;
  }

  setKind(value: DataCubeColumnKind): void {
    this.kind = value;
  }

  setDisplayName(value: string | undefined): void {
    this.displayName = value;
  }

  setDecimals(value: number | undefined): void {
    this.decimals = value;
  }

  setDisplayCommas(value: boolean): void {
    this.displayCommas = value;
  }

  setNegativeNumberInParens(value: boolean): void {
    this.negativeNumberInParens = value;
  }

  setNumberScale(value: DataCubeNumberScale | undefined): void {
    this.numberScale = value;
  }

  setHPivotSortFunction(value: string | undefined): void {
    this.hPivotSortFunction = value;
  }

  setFontFamily(value: DataCubeFont | undefined): void {
    this.fontFamily = value;
  }

  setFontSize(value: number | undefined): void {
    this.fontSize = value;
  }

  setFontBold(value: boolean | undefined): void {
    this.fontBold = value;
  }

  setFontItalic(value: boolean | undefined): void {
    this.fontItalic = value;
  }

  setFontUnderline(
    value: DataCubeFontFormatUnderlineVariant | undefined,
  ): void {
    this.fontUnderline = value;
  }

  setFontStrikethrough(value: boolean | undefined): void {
    this.fontStrikethrough = value;
  }

  setFontCase(value: DataCubeFontCase | undefined): void {
    this.fontCase = value;
  }

  setTextAlign(value: DataCubeFontTextAlignment | undefined): void {
    this.textAlign = value;
  }

  setForegroundColor(value: string | undefined): void {
    this.foregroundColor = value;
  }

  setNegativeForegroundColor(value: string | undefined): void {
    this.negativeForegroundColor = value;
  }

  setZeroForegroundColor(value: string | undefined): void {
    this.zeroForegroundColor = value;
  }

  setErrorForegroundColor(value: string | undefined): void {
    this.errorForegroundColor = value;
  }

  setBackgroundColor(value: string | undefined): void {
    this.backgroundColor = value;
  }

  setNegativeBackgroundColor(value: string | undefined): void {
    this.negativeBackgroundColor = value;
  }

  setZeroBackgroundColor(value: string | undefined): void {
    this.zeroBackgroundColor = value;
  }

  setErrorBackgroundColor(value: string | undefined): void {
    this.errorBackgroundColor = value;
  }

  setBlur(value: boolean): void {
    this.blur = value;
  }

  setHideFromView(value: boolean): void {
    this.hideFromView = value;
  }

  setFixedWidth(value: number | undefined): void {
    this.fixedWidth = value;
  }

  setMinWidth(value: number | undefined): void {
    this.minWidth = value;
  }

  setMaxWidth(value: number | undefined): void {
    this.maxWidth = value;
  }

  setPinned(value: DataCubeColumnPinPlacement | undefined): void {
    this.pinned = value;
  }

  setDisplayAsLink(value: boolean): void {
    this.displayAsLink = value;
  }

  setAggregateFunction(value: DataCubeAggregateFunction | undefined): void {
    this.aggregateFunction = value;
  }

  setExcludedFromHPivot(value: boolean): void {
    this.excludedFromHPivot = value;
  }
}

export class DataCubeMutableConfiguration extends DataCubeConfiguration {
  static create(
    json: PlainObject<DataCubeConfiguration>,
  ): DataCubeMutableConfiguration {
    const configuration = Object.assign(
      new DataCubeMutableConfiguration(),
      DataCubeConfiguration.serialization.fromJson(json),
    );
    configuration.columns = [];

    makeObservable(configuration, {
      description: observable,
      setDescription: action,

      showTreeLines: observable,
      setShowTreeLines: action,

      showHorizontalGridLines: observable,
      setShowHorizontalGridLines: action,

      showVerticalGridLines: observable,
      setShowVerticalGridLines: action,

      gridLineColor: observable,
      setGridLineColor: action,

      defaultFontFamily: observable,
      setDefaultFontFamily: action,

      defaultFontSize: observable,
      setDefaultFontSize: action,

      defaultFontBold: observable,
      setDefaultFontBold: action,

      defaultFontItalic: observable,
      setDefaultFontItalic: action,

      defaultFontUnderline: observable,
      setDefaultFontUnderline: action,

      defaultFontStrikethrough: observable,
      setDefaultFontStrikethrough: action,

      defaultFontCase: observable,
      setDefaultFontCase: action,

      defaultTextAlign: observable,
      setDefaultTextAlign: action,

      defaultForegroundColor: observable,
      setDefaultForegroundColor: action,

      defaultNegativeForegroundColor: observable,
      setDefaultNegativeForegroundColor: action,

      defaultZeroForegroundColor: observable,
      setDefaultZeroForegroundColor: action,

      defaultErrorForegroundColor: observable,
      setDefaultErrorForegroundColor: action,

      defaultBackgroundColor: observable,
      setDefaultBackgroundColor: action,

      defaultNegativeBackgroundColor: observable,
      setDefaultNegativeBackgroundColor: action,

      defaultZeroBackgroundColor: observable,
      setDefaultZeroBackgroundColor: action,

      defaultErrorBackgroundColor: observable,
      setDefaultErrorBackgroundColor: action,

      alternateRows: observable,
      setAlternateRows: action,

      alternateRowsColor: observable,
      setAlternateRowsColor: action,

      alternateRowsCount: observable,
      setAlternateRowsCount: action,

      alternateRowsStandardMode: observable,
      setAlternateRowsStandardMode: action,

      selectionStats: observable,
      setSelectionStats: action,

      rowBuffer: observable,
      setRowBuffer: action,

      showWarningForTruncatedResult: observable,
      setShowWarningForTruncatedResult: action,

      initialExpandLevel: observable,
      setInitialExpandLevel: action,

      showRootAggregation: observable,
      setShowRootAggregation: action,

      showLeafCount: observable,
      setShowLeafCount: action,

      addPivotTotalColumn: observable,
      setAddPivotTotalColumn: action,

      addPivotTotalColumnOnLeft: observable,
      setAddPivotTotalColumnOnLeft: action,

      treeGroupSortFunction: observable,
      setTreeGroupSortFunction: action,

      isUsingDefaultStyling: computed,
      useDefaultStyling: action,
    });

    return configuration;
  }

  get isUsingDefaultStyling(): boolean {
    return (
      this.defaultFontFamily === DEFAULT_FONT_FAMILY &&
      this.defaultFontSize === DEFAULT_FONT_SIZE &&
      this.defaultFontBold === DEFAULT_FONT_BOLD &&
      this.defaultFontItalic === DEFAULT_FONT_ITALIC &&
      this.defaultFontUnderline === DEFAULT_FONT_UNDERLINED &&
      this.defaultFontStrikethrough === DEFAULT_FONT_STRIKETHROUGH &&
      this.defaultTextAlign === DEFAULT_TEXT_ALIGN &&
      this.defaultForegroundColor === DEFAULT_FOREGROUND_COLOR &&
      this.defaultNegativeForegroundColor ===
        DEFAULT_NEGATIVE_FOREGROUND_COLOR &&
      this.defaultZeroForegroundColor === DEFAULT_ZERO_FOREGROUND_COLOR &&
      this.defaultErrorForegroundColor === DEFAULT_ERROR_FOREGROUND_COLOR &&
      this.defaultBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.defaultNegativeBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.defaultZeroBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.defaultErrorBackgroundColor === DEFAULT_BACKGROUND_COLOR
    );
  }

  useDefaultStyling(): void {
    this.defaultFontFamily = DEFAULT_FONT_FAMILY;
    this.defaultFontSize = DEFAULT_FONT_SIZE;
    this.defaultFontBold = DEFAULT_FONT_BOLD;
    this.defaultFontItalic = DEFAULT_FONT_ITALIC;
    this.defaultFontUnderline = DEFAULT_FONT_UNDERLINED;
    this.defaultFontStrikethrough = DEFAULT_FONT_STRIKETHROUGH;
    this.defaultTextAlign = DEFAULT_TEXT_ALIGN;
    this.defaultForegroundColor = DEFAULT_FOREGROUND_COLOR;
    this.defaultNegativeForegroundColor = DEFAULT_NEGATIVE_FOREGROUND_COLOR;
    this.defaultZeroForegroundColor = DEFAULT_ZERO_FOREGROUND_COLOR;
    this.defaultErrorForegroundColor = DEFAULT_ERROR_FOREGROUND_COLOR;
    this.defaultBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.defaultNegativeBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.defaultZeroBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.defaultErrorBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  }

  serialize(): PlainObject<DataCubeConfiguration> {
    return DataCubeConfiguration.serialization.toJson(this);
  }

  setDescription(value: string | undefined): void {
    this.description = value;
  }

  setShowTreeLines(value: boolean): void {
    this.showTreeLines = value;
  }

  setShowHorizontalGridLines(value: boolean): void {
    this.showHorizontalGridLines = value;
  }

  setShowVerticalGridLines(value: boolean): void {
    this.showVerticalGridLines = value;
  }

  setGridLineColor(value: string): void {
    this.gridLineColor = value;
  }

  setDefaultFontFamily(value: DataCubeFont): void {
    this.defaultFontFamily = value;
  }

  setDefaultFontSize(value: number): void {
    this.defaultFontSize = value;
  }

  setDefaultFontBold(value: boolean): void {
    this.defaultFontBold = value;
  }

  setDefaultFontItalic(value: boolean): void {
    this.defaultFontItalic = value;
  }

  setDefaultFontUnderline(
    value: DataCubeFontFormatUnderlineVariant | undefined,
  ): void {
    this.defaultFontUnderline = value;
  }

  setDefaultFontStrikethrough(value: boolean): void {
    this.defaultFontStrikethrough = value;
  }

  setDefaultFontCase(value: DataCubeFontCase | undefined): void {
    this.defaultFontCase = value;
  }

  setDefaultTextAlign(value: DataCubeFontTextAlignment): void {
    this.defaultTextAlign = value;
  }

  setDefaultForegroundColor(value: string): void {
    this.defaultForegroundColor = value;
  }

  setDefaultNegativeForegroundColor(value: string): void {
    this.defaultNegativeForegroundColor = value;
  }

  setDefaultZeroForegroundColor(value: string): void {
    this.defaultZeroForegroundColor = value;
  }

  setDefaultErrorForegroundColor(value: string): void {
    this.defaultErrorForegroundColor = value;
  }

  setDefaultBackgroundColor(value: string): void {
    this.defaultBackgroundColor = value;
  }

  setDefaultNegativeBackgroundColor(value: string): void {
    this.defaultNegativeBackgroundColor = value;
  }

  setDefaultZeroBackgroundColor(value: string): void {
    this.defaultZeroBackgroundColor = value;
  }

  setDefaultErrorBackgroundColor(value: string): void {
    this.defaultErrorBackgroundColor = value;
  }

  setAlternateRows(value: boolean): void {
    this.alternateRows = value;
  }

  setAlternateRowsColor(value: string): void {
    this.alternateRowsColor = value;
  }

  setAlternateRowsCount(value: number): void {
    this.alternateRowsCount = value;
  }

  setAlternateRowsStandardMode(value: boolean): void {
    this.alternateRowsStandardMode = value;
  }

  setSelectionStats(value: DataCubeSelectionStat[]): void {
    this.selectionStats = value;
  }

  setRowBuffer(value: number): void {
    this.rowBuffer = value;
  }

  setShowWarningForTruncatedResult(value: boolean): void {
    this.showWarningForTruncatedResult = value;
  }

  setInitialExpandLevel(value: number | undefined): void {
    this.initialExpandLevel = value;
  }

  setShowRootAggregation(value: boolean): void {
    this.showRootAggregation = value;
  }

  setShowLeafCount(value: boolean): void {
    this.showLeafCount = value;
  }

  setAddPivotTotalColumn(value: boolean): void {
    this.addPivotTotalColumn = value;
  }

  setAddPivotTotalColumnOnLeft(value: boolean): void {
    this.addPivotTotalColumnOnLeft = value;
  }

  setTreeGroupSortFunction(value: string | undefined): void {
    this.treeGroupSortFunction = value;
  }
}
