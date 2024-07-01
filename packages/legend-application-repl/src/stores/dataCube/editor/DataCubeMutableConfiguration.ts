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

import type {
  DataCubeColumnKind,
  DataCubeFont,
  DataCubeAggregateFunction,
  DataCubeNumberScale,
  DataCubeSelectionStat,
  DataCubeFontFormatUnderlinedVariant,
  DataCubeFontTextAlignment,
} from '../core/DataCubeQueryEngine.js';
import { type PlainObject } from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';

export class DataCubeMutableColumnConfiguration extends DataCubeColumnConfiguration {
  aggregateFunction?: DataCubeAggregateFunction | undefined;
  weightColumn?: string | undefined;
  excludeFromHPivot = true;

  static create(
    name: string,
    type: string,
    json: PlainObject<DataCubeColumnConfiguration>,
  ): DataCubeMutableColumnConfiguration {
    const configuration = Object.assign(
      new DataCubeMutableColumnConfiguration(name, type),
      DataCubeColumnConfiguration.serialization.fromJson(json),
    );

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

      fontUnderlined: observable,
      setFontUnderlined: action,

      fontStrikethrough: observable,
      setFontStrikethrough: action,

      textAlign: observable,
      setTextAlign: action,

      foregroundColor: observable,
      setForegroundColor: action,

      foregroundNegativeColor: observable,
      setForegroundNegativeColor: action,

      foregroundZeroColor: observable,
      setForegroundZeroColor: action,

      foregroundErrorColor: observable,
      setForegroundErrorColor: action,

      backgroundColor: observable,
      setBackgroundColor: action,

      backgroundNegativeColor: observable,
      setBackgroundNegativeColor: action,

      backgroundZeroColor: observable,
      setBackgroundZeroColor: action,

      backgroundErrorColor: observable,
      setBackgroundErrorColor: action,

      blur: observable,
      setBlur: action,

      hideFromView: observable,
      setHideFromView: action,

      aggregateFunction: observable,
      setAggregateFunction: action,

      weightColumn: observable,
      setWeightColumn: action,

      excludeFromHPivot: observable,
      setExcludeFromHPivot: action,
    });

    return configuration;
  }

  serialize(): PlainObject<DataCubeColumnConfiguration> {
    return DataCubeColumnConfiguration.serialization.toJson(this);
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

  setFontFamily(value: DataCubeFont): void {
    this.fontFamily = value;
  }

  setFontSize(value: number): void {
    this.fontSize = value;
  }

  setFontBold(value: boolean): void {
    this.fontBold = value;
  }

  setFontItalic(value: boolean): void {
    this.fontItalic = value;
  }

  setFontUnderlined(
    value: DataCubeFontFormatUnderlinedVariant | undefined,
  ): void {
    this.fontUnderlined = value;
  }

  setTextAlign(value: DataCubeFontTextAlignment): void {
    this.textAlign = value;
  }

  setFontStrikethrough(value: boolean): void {
    this.fontStrikethrough = value;
  }

  setForegroundColor(value: string): void {
    this.foregroundColor = value;
  }

  setForegroundNegativeColor(value: string): void {
    this.foregroundNegativeColor = value;
  }

  setForegroundZeroColor(value: string): void {
    this.foregroundZeroColor = value;
  }

  setForegroundErrorColor(value: string): void {
    this.foregroundErrorColor = value;
  }

  setBackgroundColor(value: string): void {
    this.backgroundColor = value;
  }

  setBackgroundNegativeColor(value: string): void {
    this.backgroundNegativeColor = value;
  }

  setBackgroundZeroColor(value: string): void {
    this.backgroundZeroColor = value;
  }

  setBackgroundErrorColor(value: string): void {
    this.backgroundErrorColor = value;
  }

  setBlur(value: boolean): void {
    this.blur = value;
  }

  setHideFromView(value: boolean): void {
    this.hideFromView = value;
  }

  setAggregateFunction(value: DataCubeAggregateFunction | undefined): void {
    this.aggregateFunction = value;
  }

  setWeightColumn(value: string | undefined): void {
    this.weightColumn = value;
  }

  setExcludeFromHPivot(value: boolean): void {
    this.excludeFromHPivot = value;
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

      showTreeLine: observable,
      setShowTreeLine: action,

      showHorizontalGridLine: observable,
      setShowHorizontalGridLine: action,

      showVerticalGridLine: observable,
      setShowVerticalGridLine: action,

      defaultFontFamily: observable,
      setDefaultFontFamily: action,

      defaultFontSize: observable,
      setDefaultFontSize: action,

      defaultFontBold: observable,
      setDefaultFontBold: action,

      defaultFontItalic: observable,
      setDefaultFontItalic: action,

      defaultFontUnderlined: observable,
      setDefaultFontUnderlined: action,

      defaultFontStrikethrough: observable,
      setDefaultFontStrikethrough: action,

      defaultTextAlign: observable,
      setDefaultTextAlign: action,

      defaultForegroundColor: observable,
      setDefaultForegroundColor: action,

      defaultForegroundNegativeColor: observable,
      setDefaultForegroundNegativeColor: action,

      defaultForegroundZeroColor: observable,
      setDefaultForegroundZeroColor: action,

      defaultForegroundErrorColor: observable,
      setDefaultForegroundErrorColor: action,

      defaultBackgroundColor: observable,
      setDefaultBackgroundColor: action,

      defaultBackgroundNegativeColor: observable,
      setDefaultBackgroundNegativeColor: action,

      defaultBackgroundZeroColor: observable,
      setDefaultBackgroundZeroColor: action,

      defaultBackgroundErrorColor: observable,
      setDefaultBackgroundErrorColor: action,

      alternateRows: observable,
      setAlternateRows: action,

      alternateRowsColor: observable,
      setAlternateRowsColor: action,

      alternateRowsCount: observable,
      setAlternateRowsCount: action,

      numberScale: observable,
      setNumberScale: action,

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
    });

    return configuration;
  }

  serialize(): PlainObject<DataCubeConfiguration> {
    return DataCubeConfiguration.serialization.toJson(this);
  }

  setDescription(value: string | undefined): void {
    this.description = value;
  }

  setShowTreeLine(value: boolean): void {
    this.showTreeLine = value;
  }

  setShowHorizontalGridLine(value: boolean): void {
    this.showHorizontalGridLine = value;
  }

  setShowVerticalGridLine(value: boolean): void {
    this.showVerticalGridLine = value;
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

  setDefaultFontUnderlined(
    value: DataCubeFontFormatUnderlinedVariant | undefined,
  ): void {
    this.defaultFontUnderlined = value;
  }

  setDefaultFontStrikethrough(value: boolean): void {
    this.defaultFontStrikethrough = value;
  }

  setDefaultTextAlign(value: DataCubeFontTextAlignment): void {
    this.defaultTextAlign = value;
  }

  setDefaultForegroundColor(value: string): void {
    this.defaultForegroundColor = value;
  }

  setDefaultForegroundNegativeColor(value: string): void {
    this.defaultForegroundNegativeColor = value;
  }

  setDefaultForegroundZeroColor(value: string): void {
    this.defaultForegroundZeroColor = value;
  }

  setDefaultForegroundErrorColor(value: string): void {
    this.defaultForegroundErrorColor = value;
  }

  setDefaultBackgroundColor(value: string): void {
    this.defaultBackgroundColor = value;
  }

  setDefaultBackgroundNegativeColor(value: string): void {
    this.defaultBackgroundNegativeColor = value;
  }

  setDefaultBackgroundZeroColor(value: string): void {
    this.defaultBackgroundZeroColor = value;
  }

  setDefaultBackgroundErrorColor(value: string): void {
    this.defaultBackgroundErrorColor = value;
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

  setNumberScale(value: DataCubeNumberScale | undefined): void {
    this.numberScale = value;
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
