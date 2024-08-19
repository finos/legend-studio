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

import packageJson from '../../../package.json' with { type: 'json' };
import {
  type DSL_LegendStudioApplicationPlugin_Extension,
  LegendStudioApplicationPlugin,
} from '@finos/legend-application-studio';
import type { ApplicationPageEntry } from '@finos/legend-application';
import { DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN } from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { UpdateServiceQuerySetup } from './UpdateServiceQuerySetup.js';
import { UpdateProjectServiceQuerySetup } from './UpdateProjectServiceQuerySetup.js';
import {
  ProjectServiceQueryUpdater,
  ServiceQueryUpdater,
} from './ServiceQueryEditor.js';
import { QueryProductionizer } from './QueryProductionizer.js';

export class DSL_Service_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      {
        key: 'update-service-query-setup-application-page',
        addressPatterns: [
          DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_SERVICE_QUERY_SETUP,
        ],
        renderer: UpdateServiceQuerySetup,
      },
      {
        key: 'update-service-query-application-page',
        addressPatterns: [
          DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_SERVICE_QUERY,
        ],
        renderer: ServiceQueryUpdater,
      },
      {
        key: 'update-project-service-query-setup-application-page',
        addressPatterns: [
          DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_PROJECT_SERVICE_QUERY_SETUP,
        ],
        renderer: UpdateProjectServiceQuerySetup,
      },
      {
        key: 'update-project-service-query-application-page',
        addressPatterns: [
          DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_PROJECT_SERVICE_QUERY,
        ],
        renderer: ProjectServiceQueryUpdater,
      },
      {
        key: 'productionize-query-application-page',
        addressPatterns: [
          DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.PRODUCTIONIZE_QUERY,
        ],
        renderer: QueryProductionizer,
      },
    ];
  }
}
