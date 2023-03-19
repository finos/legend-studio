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

// NOTE: TypeDoc currently does not allow loading ESM-based plugins
// When we fix this, change package.json to use `type: module`
// See https://github.com/TypeStrong/typedoc/issues/1635
const typedoc = require('typedoc');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const typeDocBuildDir = path.resolve(ROOT_DIR, 'build/docs');
const faviconPath = path.resolve(typeDocBuildDir, 'img/favicon.ico');
const TEMP_FAVICON_PATH = 'favicon.ico';

class LegendTheme extends typedoc.DefaultTheme {
  render(page) {
    let pageContent = super.render(page);
    // replace the temporary favicon path by the relative path
    const relativeFaviconPath = path.relative(
      path.dirname(page.filename),
      faviconPath,
    );
    pageContent = pageContent.replace(TEMP_FAVICON_PATH, relativeFaviconPath);
    return pageContent;
  }
}

/**
 * Called by TypeDoc when loading this theme as a plugin. Should be used to define themes which
 * can be selected by the user.
 */
function load(app) {
  // First, add a temporary favicon header tag which will be properly searched and replaced later
  app.renderer.hooks.on('head.end', () =>
    typedoc.JSX.createElement('link', {
      rel: 'shortcut icon',
      href: TEMP_FAVICON_PATH,
    }),
  );
  app.renderer.defineTheme('legend', LegendTheme);
  // TODO?: consider hiding the settings panel
  // TODO?: consider changing the theme in DefaultThemeRenderContext.icons
  // See https://github.com/Gerrit0/typedoc-custom-theme-demo
}

module.exports = {
  load,
};
