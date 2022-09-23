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
  AssertionError,
  assertTrue,
  guaranteeNonEmptyString,
  isNonNullable,
  parseNumber,
  returnUndefOnError,
} from '@finos/legend-shared';

export const GAV_DELIMITER = ':';

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
    parts.length === 2,
    `Can't parse GA coordinates '${ga}': expect the coordinates to follow format {groupID}${GAV_DELIMITER}{artifactID}`,
  );
  return {
    groupId: guaranteeNonEmptyString(
      parts[0]?.trim(),
      `GAV coordinates group ID is missing or empty`,
    ),
    artifactId: guaranteeNonEmptyString(
      parts[1]?.trim(),
      `GAV coordinates artifact ID is missing or empty`,
    ),
  };
};

export const parseGAVCoordinates = (gav: string): ProjectGAVCoordinates => {
  const parts = gav.split(GAV_DELIMITER);
  assertTrue(
    parts.length === 3,
    `Can't parse GAV coordinates '${gav}': expect the coordinates to follow format {groupID}${GAV_DELIMITER}{artifactID}${GAV_DELIMITER}{versionId}`,
  );
  return {
    groupId: guaranteeNonEmptyString(
      parts[0]?.trim(),
      `GAV coordinates group ID is missing or empty`,
    ),
    artifactId: guaranteeNonEmptyString(
      parts[1]?.trim(),
      `GAV coordinates artifact ID is missing or empty`,
    ),
    versionId: guaranteeNonEmptyString(
      parts[2]?.trim(),
      `GAV coordinates version ID is missing or empty`,
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

export interface ProjectIdentifier {
  prefix?: string | undefined;
  id: number;
}

const PROJECT_IDENTIFIER_DELIMITER = '-';

export const parseProjectIdentifier = (
  projectId: string,
): ProjectIdentifier => {
  const parts = projectId.split(PROJECT_IDENTIFIER_DELIMITER);
  if (parts.length === 1) {
    const id = returnUndefOnError(() =>
      parseNumber(
        guaranteeNonEmptyString(
          parts[0]?.trim(),
          `Project identifier ID number is missing or empty`,
        ),
      ),
    );
    if (id === undefined) {
      throw new AssertionError(`Project identifier ID number is not a number`);
    }
    return {
      id,
    };
  } else if (parts.length === 2) {
    const prefix = parts[0]?.trim();
    const id = returnUndefOnError(() =>
      parseNumber(
        guaranteeNonEmptyString(
          parts[1]?.trim(),
          `Project identifier ID number is missing or empty`,
        ),
      ),
    );
    if (id === undefined) {
      throw new AssertionError(`Project identifier ID number is not a number`);
    }
    return {
      prefix,
      id,
    };
  } else {
    throw new AssertionError(
      `Can't parse project identifier '${projectId}': expect the coordinates to follow format {prefix}${GAV_DELIMITER}{ID}, or {ID}`,
    );
  }
};
