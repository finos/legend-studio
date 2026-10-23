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

import { editor as monacoEditorAPI } from 'monaco-editor';

/**
 * Monaco only has one theme per page: both `monaco.editor.setTheme()` and the `theme` option
 * of `monaco.editor.create()` restyle every editor. So a component embedded in an application
 * (e.g. DataCube, which has its own light/dark setting) must not set the theme directly, or it
 * leaks into the application's editors and stays there after the component is gone.
 *
 * Instead, the application sets the base theme, and an embedded component claims its theme
 * while its editors are mounted. The most recent claim wins, and the base theme is restored
 * once the last claim is released.
 *
 * NOTE: while a claim is held, every editor on the page (the application's included) uses the
 * claimed theme, since Monaco cannot theme editors individually.
 */
let baseTheme: string | undefined;
const claims: CodeEditorThemeClaim[] = [];

const applyTheme = (): void => {
  const theme = claims.at(-1)?.theme ?? baseTheme;
  if (theme !== undefined) {
    monacoEditorAPI.setTheme(theme);
  }
};

export class CodeEditorThemeClaim {
  theme: string;

  constructor(theme: string) {
    this.theme = theme;
  }

  update(theme: string): void {
    this.theme = theme;
    applyTheme();
  }

  release(): void {
    const index = claims.indexOf(this);
    if (index !== -1) {
      claims.splice(index, 1);
      applyTheme();
    }
  }
}

/**
 * Sets the application's code editor theme, used whenever no claim is held.
 */
export const setBaseCodeEditorTheme = (theme: string): void => {
  baseTheme = theme;
  applyTheme();
};

/**
 * Applies a theme until the returned claim is released.
 */
export const claimCodeEditorTheme = (theme: string): CodeEditorThemeClaim => {
  const claim = new CodeEditorThemeClaim(theme);
  claims.push(claim);
  applyTheme();
  return claim;
};
