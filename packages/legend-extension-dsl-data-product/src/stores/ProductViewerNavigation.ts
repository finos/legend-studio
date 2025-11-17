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

import { NAVIGATION_ZONE_SEPARATOR } from '@finos/legend-application';
import type { DiagramAnalysisResult } from '@finos/legend-extension-dsl-diagram';

export enum DATA_PRODUCT_VIEWER_SECTION {
  DATA_ACCESS = 'data-access',
  DESCRIPTION = 'description',
  DIAGRAM_VIEWER = 'diagram-viewer',
  MODELS_DOCUMENTATION = 'models-documentation',
  SUPPORT_INFO = 'support-info',
  VENDOR_DATA = 'vendor-data',
}

export enum TERMINAL_PRODUCT_VIEWER_SECTION {
  DESCRIPTION = 'description',
  PRICE = 'price',
}

const generateAnchorChunk = (text: string): string =>
  encodeURIComponent(
    text
      .trim()
      .toLowerCase() // anchor is case-insensitive
      .replace(/\s+/gu, '-'), // spaces will be replaced by hyphens
  );

export const generateAnchorForSection = (activity: string): string =>
  generateAnchorChunk(activity);

export const DATA_PRODUCT_VIEWER_ANCHORS = Object.values(
  DATA_PRODUCT_VIEWER_SECTION,
).map((activity) => generateAnchorForSection(activity));

export const TERMINAL_PRODUCT_VIEWER_ANCHORS = Object.values(
  TERMINAL_PRODUCT_VIEWER_SECTION,
).map((activity) => generateAnchorForSection(activity));

export const extractSectionFromAnchor = (anchor: string): string =>
  decodeURIComponent(anchor);

export const generateAnchorForDiagram = (
  diagram: DiagramAnalysisResult,
): string =>
  [
    DATA_PRODUCT_VIEWER_SECTION.DIAGRAM_VIEWER,
    generateAnchorChunk(diagram.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);
