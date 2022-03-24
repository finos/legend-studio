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
  type PlainObject,
  AssertionError,
  guaranteeNonNullable,
  assertNonNullable,
  guaranteeNonEmptyString,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
  type LegendApplicationVersionData,
} from '@finos/legend-application';
import { createModelSchema, optional, primitive } from 'serializr';
import { action, computed, makeObservable, observable } from 'mobx';

export class TaxonomyServerOption {
  label!: string;
  key!: string;
  url!: string;
  default?: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(TaxonomyServerOption, {
      default: optional(primitive()),
      label: primitive(),
      key: primitive(),
      url: primitive(),
    }),
  );
}

export interface LegendTaxonomyConfigurationData
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
  query: { url: string };
  studio: { url: string };
  taxonomy: PlainObject<TaxonomyServerOption>[];
  extensions?: Record<PropertyKey, unknown>;
}

export class LegendTaxonomyConfig extends LegendApplicationConfig {
  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly queryUrl: string;
  readonly studioUrl: string;
  readonly TEMPORARY__useLegacyDepotServerAPIRoutes?: boolean | undefined;

  currentTaxonomyServerOption!: TaxonomyServerOption;
  taxonomyServerOptions: TaxonomyServerOption[] = [];

  constructor(
    configData: LegendTaxonomyConfigurationData,
    versionData: LegendApplicationVersionData,
    baseUrl: string,
  ) {
    super(configData, versionData, baseUrl);

    makeObservable(this, {
      currentTaxonomyServerOption: observable,
      defaultTaxonomyServerOption: computed,
      setCurrentTaxonomyServerOption: action,
    });

    assertNonNullable(
      configData.taxonomy,
      `Can't configure application: 'taxonomy' field is missing`,
    );
    if (Array.isArray(configData.taxonomy)) {
      const options = configData.taxonomy.map((optionData) =>
        TaxonomyServerOption.serialization.fromJson(optionData),
      );
      if (options.length === 0) {
        throw new AssertionError(
          `Can't configure application: 'taxonomy' field has no entry`,
        );
      }
      // Make sure the specified instances are unique by key
      if (
        new Set(options.map((instance) => instance.key)).size !== options.length
      ) {
        throw new AssertionError(
          `Can't configure application: 'taxonomy' field consists of entries with duplicated keys`,
        );
      }
      // Make sure default option is set properly
      if (options.filter((instance) => instance.default).length === 0) {
        throw new AssertionError(
          `Can't configure application: 'taxonomy' field consists of no default entry`,
        );
      }
      if (options.filter((instance) => instance.default).length > 1) {
        throw new AssertionError(
          `Can't configure application: 'taxonomy' field consists of multiple default entries`,
        );
      }
      this.taxonomyServerOptions = options;
    } else {
      throw new AssertionError(
        `Can't configure application: 'taxonomy' field is not a list`,
      );
    }
    this.currentTaxonomyServerOption = this.defaultTaxonomyServerOption;

    assertNonNullable(
      configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );

    assertNonNullable(
      configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      configData.engine.url,
      `Can't configure application: 'engine.url' field is missing or empty`,
    );
    this.engineQueryServerUrl = configData.engine.queryUrl;
    this.depotServerUrl = guaranteeNonEmptyString(
      configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );
    this.queryUrl = guaranteeNonEmptyString(
      configData.query.url,
      `Can't configure application: 'query.url' field is missing or empty`,
    );
    this.studioUrl = guaranteeNonEmptyString(
      configData.studio.url,
      `Can't configure application: 'studio.url' field is missing or empty`,
    );
    this.TEMPORARY__useLegacyDepotServerAPIRoutes =
      configData.depot.TEMPORARY__useLegacyDepotServerAPIRoutes;
  }

  get defaultTaxonomyServerOption(): TaxonomyServerOption {
    return guaranteeNonNullable(
      this.taxonomyServerOptions.find((option) => option.default),
      `Can't find a default taxonomy server option`,
    );
  }

  setCurrentTaxonomyServerOption(val: TaxonomyServerOption): void {
    this.currentTaxonomyServerOption = val;
  }
}
