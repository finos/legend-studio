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
  assertNonNullable,
  guaranteeNonEmptyString,
} from '@finos/legend-shared';
import {
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
  LegendApplicationConfig,
} from '@finos/legend-application';

export interface LegendPureIDEApplicationConfigData
  extends LegendApplicationConfigurationData {
  pure: {
    url: string;
    // NOTE: configure this to `true` to ignore the URL specified in the config
    // so we can serve this application staticly with either Pure and Engine backend
    dynamic?: boolean;
  };
}

export class LegendPureIDEApplicationConfig extends LegendApplicationConfig {
  readonly pureUrl: string;
  readonly useDynamicPureServer: boolean = false;

  constructor(
    input: LegendApplicationConfigurationInput<LegendPureIDEApplicationConfigData>,
  ) {
    super(input);

    assertNonNullable(
      input.configData.pure,
      `Can't configure application: 'pure' field is missing`,
    );
    this.pureUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.pure.url,
        `Can't configure application: 'pure.url' field is missing or empty`,
      ),
    );
    if (input.configData.pure.dynamic !== undefined) {
      this.useDynamicPureServer = Boolean(input.configData.pure.dynamic);
    }
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-pure-ide';
  }
}
