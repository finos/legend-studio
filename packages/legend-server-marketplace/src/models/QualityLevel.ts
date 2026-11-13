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

/** The tiers a data product or a data space is rated at, lowest being BRONZE. */
export enum QUALITY_LEVEL {
  DIAMOND = 'DIAMOND',
  PLATINUM = 'PLATINUM',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
}

const isQualityLevel = (value: unknown): value is QUALITY_LEVEL =>
  Object.values<unknown>(QUALITY_LEVEL).includes(value);

/**
 * The factory of a quality response's model schema. It rejects a response whose `qualityLevel`
 * is missing or is not one of the tiers, so a response never holds an unknown level. A property
 * deserializer would not do: serializr skips the properties a response leaves out.
 */
export const createQualityResponseFactory =
  <T extends { qualityLevel: QUALITY_LEVEL }>(create: () => T) =>
  (context: { readonly json: unknown }): T => {
    const json = context.json;
    const qualityLevel =
      typeof json === 'object' && json !== null && 'qualityLevel' in json
        ? json.qualityLevel
        : undefined;
    if (!isQualityLevel(qualityLevel)) {
      throw new Error(`Unrecognized quality level: ${String(qualityLevel)}`);
    }
    return create();
  };
