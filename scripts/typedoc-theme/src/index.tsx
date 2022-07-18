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
  type Application,
  JSX,
  DefaultTheme,
  type PageEvent,
  type Reflection,
} from 'typedoc';
import { resolve, dirname, relative } from 'path';

const ROOT_DIR = resolve(__dirname, '../../../');
const typeDocBuildDir = resolve(ROOT_DIR, 'build/docs');
const faviconPath = resolve(typeDocBuildDir, 'img/favicon.ico');
const TEMP_FAVICON_PATH = 'favicon.ico';

export class LegendTheme extends DefaultTheme {
  override render(page: PageEvent<Reflection>): string {
    let pageContent = super.render(page);

    // replace the temporary favicon path by the relative path
    const relativeFaviconPath = relative(dirname(page.filename), faviconPath);
    pageContent = pageContent.replace(TEMP_FAVICON_PATH, relativeFaviconPath);

    return pageContent;
  }
}

/**
 * Called by TypeDoc when loading this theme as a plugin. Should be used to define themes which
 * can be selected by the user.
 */
export function load(app: Application): void {
  // First, add a temporary favicon header tag which will be properly searched and replaced later
  app.renderer.hooks.on(
    'head.end',
    () =>
      (
        <link rel="shortcut icon" href={TEMP_FAVICON_PATH} />
      ) as unknown as JSX.Element,
  );

  app.renderer.defineTheme('legend', LegendTheme);

  // TODO?: consider hiding the settings panel
  // TODO?: consider changing the theme in DefaultThemeRenderContext.icons
  // See https://github.com/Gerrit0/typedoc-custom-theme-demo
}
