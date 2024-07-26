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
  type DataCubeAggregateOperation,
  type DataCubeOperationValue,
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
import { buildDefaultColumnConfiguration } from '../core/DataCubeConfigurationBuilder.js';

export class DataCubeMutableColumnConfiguration extends DataCubeColumnConfiguration {
  readonly dataType!: DataCubeColumnDataType;

  // NOTE: these configurations are synthesized from the data query, and materialized here
  // to make editing more convenient. They should not be part of the persistent configuration
  // to avoid duplication of information with the data query.
  aggregateFunction?: DataCubeAggregateOperation | undefined;
  aggregateFunctionParameters: DataCubeOperationValue[] = [];
  excludedFromHorizontalPivot = false;

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

      missingValueDisplayText: observable,
      setMissingValueDisplayText: action,

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

      normalForegroundColor: observable,
      setNormalForegroundColor: action,

      negativeForegroundColor: observable,
      setNegativeForegroundColor: action,

      zeroForegroundColor: observable,
      setZeroForegroundColor: action,

      errorForegroundColor: observable,
      setErrorForegroundColor: action,

      normalBackgroundColor: observable,
      setNormalBackgroundColor: action,

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

      linkLabelParameter: observable,
      setLinkLabelParameter: action,

      isUsingDefaultStyling: computed,
      useDefaultStyling: action,

      aggregateFunction: observable,
      setAggregateFunction: action,

      aggregateFunctionParameters: observable,
      setAggregateFunctionParameters: action,

      excludedFromHorizontalPivot: observable,
      setExcludedFromHorizontalPivot: action,
    });

    return configuration;
  }

  static createDefault(column: { name: string; type: string }) {
    return DataCubeMutableColumnConfiguration.create(
      DataCubeColumnConfiguration.serialization.toJson(
        buildDefaultColumnConfiguration(column),
      ),
    );
  }

  serialize() {
    return DataCubeColumnConfiguration.serialization.toJson(this);
  }

  get isUsingDefaultStyling() {
    return (
      this.fontFamily === undefined &&
      this.fontSize === undefined &&
      this.fontBold === undefined &&
      this.fontItalic === undefined &&
      this.fontUnderline === undefined &&
      this.fontStrikethrough === undefined &&
      this.textAlign === undefined &&
      this.normalForegroundColor === undefined &&
      this.negativeForegroundColor === undefined &&
      this.zeroForegroundColor === undefined &&
      this.errorForegroundColor === undefined &&
      this.normalBackgroundColor === undefined &&
      this.negativeBackgroundColor === undefined &&
      this.zeroBackgroundColor === undefined &&
      this.errorBackgroundColor === undefined
    );
  }

  useDefaultStyling() {
    this.fontFamily = undefined;
    this.fontSize = undefined;
    this.fontBold = undefined;
    this.fontItalic = undefined;
    this.fontUnderline = undefined;
    this.fontStrikethrough = undefined;
    this.textAlign = undefined;
    this.normalForegroundColor = undefined;
    this.negativeForegroundColor = undefined;
    this.zeroForegroundColor = undefined;
    this.errorForegroundColor = undefined;
    this.normalBackgroundColor = undefined;
    this.negativeBackgroundColor = undefined;
    this.zeroBackgroundColor = undefined;
    this.errorBackgroundColor = undefined;
  }

  setKind(value: DataCubeColumnKind) {
    this.kind = value;
  }

  setDisplayName(value: string | undefined) {
    this.displayName = value;
  }

  setDecimals(value: number | undefined) {
    this.decimals = value;
  }

  setDisplayCommas(value: boolean) {
    this.displayCommas = value;
  }

  setNegativeNumberInParens(value: boolean) {
    this.negativeNumberInParens = value;
  }

  setNumberScale(value: DataCubeNumberScale | undefined) {
    this.numberScale = value;
  }

  setMissingValueDisplayText(value: string | undefined) {
    this.missingValueDisplayText = value;
  }

  setHPivotSortFunction(value: string | undefined) {
    this.hPivotSortFunction = value;
  }

  setFontFamily(value: DataCubeFont | undefined) {
    this.fontFamily = value;
  }

  setFontSize(value: number | undefined) {
    this.fontSize = value;
  }

  setFontBold(value: boolean | undefined) {
    this.fontBold = value;
  }

  setFontItalic(value: boolean | undefined) {
    this.fontItalic = value;
  }

  setFontUnderline(value: DataCubeFontFormatUnderlineVariant | undefined) {
    this.fontUnderline = value;
  }

  setFontStrikethrough(value: boolean | undefined) {
    this.fontStrikethrough = value;
  }

  setFontCase(value: DataCubeFontCase | undefined) {
    this.fontCase = value;
  }

  setTextAlign(value: DataCubeFontTextAlignment | undefined) {
    this.textAlign = value;
  }

  setNormalForegroundColor(value: string | undefined) {
    this.normalForegroundColor = value;
  }

  setNegativeForegroundColor(value: string | undefined) {
    this.negativeForegroundColor = value;
  }

  setZeroForegroundColor(value: string | undefined) {
    this.zeroForegroundColor = value;
  }

  setErrorForegroundColor(value: string | undefined) {
    this.errorForegroundColor = value;
  }

  setNormalBackgroundColor(value: string | undefined) {
    this.normalBackgroundColor = value;
  }

  setNegativeBackgroundColor(value: string | undefined) {
    this.negativeBackgroundColor = value;
  }

  setZeroBackgroundColor(value: string | undefined) {
    this.zeroBackgroundColor = value;
  }

  setErrorBackgroundColor(value: string | undefined) {
    this.errorBackgroundColor = value;
  }

  setBlur(value: boolean) {
    this.blur = value;
  }

  setHideFromView(value: boolean) {
    this.hideFromView = value;
  }

  setFixedWidth(value: number | undefined) {
    this.fixedWidth = value;
  }

  setMinWidth(value: number | undefined) {
    this.minWidth = value;
  }

  setMaxWidth(value: number | undefined) {
    this.maxWidth = value;
  }

  setPinned(value: DataCubeColumnPinPlacement | undefined) {
    this.pinned = value;
  }

  setDisplayAsLink(value: boolean) {
    this.displayAsLink = value;
  }

  setLinkLabelParameter(value: string | undefined) {
    this.linkLabelParameter = value;
  }

  setAggregateFunction(value: DataCubeAggregateOperation | undefined) {
    this.aggregateFunction = value;
  }

  setExcludedFromHorizontalPivot(value: boolean) {
    this.excludedFromHorizontalPivot = value;
  }

  setAggregateFunctionParameters(value: DataCubeOperationValue[]) {
    this.aggregateFunctionParameters = value;
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

      normalForegroundColor: observable,
      setNormalForegroundColor: action,

      negativeForegroundColor: observable,
      setNegativeForegroundColor: action,

      zeroForegroundColor: observable,
      setZeroForegroundColor: action,

      errorForegroundColor: observable,
      setErrorForegroundColor: action,

      normalBackgroundColor: observable,
      setNormalBackgroundColor: action,

      negativeBackgroundColor: observable,
      setNegativeBackgroundColor: action,

      zeroBackgroundColor: observable,
      setZeroBackgroundColor: action,

      errorBackgroundColor: observable,
      setErrorBackgroundColor: action,

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

  get isUsingDefaultStyling() {
    return (
      this.fontFamily === DEFAULT_FONT_FAMILY &&
      this.fontSize === DEFAULT_FONT_SIZE &&
      this.fontBold === DEFAULT_FONT_BOLD &&
      this.fontItalic === DEFAULT_FONT_ITALIC &&
      this.fontUnderline === DEFAULT_FONT_UNDERLINED &&
      this.fontStrikethrough === DEFAULT_FONT_STRIKETHROUGH &&
      this.textAlign === DEFAULT_TEXT_ALIGN &&
      this.normalForegroundColor === DEFAULT_FOREGROUND_COLOR &&
      this.negativeForegroundColor === DEFAULT_NEGATIVE_FOREGROUND_COLOR &&
      this.zeroForegroundColor === DEFAULT_ZERO_FOREGROUND_COLOR &&
      this.errorForegroundColor === DEFAULT_ERROR_FOREGROUND_COLOR &&
      this.normalBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.negativeBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.zeroBackgroundColor === DEFAULT_BACKGROUND_COLOR &&
      this.errorBackgroundColor === DEFAULT_BACKGROUND_COLOR
    );
  }

  useDefaultStyling() {
    this.fontFamily = DEFAULT_FONT_FAMILY;
    this.fontSize = DEFAULT_FONT_SIZE;
    this.fontBold = DEFAULT_FONT_BOLD;
    this.fontItalic = DEFAULT_FONT_ITALIC;
    this.fontUnderline = DEFAULT_FONT_UNDERLINED;
    this.fontStrikethrough = DEFAULT_FONT_STRIKETHROUGH;
    this.textAlign = DEFAULT_TEXT_ALIGN;
    this.normalForegroundColor = DEFAULT_FOREGROUND_COLOR;
    this.negativeForegroundColor = DEFAULT_NEGATIVE_FOREGROUND_COLOR;
    this.zeroForegroundColor = DEFAULT_ZERO_FOREGROUND_COLOR;
    this.errorForegroundColor = DEFAULT_ERROR_FOREGROUND_COLOR;
    this.normalBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.negativeBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.zeroBackgroundColor = DEFAULT_BACKGROUND_COLOR;
    this.errorBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  }

  serialize() {
    return DataCubeConfiguration.serialization.toJson(this);
  }

  setDescription(value: string | undefined) {
    this.description = value;
  }

  setShowTreeLines(value: boolean) {
    this.showTreeLines = value;
  }

  setShowHorizontalGridLines(value: boolean) {
    this.showHorizontalGridLines = value;
  }

  setShowVerticalGridLines(value: boolean) {
    this.showVerticalGridLines = value;
  }

  setGridLineColor(value: string) {
    this.gridLineColor = value;
  }

  setFontFamily(value: DataCubeFont) {
    this.fontFamily = value;
  }

  setFontSize(value: number) {
    this.fontSize = value;
  }

  setFontBold(value: boolean) {
    this.fontBold = value;
  }

  setFontItalic(value: boolean) {
    this.fontItalic = value;
  }

  setFontUnderline(value: DataCubeFontFormatUnderlineVariant | undefined) {
    this.fontUnderline = value;
  }

  setFontStrikethrough(value: boolean) {
    this.fontStrikethrough = value;
  }

  setFontCase(value: DataCubeFontCase | undefined) {
    this.fontCase = value;
  }

  setTextAlign(value: DataCubeFontTextAlignment) {
    this.textAlign = value;
  }

  setNormalForegroundColor(value: string) {
    this.normalForegroundColor = value;
  }

  setNegativeForegroundColor(value: string) {
    this.negativeForegroundColor = value;
  }

  setZeroForegroundColor(value: string) {
    this.zeroForegroundColor = value;
  }

  setErrorForegroundColor(value: string) {
    this.errorForegroundColor = value;
  }

  setNormalBackgroundColor(value: string) {
    this.normalBackgroundColor = value;
  }

  setNegativeBackgroundColor(value: string) {
    this.negativeBackgroundColor = value;
  }

  setZeroBackgroundColor(value: string) {
    this.zeroBackgroundColor = value;
  }

  setErrorBackgroundColor(value: string) {
    this.errorBackgroundColor = value;
  }

  setAlternateRows(value: boolean) {
    this.alternateRows = value;
  }

  setAlternateRowsColor(value: string) {
    this.alternateRowsColor = value;
  }

  setAlternateRowsCount(value: number) {
    this.alternateRowsCount = value;
  }

  setAlternateRowsStandardMode(value: boolean) {
    this.alternateRowsStandardMode = value;
  }

  setSelectionStats(value: DataCubeSelectionStat[]) {
    this.selectionStats = value;
  }

  setShowWarningForTruncatedResult(value: boolean) {
    this.showWarningForTruncatedResult = value;
  }

  setInitialExpandLevel(value: number | undefined) {
    this.initialExpandLevel = value;
  }

  setShowRootAggregation(value: boolean) {
    this.showRootAggregation = value;
  }

  setShowLeafCount(value: boolean) {
    this.showLeafCount = value;
  }

  setAddPivotTotalColumn(value: boolean) {
    this.addPivotTotalColumn = value;
  }

  setAddPivotTotalColumnOnLeft(value: boolean) {
    this.addPivotTotalColumnOnLeft = value;
  }

  setTreeGroupSortFunction(value: string | undefined) {
    this.treeGroupSortFunction = value;
  }
}
