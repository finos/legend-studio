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

/**
 * The `darkMode` Cube's dialogs give their primary footer button (Add,
 * Apply, Close): always legend-art's "dark" variant, which its styles now
 * draw from the theme's tokens in every theme, an accent button. In a light
 * theme, its "light" variant, a legacy alias, draws it grey, so an enabled
 * Add looked disabled. The dialog and its secondary buttons keep following
 * the theme: the "dark" variant would draw the title dark on the blue header
 */
export const CUBE_PRIMARY_BUTTON_DARK_MODE = true;
