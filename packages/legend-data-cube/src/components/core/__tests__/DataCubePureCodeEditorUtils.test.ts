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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  CODE_EDITOR_THEME,
  setApplicationCodeEditorTheme,
} from '@finos/legend-code-editor';
import { getDataCubeCodeEditorTheme } from '../DataCubePureCodeEditorUtils.js';

test(
  unitTest(
    'DataCube code editors follow the code editor theme of the application',
  ),
  () => {
    // no application theme, e.g. DataCube in REPL or in the VS Code extension
    expect(getDataCubeCodeEditorTheme()).toBe(CODE_EDITOR_THEME.GITHUB_LIGHT);

    // embedded in an application in the dark theme, e.g. Studio
    setApplicationCodeEditorTheme(CODE_EDITOR_THEME.DEFAULT_DARK);
    expect(getDataCubeCodeEditorTheme()).toBe(CODE_EDITOR_THEME.DEFAULT_DARK);
  },
);
