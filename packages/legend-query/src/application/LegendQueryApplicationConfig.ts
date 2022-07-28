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
  assertTrue,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
} from '@finos/legend-application';

export interface LegendQueryApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  appName: string;
  env: string;
  depot: {
    url: string;
    /**
     * This is needed since some of our legacy infrastructure does not yet support
     * the new API calls, we need to update them to use the latest version of
     * finos/legend-depot though
     */
    TEMPORARY__useLegacyDepotServerAPIRoutes?: boolean;
  };
  engine: { url: string; queryUrl?: string };
  studio: { url: string };
  sdlc: {
    default: string;
    instances: {
      url: string;
      key: string;
      label?: string;
    }[];
  };
  extensions?: Record<PropertyKey, unknown>;
}

export class SDLCInstance {
  readonly url: string;
  readonly key: string;
  readonly label: string;

  constructor(key: string, label: string, url: string) {
    this.url = url;
    this.key = key;
    this.label = label;
  }
}

export class LegendQueryApplicationConfig extends LegendApplicationConfig {
  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly studioUrl: string;
  readonly TEMPORARY__useLegacyDepotServerAPIRoutes?: boolean | undefined;
  readonly sdlcInstances: SDLCInstance[];
  readonly defaultSdlc: SDLCInstance;

  constructor(
    input: LegendApplicationConfigurationInput<LegendQueryApplicationConfigurationData>,
  ) {
    super(input);

    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      input.configData.engine.url,
      `Can't configure application: 'engine.url' field is missing or empty`,
    );
    this.engineQueryServerUrl = input.configData.engine.queryUrl;
    this.depotServerUrl = guaranteeNonEmptyString(
      input.configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );
    this.studioUrl = guaranteeNonEmptyString(
      input.configData.studio.url,
      `Can't configure application: 'studio.url' field is missing or empty`,
    );
    // sdlc
    const defaultSDLCKey = guaranteeNonEmptyString(
      input.configData.sdlc.default,
      `Can't configure application: 'studio.sdlc.default' field is missing or empty`,
    );
    const _sdlcInstances = guaranteeNonNullable(
      input.configData.sdlc.instances,
      `Can't configure application: 'studio.sdlc.instances' field is missing or empty`,
    );
    assertTrue(
      Boolean(_sdlcInstances.length),
      `Can't configure application: 'studio.sdlc.instances' field needs at least one sdlc instances defined`,
    );
    this.sdlcInstances = _sdlcInstances.map((sdlc, i) => {
      const key = guaranteeNonEmptyString(
        `Can't configure application: 'studio.sdlc.instances[${i}].key' field is missing or empty`,
      );
      const label = sdlc.label ?? key;
      const url = guaranteeNonEmptyString(
        `Can't configure application: sdlc ${key} instance 'url' field is missing or empty`,
      );
      return new SDLCInstance(key, label, url);
    });
    this.defaultSdlc = guaranteeNonNullable(
      this.sdlcInstances.find((sdlc) => sdlc.key === defaultSDLCKey),
      `Can't configure application: default sdlc key does not exist`,
    );
    this.TEMPORARY__useLegacyDepotServerAPIRoutes =
      input.configData.depot.TEMPORARY__useLegacyDepotServerAPIRoutes;
  }
}
