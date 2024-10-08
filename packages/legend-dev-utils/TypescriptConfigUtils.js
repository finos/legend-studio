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

import { sep, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { lstatSync, existsSync } from 'fs';
import { parse } from 'jsonc-parser';
import { getFileContent } from './DevUtils.js';

const getDir = (file) =>
  lstatSync(file).isDirectory() ? file : file.split(sep).slice(0, -1).join(sep);

/**
 * Get the Typescript config file content non-recursively.
 *
 * NOTE: There are conflicting behavior when trailing commas are detected:
 * 1. Prettier allows trailing commas and there's a chance we use it in Typescript config files.
 * 2. Typescript allows trailing commas in Typescript config files.
 * 3. `jsonc-parser` tolerates trailing commas but will count it as a parsing error, and there's no option to
 *    filter out trailing commas among the violations.
 *
 * Therefore, it's best that we don't do a check for parsing error in the config files by default,
 * that should be taken care of by Typescript anyway.
 */
export const getTsConfigJSON = (file, checkForParsingError = false) => {
  const parseErrors = [];
  if (!existsSync(file)) {
    throw new Error(`Can't find Typescript config file with path '${file}'`);
  }
  const text = getFileContent(file);
  const json = parse(text, parseErrors);
  if (checkForParsingError && parseErrors.length > 0) {
    throw new Error(`Can't parse Typescript config file with path '${file}'`);
  }
  return json;
};

/**
 * This method walks up the inheritance chain and assemble the full
 * config file without doing any validation that `tsc` does
 * such as to see ifany files match the pattern specified in `files`
 * and `includes`
 */
export const resolveFullTsConfigWithoutValidation = (fullTsConfigPath) => {
  let tsConfig = getTsConfigJSON(fullTsConfigPath);
  let tsConfigDir = getDir(fullTsConfigPath);
  let ext = tsConfig.extends;
  while (ext) {
    const parentTsConfigPath = resolve(tsConfigDir, ext);
    tsConfigDir = getDir(parentTsConfigPath);
    let parentTsFullConfig;
    try {
      parentTsFullConfig = getTsConfigJSON(parentTsConfigPath);
    } catch {
      throw new Error(
        `Can't resolve parent Typescript config file with relative path '${ext}' for config file with path '${fullTsConfigPath}'`,
      );
    }
    /**
     * NOTE: here we need to get the right understanding of the `extends` in `tsconfig`
     * `extends` means overriding, not merge (like `webpack-merge`) i.e.
     *
     * The configuration from the base file are loaded first, then overridden by those in the
     * inheriting config file. All relative paths found in the configuration file will be resolved
     * relative to the configuration file they originated in.
     *
     * It’s worth noting that `files`, `include` and `exclude` from the inheriting config file overwrite
     * those from the base config file, and that circularity between configuration files is not allowed.
     *
     * Currently, the only top-level property that is excluded from inheritance is `references`,
     * which means that if `tsconfigA` extends `tsconfigB`, even if `tsconfigB` has `references`,
     * those will not be passed down to `tsconfigA`
     *
     * See https://www.typescriptlang.org/tsconfig#extends
     * See https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
     *
     * Therefore, the only field within `tsconfig` that we needs to destruct is `compilerOptions`.
     */
    const {
      references, // eslint-disable-line no-unused-vars
      ...parentTsConfig
    } = parentTsFullConfig; // omit `references` from parent config
    tsConfig = {
      ...parentTsConfig,
      ...tsConfig,
      extends: parentTsConfig.extends,
      compilerOptions: {
        ...parentTsConfig.compilerOptions,
        ...tsConfig.compilerOptions,
      },
    };
    ext = parentTsFullConfig.extends;
  }
  return tsConfig;
};

/**
 * This method uses `tsc` to resolve the full config
 * but because it uses `tsc` it will also do validation.
 */
export const resolveFullTsConfig = (fullTsConfigPath) =>
  JSON.parse(
    execSync(`tsc -p ${fullTsConfigPath} --showConfig`, {
      encoding: 'utf-8',
      cwd: dirname(fullTsConfigPath),
    }),
  );
