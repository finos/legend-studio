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
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
  DEFAULT_GRID_LINE_COLOR,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_BOLD,
  DEFAULT_FONT_ITALIC,
  DEFAULT_FONT_STRIKETHROUGH,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_FONT_UNDERLINED,
  DEFAULT_FONT_CASE,
  DataCubeColumnKind,
  type DataCubeFont,
  type DataCubeFontTextAlignment,
  type DataCubeFontFormatUnderlineVariant,
  type DataCubeNumberScale,
  type DataCubeSelectionStat,
  type DataCubeColumnPinPlacement,
  type DataCubeFontCase,
} from './DataCubeQueryEngine.js';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';

export type DataCubeConfigurationColorKey =
  | 'normal'
  | 'zero'
  | 'negative'
  | 'error';

export class DataCubeColumnConfiguration {
  name: string;
  type: string;

  kind: DataCubeColumnKind = DataCubeColumnKind.DIMENSION;
  displayName?: string | undefined;

  decimals?: number | undefined;
  displayCommas = false;
  negativeNumberInParens = false;
  numberScale?: DataCubeNumberScale | undefined;
  missingValueDisplayText?: string | undefined;

  hPivotSortFunction?: string | undefined;

  fontFamily?: DataCubeFont | undefined;
  fontSize?: number | undefined;
  fontBold?: boolean | undefined;
  fontItalic?: boolean | undefined;
  fontUnderline?: DataCubeFontFormatUnderlineVariant | undefined;
  fontStrikethrough?: boolean | undefined;
  fontCase?: DataCubeFontCase | undefined;
  textAlign?: DataCubeFontTextAlignment | undefined;
  normalForegroundColor?: string | undefined;
  negativeForegroundColor?: string | undefined;
  zeroForegroundColor?: string | undefined;
  errorForegroundColor?: string | undefined;
  normalBackgroundColor?: string | undefined;
  negativeBackgroundColor?: string | undefined;
  zeroBackgroundColor?: string | undefined;
  errorBackgroundColor?: string | undefined;

  blur = false;
  hideFromView = false;

  fixedWidth?: number | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  pinned?: DataCubeColumnPinPlacement | undefined;
  displayAsLink = false;
  linkLabelParameter?: string | undefined;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeColumnConfiguration, {
      blur: primitive(),
      decimals: optional(primitive()),
      displayAsLink: primitive(),
      displayCommas: primitive(),
      displayName: optional(primitive()),
      errorBackgroundColor: optional(primitive()),
      errorForegroundColor: optional(primitive()),
      fixedWidth: optional(primitive()),
      fontBold: optional(primitive()),
      fontCase: optional(primitive()),
      fontFamily: optional(primitive()),
      fontItalic: optional(primitive()),
      fontSize: optional(primitive()),
      fontStrikethrough: optional(primitive()),
      fontUnderline: optional(primitive()),
      hideFromView: primitive(),
      hPivotSortFunction: optional(primitive()),
      kind: primitive(),
      linkLabelParameter: optional(primitive()),
      maxWidth: optional(primitive()),
      minWidth: optional(primitive()),
      missingValueDisplayText: optional(primitive()),
      name: primitive(),
      negativeBackgroundColor: optional(primitive()),
      negativeForegroundColor: optional(primitive()),
      normalBackgroundColor: optional(primitive()),
      normalForegroundColor: optional(primitive()),
      negativeNumberInParens: primitive(),
      numberScale: optional(primitive()),
      pinned: optional(primitive()),
      textAlign: optional(primitive()),
      type: primitive(),
      zeroBackgroundColor: optional(primitive()),
      zeroForegroundColor: optional(primitive()),
    }),
  );
}

export class DataCubeConfiguration {
  description?: string | undefined;
  columns: DataCubeColumnConfiguration[] = [];

  showTreeLines = false;
  showHorizontalGridLines = false;
  showVerticalGridLines = true;
  gridLineColor = DEFAULT_GRID_LINE_COLOR;

  fontFamily = DEFAULT_FONT_FAMILY;
  fontSize = DEFAULT_FONT_SIZE;
  fontBold = DEFAULT_FONT_BOLD;
  fontItalic = DEFAULT_FONT_ITALIC;
  fontUnderline?: DataCubeFontFormatUnderlineVariant | undefined =
    DEFAULT_FONT_UNDERLINED;
  fontStrikethrough = DEFAULT_FONT_STRIKETHROUGH;
  fontCase?: DataCubeFontCase | undefined = DEFAULT_FONT_CASE;
  textAlign = DEFAULT_TEXT_ALIGN;
  normalForegroundColor = DEFAULT_FOREGROUND_COLOR;
  negativeForegroundColor = DEFAULT_NEGATIVE_FOREGROUND_COLOR;
  zeroForegroundColor = DEFAULT_ZERO_FOREGROUND_COLOR;
  errorForegroundColor = DEFAULT_ERROR_FOREGROUND_COLOR;
  normalBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  negativeBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  zeroBackgroundColor = DEFAULT_BACKGROUND_COLOR;
  errorBackgroundColor = DEFAULT_BACKGROUND_COLOR;

  alternateRows = false;
  alternateRowsStandardMode = true;
  alternateRowsColor = DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR;
  alternateRowsCount = 1;

  // aggregation
  initialExpandLevel?: number | undefined;
  showRootAggregation = false;
  showLeafCount = false;
  addPivotTotalColumn = true;
  addPivotTotalColumnOnLeft = true;
  treeGroupSortFunction?: string | undefined;

  // misc
  selectionStats: DataCubeSelectionStat[] = [];
  showWarningForTruncatedResult = true;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeConfiguration, {
      addPivotTotalColumn: primitive(),
      addPivotTotalColumnOnLeft: primitive(),
      alternateRows: primitive(),
      alternateRowsColor: primitive(),
      alternateRowsCount: primitive(),
      alternateRowsStandardMode: primitive(),
      columns: list(
        usingModelSchema(DataCubeColumnConfiguration.serialization.schema),
      ),
      errorBackgroundColor: primitive(),
      errorForegroundColor: primitive(),
      description: optional(primitive()),
      fontBold: primitive(),
      fontCase: optional(primitive()),
      fontFamily: primitive(),
      fontItalic: primitive(),
      fontSize: primitive(),
      fontStrikethrough: primitive(),
      fontUnderline: optional(primitive()),
      gridLineColor: primitive(),
      initialExpandLevel: optional(primitive()),
      negativeBackgroundColor: primitive(),
      negativeForegroundColor: primitive(),
      normalBackgroundColor: primitive(),
      normalForegroundColor: primitive(),
      selectionStats: list(primitive()),
      showHorizontalGridLines: primitive(),
      showLeafCount: primitive(),
      showRootAggregation: primitive(),
      showTreeLines: primitive(),
      showVerticalGridLines: primitive(),
      showWarningForTruncatedResult: primitive(),
      textAlign: primitive(),
      treeGroupSortFunction: optional(primitive()),
      zeroBackgroundColor: primitive(),
      zeroForegroundColor: primitive(),
    }),
  );
}
