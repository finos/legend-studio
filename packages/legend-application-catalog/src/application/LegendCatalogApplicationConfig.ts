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

import { createModelSchema, optional, primitive } from 'serializr';
import {
  type PlainObject,
  assertNonNullable,
  guaranteeNonEmptyString,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
  LegendApplicationConfig,
} from '@finos/legend-application';

class LegendCatalogApplicationCoreOptions {
  /**
   * This flag is for any feature that is not production ready.
   * Used to iterate over features until they are ready for production.
   */
  NonProductionFeatureFlag = false;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendCatalogApplicationCoreOptions, {
      NonProductionFeatureFlag: optional(primitive()),
    }),
  );

  static create(
    configData: PlainObject<LegendCatalogApplicationCoreOptions>,
  ): LegendCatalogApplicationCoreOptions {
    return LegendCatalogApplicationCoreOptions.serialization.fromJson(
      configData,
    );
  }
}

export interface LegendCatalogApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  depot: { url: string };
  engine: {
    url: string;
    queryUrl?: string;
  };
  studio?: { url: string };
  query?: { url: string };
}

export class LegendCatalogApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendCatalogApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly studioApplicationUrl?: string | undefined;
  readonly queryApplicationUrl?: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<LegendCatalogApplicationConfigurationData>,
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
    if (input.configData.engine.queryUrl) {
      this.engineQueryServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.engine.queryUrl,
      );
    }

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

    // studio
    if (input.configData.studio?.url) {
      this.studioApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.studio.url,
      );
    }

    // query
    if (input.configData.query?.url) {
      this.queryApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
        input.configData.query.url,
      );
    }

    // options
    this.options = LegendCatalogApplicationCoreOptions.create(
      input.configData.extensions?.core ?? {},
    );
  }

  override getDefaultApplicationStorageKey(): string {
    return 'legend-catalog';
  }
}
