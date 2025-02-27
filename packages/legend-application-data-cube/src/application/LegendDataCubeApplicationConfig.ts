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
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
} from '@finos/legend-application';
import {
  assertNonNullable,
  guaranteeNonEmptyString,
} from '@finos/legend-shared';

export interface LegendDataCubeApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  depot: {
    url: string;
  };
  engine: { url: string; queryUrl: string };
  query?: {
    url: string;
  };
  studio?: {
    url: string;
  };
}

export class LegendDataCubeApplicationConfig extends LegendApplicationConfig {
  readonly engineServerUrl: string;
  readonly depotServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly queryApplicationUrl?: string | undefined;
  readonly studioApplicationUrl?: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendDataCubeApplicationConfigurationData>,
  ) {
    super(input);

    // engine
    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.engine.url,
        `Can't configure application: 'engine.url' field is missing or empty`,
      ),
    );
    this.engineQueryServerUrl = input.configData.engine.queryUrl
      ? LegendApplicationConfig.resolveAbsoluteUrl(
          input.configData.engine.queryUrl,
        )
      : undefined;

    // depot
    assertNonNullable(
      input.configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.depot.url,
        `Can't configure application: 'depot.url' field is missing or empty`,
      ),
    );

    // query
    if (input.configData.query?.url) {
      this.queryApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.query.url,
      );
    }
    // stduio
    if (input.configData.studio?.url) {
      this.studioApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.studio.url,
      );
    }
  }
  getDefaultApplicationStorageKey(): string {
    return 'legend-data-cube';
  }
}
