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

import { LegendMarketplace } from '@finos/legend-application-marketplace';
import {
  type AbstractPreset,
  type AbstractPlugin,
  WebConsole,
  NetworkClient,
  assertNonEmptyString,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram/graph';
import {
  TelemetryServicePlugin,
  type TelemetryData,
} from '@finos/legend-application';

interface GSAnalyticsTelemetryPluginConfigData {
  url: string;
  token: string;
  propertiesKey?: string | undefined;
}

export class GSAnalyticsTelemetryPlugin extends TelemetryServicePlugin {
  private _networkClient?: NetworkClient | undefined;
  private _token?: string | undefined;
  private _propertiesKey = '__application';

  constructor() {
    super('@alloy/legend-telemetry-plugin-gs-analytics', '0.0.0');
  }

  override configure(_configData: object): TelemetryServicePlugin {
    const configData = _configData as GSAnalyticsTelemetryPluginConfigData;
    assertNonEmptyString(
      configData.url,
      `GS Analytics: Malformed telemetry configuration data: 'url' field is missing or empty`,
    );
    assertNonEmptyString(
      configData.token,
      `GS Analytics: Malformed telemetry configuration data: 'token' field is missing or empty`,
    );
    this._networkClient = new NetworkClient({
      baseUrl: configData.url,
    });
    this._token = configData.token;
    if (configData.propertiesKey) {
      this._propertiesKey = configData.propertiesKey;
    }
    return this;
  }

  private get networkClient(): NetworkClient {
    return guaranteeNonNullable(
      this._networkClient,
      `GS Analytics: Telemetry service has not been configured`,
    );
  }

  private get token(): string {
    return guaranteeNonNullable(
      this._token,
      `GS Analytics: Telemetry service has not been configured`,
    );
  }

  logEvent(eventName: string, data: TelemetryData): void {
    // See the guide for the event data payload format
    // See https://gs-analytics.url.gs.com/
    // See https://confluence.site.gs.com/display/CPUX/Getting+Started+with+Analytics#GettingStartedwithAnalytics-2.Instrumenting
    this.networkClient
      .post(
        '/appevent',
        {
          // NOTE: `context.user.kerberos` is optional, but if provided, the other fields in the `context.user` object will be automatically enriched
          context: { user: { kerberos: this.userId ?? '(unknown)' } },
          token: this.token,
          event: eventName,
          properties: {
            // NOTE: every form of data must be added within `properties` else they will be removed by the analytics endpoint
            // so we have to add it like this, though this is sub-optimal
            // See https://confluence.work.gs.com/display/URMET/Analytics+Data+Model
            // See https://confluence.work.gs.com/display/URMET/Establishing+Event+Properties
            [this._propertiesKey]: {
              name: this.appName,
              version: this.appVersion,
              env: this.appEnv,
              session: this.appSessionId,
              timestamp: this.appStartTime,
            },
            ...data,
          },
        },
        {},
        {},
        {},
        {},
        { skipProcessing: true },
      )
      .catch(() => {
        /** do nothing */
      });
  }
}

export class LegendMarketplaceWebApplication {
  static getPresetCollection(): AbstractPreset[] {
    return [
      // graph managers
      new DSL_DataSpace_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
    ];
  }

  static getPluginCollection(): AbstractPlugin[] {
    return [
      // loggers
      new GSAnalyticsTelemetryPlugin(),
      new WebConsole(),
    ];
  }

  static run(baseUrl: string): void {
    LegendMarketplace.create()
      .setup({ baseAddress: baseUrl })
      .withPresets(LegendMarketplaceWebApplication.getPresetCollection())
      .withPlugins(LegendMarketplaceWebApplication.getPluginCollection())
      .start()
      .catch((e: unknown) => {
        throw e;
      });
  }
}
