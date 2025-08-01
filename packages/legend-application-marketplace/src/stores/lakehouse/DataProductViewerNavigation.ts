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

export enum DATA_PRODUCT_VIEWER_SECTION { //rename or make new enum for terminals?
  DESCRIPTION = 'description',
  DATA_ACCESS = 'data-access',
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
export const extractSectionFromAnchor = (anchor: string): string =>
  decodeURIComponent(anchor);
