/**
 * Copyright (c) 2026-present, Goldman Sachs
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

export const GENERIC_CARD_IMAGE_COUNT = 20;

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Keyed on something stable about the card so the same entry always draws the
 * same artwork rather than shuffling between renders.
 */
export const getGenericCardImageIndex = (key: string): number =>
  hashString(key) % GENERIC_CARD_IMAGE_COUNT;

export const buildGenericCardImageUrl = (index: number): string =>
  `/assets/images${(index % GENERIC_CARD_IMAGE_COUNT) + 1}.jpg`;

/**
 * Vendor artwork wins over the generic images, matched on the vendor name being
 * present anywhere in the key the card carries.
 */
export const findVendorImageUrl = (
  vendorImageMap: ReadonlyMap<string, string>,
  key: string,
): string | undefined => {
  const upperCaseKey = key.toUpperCase();
  for (const [vendorName, imageUrl] of vendorImageMap) {
    if (upperCaseKey.includes(vendorName.toUpperCase())) {
      return imageUrl;
    }
  }
  return undefined;
};
