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

import { ELEMENT_PATH_DELIMITER } from '../MetaModelConst.js';

const DIR_PATH_DELIMITER = '/';

export const getExpectedArtifactGenerationExtensionOutputPath = (
  elementPath: string,
  extensionKey: string,
  filePath: string,
): string =>
  DIR_PATH_DELIMITER +
  elementPath.replaceAll(ELEMENT_PATH_DELIMITER, DIR_PATH_DELIMITER) +
  DIR_PATH_DELIMITER +
  extensionKey +
  DIR_PATH_DELIMITER +
  filePath;
