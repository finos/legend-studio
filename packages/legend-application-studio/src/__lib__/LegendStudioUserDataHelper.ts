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
}
