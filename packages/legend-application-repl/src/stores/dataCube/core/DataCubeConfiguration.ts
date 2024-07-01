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
  DataCubeFontTextAlignment,
  DEFAULT_ROW_BUFFER,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
  type DataCubeFontFormatUnderlinedVariant,
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

  decimals?: number | undefined;
  displayCommas = false;
  negativeNumberInParens = false;
  numberScale?: DataCubeNumberScale | undefined;

  hPivotSortFunction?: string | undefined;

  fontFamily = DataCubeFont.ROBOTO;
  fontSize = 8;
  fontBold = false;
  fontItalic = false;
  fontUnderlined?: DataCubeFontFormatUnderlinedVariant | undefined = undefined;
  fontStrikethrough = false;
  textAlign = DataCubeFontTextAlignment.LEFT;
  foregroundColor = TailwindCSSPalette.black;
  foregroundNegativeColor = DEFAULT_NEGATIVE_FOREGROUND_COLOR;
  foregroundZeroColor = DEFAULT_ZERO_FOREGROUND_COLOR;
  foregroundErrorColor = DEFAULT_ERROR_FOREGROUND_COLOR;
  backgroundColor = DEFAULT_BACKGROUND_COLOR;
  backgroundNegativeColor = DEFAULT_BACKGROUND_COLOR;
  backgroundZeroColor = DEFAULT_BACKGROUND_COLOR;
  backgroundErrorColor = DEFAULT_BACKGROUND_COLOR;

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
      fontStrikethrough: primitive(),
      fontUnderlined: optional(primitive()),
      hPivotSortFunction: optional(primitive()),
      kind: primitive(),
      name: primitive(),
      negativeNumberInParens: primitive(),
      numberScale: optional(primitive()),
      textAlign: primitive(),
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
  defaultFontSize = 12;
  defaultFontBold = false;
  defaultFontItalic = false;
  defaultFontUnderlined?: DataCubeFontFormatUnderlinedVariant | undefined =
    undefined;
  defaultFontStrikethrough = false;
  defaultTextAlign = DataCubeFontTextAlignment.LEFT;
  defaultForegroundColor = DEFAULT_FOREGROUND_COLOR;
  defaultForegroundNegativeColor = DEFAULT_NEGATIVE_FOREGROUND_COLOR;
  defaultForegroundZeroColor = DEFAULT_ZERO_FOREGROUND_COLOR;
  defaultForegroundErrorColor = DEFAULT_ERROR_FOREGROUND_COLOR;
  defaultBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  defaultBackgroundNegativeColor = DEFAULT_BACKGROUND_COLOR;
  defaultBackgroundZeroColor = DEFAULT_BACKGROUND_COLOR;
  defaultBackgroundErrorColor = DEFAULT_BACKGROUND_COLOR;
  alternateRows = false;
  alternateRowsColor = DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR;
  alternateRowsCount = 1;

  // manualRefresh: boolean;
  numberScale?: DataCubeNumberScale | undefined;
  selectionStats: DataCubeSelectionStat[] = [];

  showWarningForTruncatedResult = true;

  // aggregatio
  initialExpandLevel?: number | undefined;
  showRootAggregation = false;
  showLeafCount = true;
  addPivotTotalColumn = true;
  addPivotTotalColumnOnLeft = true;
  treeGroupSortFunction?: string | undefined;

  // advanced
  rowBuffer = DEFAULT_ROW_BUFFER;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeConfiguration, {
      addPivotTotalColumn: primitive(),
      addPivotTotalColumnOnLeft: primitive(),
      alternateRows: primitive(),
      alternateRowsColor: primitive(),
      alternateRowsCount: primitive(),
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
      defaultFontStrikethrough: primitive(),
      defaultFontUnderlined: optional(primitive()),
      defaultForegroundColor: primitive(),
      defaultForegroundErrorColor: primitive(),
      defaultForegroundNegativeColor: primitive(),
      defaultForegroundZeroColor: primitive(),
      defaultTextAlign: primitive(),
      description: optional(primitive()),
      initialExpandLevel: optional(primitive()),

      numberScale: optional(primitive()),
      rowBuffer: primitive(),
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
