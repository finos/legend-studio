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

import { generateGAVCoordinates } from '@finos/legend-storage';

export enum LEGEND_APPLICATION_PARAM_TOKEN {
  INITIAL_COLOR_THEME = 'initialColorTheme',
}

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl = (
  studioApplicationUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath?: string | undefined,
): string =>
  `${studioApplicationUrl}/view/archive/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}${entityPath ? `/entity/${entityPath}` : ''}`;
