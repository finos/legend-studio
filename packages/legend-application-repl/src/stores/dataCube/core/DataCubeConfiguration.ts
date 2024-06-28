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
  type DataCubeNumberScale,
  type DataCubeSelectionStat,
} from './DataCubeQueryEngine.js';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';

export class DataCubeColumnConfiguration {
  name: string;
  type: string;

  kind: DataCubeColumnKind = DataCubeColumnKind.DIMENSION;
  displayName?: string | undefined;

  scaleNumber?: DataCubeNumberScale | undefined;
  decimals?: number | undefined;
  displayCommas = false;
  negativeNumberInParens = false;

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

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeColumnConfiguration, {
      backgroundColor: primitive(),
      backgroundErrorColor: primitive(),
      backgroundNegativeColor: primitive(),
      backgroundZeroColor: primitive(),
      decimals: optional(primitive()),
      displayCommas: primitive(),
      displayName: optional(primitive()),
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

  rowBuffer = DEFAULT__ROW_BUFFER;
  showWarningForTruncatedResult = true;

  initialExpandLevel?: number | undefined;
  showRootAggregation = true;
  showLeafCount = true;
  addPivotTotalColumn = true;
  addPivotTotalColumnOnLeft = true;
  treeGroupSortFunction?: string | undefined;

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
      scaleNumber: optional(primitive()),
      selectionStats: list(primitive()),
      showHorizontalGridLine: primitive(),
      showLeafCount: primitive(),
      showRootAggregation: primitive(),
      showTreeLine: primitive(),
      showVerticalGridLine: primitive(),
      showWarningForTruncatedResult: primitive(),
      treeGroupSortFunction: optional(primitive()),
    }),
  );
}
