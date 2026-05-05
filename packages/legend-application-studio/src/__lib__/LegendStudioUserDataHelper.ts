import type { UserDataService } from '@finos/legend-application';
import { returnUndefOnError } from '@finos/legend-shared';

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
export enum LEGEND_STUDIO_USER_DATA_KEY {
  GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES = 'studio-editor.global-test-runner-showDependencyPanel',
  // Per-user theme preference for the database editor. Scoped to this one
  // editor since the wider Studio app is dark-mode-only today — the rest of
  // the app does not honor this value.
  // TODO: when Studio adopts app-wide theming via `LayoutService` (the
  // mechanism Query already uses with setting key
  // `application.layout.colorTheme`), retire this key and have the database
  // editor inherit `applicationStore.layoutService.currentColorTheme`
  // instead. Migration is mechanical: delete this key + the helper getters,
  // drop the toggle button in the tab header, and retarget the SCSS
  // `.database-editor--light` block at the framework's color-theme tokens.
  DATABASE_EDITOR_THEME = 'studio-editor.database-editor.theme',
}

export class LegendStudioUserDataHelper {
  static globalTestRunner_getShowDependencyPanel(
    service: UserDataService,
  ): boolean | undefined {
    return returnUndefOnError(() =>
      service.getBooleanValue(
        LEGEND_STUDIO_USER_DATA_KEY.GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES,
      ),
    );
  }

  static globalTestRunner_setShowDependencyPanel(
    service: UserDataService,
    val: boolean,
  ): void {
    service.persistValue(
      LEGEND_STUDIO_USER_DATA_KEY.GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES,
      val,
    );
  }

  static databaseEditor_getTheme(
    service: UserDataService,
  ): 'dark' | 'light' | undefined {
    const val = returnUndefOnError(() =>
      service.getStringValue(LEGEND_STUDIO_USER_DATA_KEY.DATABASE_EDITOR_THEME),
    );
    return val === 'light' || val === 'dark' ? val : undefined;
  }

  static databaseEditor_setTheme(
    service: UserDataService,
    val: 'dark' | 'light',
  ): void {
    service.persistValue(
      LEGEND_STUDIO_USER_DATA_KEY.DATABASE_EDITOR_THEME,
      val,
    );
  }
}
