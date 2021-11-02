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
  assertTrue,
  guaranteeNonEmptyString,
  isNonNullable,
} from '@finos/legend-shared';

export const GAV_DELIMITER = ':';

export const generateGAVCoordinates = (
  groupId: string,
  artifactId: string,
  versionId: string | undefined,
): string =>
  [groupId, artifactId, versionId].filter(isNonNullable).join(GAV_DELIMITER);

export const parseGAVCoordinates = (
  gav: string,
): {
  groupId: string;
  artifactId: string;
  versionId: string;
} => {
  const parts = gav.split(GAV_DELIMITER);
  assertTrue(parts.length === 3, `Can't parse GAV coordinate '${gav}'`);
  return {
    groupId: guaranteeNonEmptyString(
      parts[0]?.trim(),
      `GAV coordinate group ID is missing or empty`,
    ),
    artifactId: guaranteeNonEmptyString(
      parts[1]?.trim(),
      `GAV coordinate artifact ID is missing or empty`,
    ),
    versionId: guaranteeNonEmptyString(
      parts[2]?.trim(),
      `GAV coordinate version ID is missing or empty`,
    ),
  };
};
