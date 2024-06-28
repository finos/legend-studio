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

import { TailwindCSSPalette } from '@finos/legend-art';
import {
  DataCubeColumnKind,
  DataCubeFont,
  DEFAULT__ROW_BUFFER,
  type DataCubeAggregateFunction,
  type DataCubeNumberScale,
  type DataCubeSelectionStat,
} from '../../stores/dataCube/core/DataCubeQueryEngine.js';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';
import { makeObservable, observable, action } from 'mobx';

export class DataCubeColumnConfiguration {
  name: string;
  type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }

  kind: DataCubeColumnKind = DataCubeColumnKind.DIMENSION;
  displayName?: string | undefined;

  scaleNumber?: DataCubeNumberScale | undefined;
  decimals?: number | undefined;
  displayCommas = false;
  negativeNumberInParens = false;

  aggregateFunction?: DataCubeAggregateFunction | undefined;
  // weightColumn?: string;
  excludeFromHPivot = true;
  hPivotSortFunction?: string | undefined;

  fontFamily = DataCubeFont.ROBOTO;
  fontSize = 8;
  fontBold = false;
  fontItalic = false;
  foregroundColor = TailwindCSSPalette.black;
  foregroundNegativeColor = TailwindCSSPalette.red[500];
  foregroundZeroColor = TailwindCSSPalette.neutral[400];
  foregroundErrorColor = TailwindCSSPalette.blue[600];
  backgroundColor = TailwindCSSPalette.black;
  backgroundNegativeColor = TailwindCSSPalette.white;
  backgroundZeroColor = TailwindCSSPalette.white;
  backgroundErrorColor = TailwindCSSPalette.white;

  blur = false;
  hideFromView = false;

  setName(value: string): void {
    this.name = value;
  }

  setType(value: string): void {
    this.type = value;
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

  setScaleNumber(value: DataCubeNumberScale | undefined): void {
    this.scaleNumber = value;
  }

  setAggregateFunction(value: DataCubeAggregateFunction | undefined): void {
    this.aggregateFunction = value;
  }

  setExcludeFromHPivot(value: boolean): void {
    this.excludeFromHPivot = value;
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

  observe(): DataCubeColumnConfiguration {
    return makeObservable(this, {
      name: observable,
      setName: action,

      type: observable,
      setType: action,

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

      scaleNumber: observable,
      setScaleNumber: action,

      aggregateFunction: observable,
      setAggregateFunction: action,

      excludeFromHPivot: observable,
      setExcludeFromHPivot: action,

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
    });
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeColumnConfiguration, {
      aggregateFunction: optional(primitive()),
      backgroundColor: primitive(),
      backgroundErrorColor: primitive(),
      backgroundNegativeColor: primitive(),
      backgroundZeroColor: primitive(),
      decimals: optional(primitive()),
      displayCommas: primitive(),
      displayName: optional(primitive()),
      excludeFromHPivot: primitive(),
      foregroundColor: primitive(),
      foregroundErrorColor: primitive(),
      foregroundNegativeColor: primitive(),
      foregroundZeroColor: primitive(),
      fontBold: primitive(),
      fontFamily: primitive(),
      fontItalic: primitive(),
      fontSize: primitive(),
      hPivotSortFunction: optional(primitive()),
      kind: primitive(),
      negativeNumberInParens: primitive(),
      name: primitive(),
      scaleNumber: optional(primitive()),
      type: primitive(),
      // weightColumn?: optional(primitive()),
    }),
  );
}

export class DataCubeConfiguration {
  description?: string | undefined;
  columns: DataCubeColumnConfiguration[] = [];

  showTreeLine = true;
  showHorizontalGridLine = false;
  showVerticalGridLine = false;
  defaultFontFamily = DataCubeFont.ROBOTO;
  defaultFontSize = 8;
  defaultFontBold = false;
  defaultFontItalic = false;
  defaultForegroundColor = TailwindCSSPalette.black;
  defaultForegroundNegativeColor = TailwindCSSPalette.red[500];
  defaultForegroundZeroColor = TailwindCSSPalette.neutral[400];
  defaultForegroundErrorColor = TailwindCSSPalette.blue[600];
  defaultBackgroundColor = TailwindCSSPalette.black;
  defaultBackgroundNegativeColor = TailwindCSSPalette.white;
  defaultBackgroundZeroColor = TailwindCSSPalette.white;
  defaultBackgroundErrorColor = TailwindCSSPalette.white;
  alternateColor = TailwindCSSPalette.sky[100];
  alternateColorSkippedRowsCount = 1;

  // manualRefresh: boolean;
  scaleNumber?: DataCubeNumberScale | undefined;
  selectionStats: DataCubeSelectionStat[] = [];

  rowLimit = -1;
  rowBuffer = DEFAULT__ROW_BUFFER;
  showWarningForTruncatedResult = true;

  initialExpandLevel?: number | undefined;
  showRootAggregation = true;
  showLeafCount = true;
  addPivotTotalColumn = true;
  addPivotTotalColumnOnLeft = true;
  treeGroupSortFunction?: string | undefined;

  setColumns(value: DataCubeColumnConfiguration[]): void {
    this.columns = value;
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

  setAlternateColor(value: string): void {
    this.alternateColor = value;
  }

  setAlternateColorSkippedRowsCount(value: number): void {
    this.alternateColorSkippedRowsCount = value;
  }

  setScaleNumber(value: DataCubeNumberScale | undefined): void {
    this.scaleNumber = value;
  }

  setSelectionStats(value: DataCubeSelectionStat[]): void {
    this.selectionStats = value;
  }

  setRowLimit(value: number): void {
    this.rowLimit = value;
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

  observe(): DataCubeConfiguration {
    makeObservable(this, {
      description: observable,
      columns: observable,

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

      alternateColor: observable,
      setAlternateColor: action,

      alternateColorSkippedRowsCount: observable,
      setAlternateColorSkippedRowsCount: action,

      scaleNumber: observable,
      setScaleNumber: action,

      selectionStats: observable,
      setSelectionStats: action,

      rowLimit: observable,
      setRowLimit: action,

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

    this.columns.forEach((column) => column.observe());

    return this;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeConfiguration, {
      addPivotTotalColumn: primitive(),
      addPivotTotalColumnOnLeft: primitive(),
      alternateColor: primitive(),
      alternateColorSkippedRowsCount: primitive(),
      columns: list(
        usingModelSchema(DataCubeColumnConfiguration.serialization.schema),
      ),
      defaultBackgroundColor: primitive(),
      defaultBackgroundErrorColor: primitive(),
      defaultBackgroundNegativeColor: primitive(),
      defaultBackgroundZeroColor: primitive(),
      defaultFontBold: primitive(),
      defaultFontFamily: primitive(),
      defaultFontItalic: primitive(),
      defaultFontSize: primitive(),
      defaultForegroundColor: primitive(),
      defaultForegroundErrorColor: primitive(),
      defaultForegroundNegativeColor: primitive(),
      defaultForegroundZeroColor: primitive(),
      description: optional(primitive()),
      initialExpandLevel: optional(primitive()),

      rowBuffer: primitive(),
      rowLimit: primitive(),
      scaleNumber: optional(primitive()),
      selectionStats: list(primitive()),
      showHorizontalGridLine: primitive(),
      showLeafCount: primitive(),
      showRootAggregation: primitive(),
      showTreeLine: primitive(),
      showVerticalGridLine: primitive(),
      showWarningForTruncatedResult: primitive(),
      treeGroupSortFunction: primitive(),
    }),
  );
}
