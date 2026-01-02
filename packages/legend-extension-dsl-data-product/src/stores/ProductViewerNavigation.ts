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

export enum TERMINAL_PRODUCT_VIEWER_SECTION {
  DESCRIPTION = 'description',
  PRICE = 'price',
}

export enum DATA_PRODUCT_DEFAULT_SECTION {
  DATA_ACCESS = 'data-access',
  DESCRIPTION = 'description',
  SUPPORT_INFO = 'support-info',
}

export enum DATA_PRODUCT_MODELAPG_SECTION {
  DIAGRAM_VIEWER = 'diagram-viewer',
  MODELS_DOCUMENTATION = 'models-documentation',
}

export enum DATA_PRODUCT_VDP_SECTION {
  VENDOR_DATA = 'vendor-data',
}

export const DATA_PRODUCT_VIEWER_SECTION = {
  ...DATA_PRODUCT_DEFAULT_SECTION,
  ...DATA_PRODUCT_VDP_SECTION,
  ...DATA_PRODUCT_MODELAPG_SECTION,
};

const generateAnchorChunk = (text: string): string =>
  encodeURIComponent(
    text
      .trim()
      .toLowerCase() // anchor is case-insensitive
      .replace(/\s+/gu, '-'), // spaces will be replaced by hyphens
  );

export const generateAnchorForSection = (activity: string): string =>
  generateAnchorChunk(activity);

export const generateAnchorsFromSections = (
  sections: readonly string[],
): string[] => {
  return sections.map((section) => generateAnchorForSection(section));
};

export const DATA_PRODUCT_VIEWER_ANCHORS = generateAnchorsFromSections(
  Object.values(DATA_PRODUCT_VIEWER_SECTION),
);

export const DATA_PRODUCT_VDP_ANCHORS = generateAnchorsFromSections(
  Object.values(DATA_PRODUCT_VDP_SECTION),
);

export const DATA_PRODUCT_DEFAULT_ANCHORS = generateAnchorsFromSections(
  Object.values(DATA_PRODUCT_DEFAULT_SECTION),
);

export const DATA_PRODUCT_MODELAPG_ANCHORS = generateAnchorsFromSections(
  Object.values(DATA_PRODUCT_MODELAPG_SECTION),
);

export const TERMINAL_PRODUCT_VIEWER_ANCHORS = generateAnchorsFromSections(
  Object.values(TERMINAL_PRODUCT_VIEWER_SECTION),
);
export const extractSectionFromAnchor = (anchor: string): string =>
  decodeURIComponent(anchor);

export const generateAnchorForDiagram = (
  diagram: DiagramAnalysisResult,
): string =>
  [
    DATA_PRODUCT_MODELAPG_SECTION.DIAGRAM_VIEWER,
    generateAnchorChunk(diagram.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);
