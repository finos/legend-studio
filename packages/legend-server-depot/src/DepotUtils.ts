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
/**
 * NOTE: `HEAD` alias does not exist in depot server
 * instead, it uses `master-SNAPSHOT` which to us is not generic enough.
 */
export const SNAPSHOT_VERSION_ALIAS = 'HEAD';
export const LATEST_VERSION_ALIAS = 'latest';

export interface ProjectGAVCoordinates {
  groupId: string;
  artifactId: string;
  versionId: string;
}

export const generateGAVCoordinates = (
  groupId: string,
  artifactId: string,
  versionId: string | undefined,
): string =>
  [groupId, artifactId, versionId].filter(isNonNullable).join(GAV_DELIMITER);

export const parseGACoordinates = (
  ga: string,
): {
  groupId: string;
  artifactId: string;
} => {
  const parts = ga.split(GAV_DELIMITER);
  assertTrue(
    parts.length === 3,
    `Can't parse GA coordinates '${ga}': expect the coordinates to follow format {groupID}${GAV_DELIMITER}{artifactID}`,
  );
  return {
    groupId: guaranteeNonEmptyString(
      parts[0]?.trim(),
      `GAV coordinate group ID is missing or empty`,
    ),
    artifactId: guaranteeNonEmptyString(
      parts[1]?.trim(),
      `GAV coordinate artifact ID is missing or empty`,
    ),
  };
};

export const parseGAVCoordinates = (
  gav: string,
): {
  groupId: string;
  artifactId: string;
  versionId: string;
} => {
  const parts = gav.split(GAV_DELIMITER);
  assertTrue(
    parts.length === 3,
    `Can't parse GAV coordinates '${gav}': expect the coordinates to follow format {groupID}${GAV_DELIMITER}{artifactID}${GAV_DELIMITER}{versionId}`,
  );
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

/**
 * Compare SemVer versions.
 *
 * NOTE: SemVer could have been the perfect library to use here but we can't use it since it's meant for `Node` only
 * `compare-versions` works for browser but seems way overkill, especially when the version format is very
 * standard, i.e. `x.y.z`, no prerelease, etc.
 * As such, we can use the lean comparison algo using `localeCompare` with numeric settings
 *
 * See https://stackoverflow.com/questions/55466274/simplify-semver-version-compare-logic/55466325#55466325
 * See omichelsen/compare-versions#45
 */
export const compareSemVerVersions = (val1: string, val2: string): number =>
  // TODO: verify if the version match certain patterns
  val1.localeCompare(val2, undefined, { numeric: true });
