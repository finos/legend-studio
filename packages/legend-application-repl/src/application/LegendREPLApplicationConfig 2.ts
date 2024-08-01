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

export interface LegendREPLApplicationConfigData
  extends LegendApplicationConfigurationData {
  repl: {
    url: string;
    // NOTE: configure this to `true` to ignore the URL specified in the config
    // so we can serve this application staticly with backend
    dynamic?: boolean;
  };
}

export class LegendREPLApplicationConfig extends LegendApplicationConfig {
  readonly replUrl: string;
  readonly useDynamicREPLServer: boolean = false;

  constructor(
    input: LegendApplicationConfigurationInput<LegendREPLApplicationConfigData>,
  ) {
    super(input);

    assertNonNullable(
      input.configData.repl,
      `Can't configure application: 'repl' field is missing`,
    );
    this.replUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.repl.url,
        `Can't configure application: 'repl.url' field is missing or empty`,
      ),
    );
    if (input.configData.repl.dynamic !== undefined) {
      this.useDynamicREPLServer = Boolean(input.configData.repl.dynamic);
    }
  }

  override getDefaultApplicationStorageKey() {
    return 'legend-repl';
  }
}
