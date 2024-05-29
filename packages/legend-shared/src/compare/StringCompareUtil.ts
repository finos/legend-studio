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

// regex to validate semver: https://github.com/semver/semver/issues/232
export const isSemVer = (val: string): boolean =>
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/.test(
    val,
  );
