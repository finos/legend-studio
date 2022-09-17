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
  type LegendApplicationConfigurationInput,
  type LegendApplicationConfigurationData,
} from '@finos/legend-application';
import { createModelSchema, optional, primitive } from 'serializr';
import { action, computed, makeObservable, observable } from 'mobx';

export class TaxonomyTreeOption {
  label!: string;
  key!: string;
  url!: string;
  default?: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(TaxonomyTreeOption, {
      default: optional(primitive()),
      label: primitive(),
      key: primitive(),
      url: primitive(),
    }),
  );
}

export interface LegendTaxonomyApplicationConfigurationData
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
  taxonomy: PlainObject<TaxonomyTreeOption>[];
}

export class LegendTaxonomyApplicationConfig extends LegendApplicationConfig {
  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly queryUrl: string;
  readonly studioUrl: string;
  readonly TEMPORARY__useLegacyDepotServerAPIRoutes?: boolean | undefined;

  currentTaxonomyTreeOption!: TaxonomyTreeOption;
  taxonomyTreeOptions: TaxonomyTreeOption[] = [];

  constructor(
    input: LegendApplicationConfigurationInput<LegendTaxonomyApplicationConfigurationData>,
  ) {
    super(input);

    makeObservable(this, {
      currentTaxonomyTreeOption: observable,
      defaultTaxonomyTreeOption: computed,
      setCurrentTaxonomyTreeOption: action,
    });

    // taxonomy
    assertNonNullable(
      input.configData.taxonomy,
      `Can't configure application: 'taxonomy' field is missing`,
    );
    if (Array.isArray(input.configData.taxonomy)) {
      const options = input.configData.taxonomy.map((optionData) =>
        TaxonomyTreeOption.serialization.fromJson(optionData),
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
      this.taxonomyTreeOptions = options;
    } else {
      throw new AssertionError(
        `Can't configure application: 'taxonomy' field is not a list`,
      );
    }
    this.currentTaxonomyTreeOption = this.defaultTaxonomyTreeOption;

    // engine
    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = guaranteeNonEmptyString(
      input.configData.engine.url,
      `Can't configure application: 'engine.url' field is missing or empty`,
    );
    this.engineQueryServerUrl = input.configData.engine.queryUrl;

    // depot
    assertNonNullable(
      input.configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = guaranteeNonEmptyString(
      input.configData.depot.url,
      `Can't configure application: 'depot.url' field is missing or empty`,
    );
    this.TEMPORARY__useLegacyDepotServerAPIRoutes =
      input.configData.depot.TEMPORARY__useLegacyDepotServerAPIRoutes;

    // query
    assertNonNullable(
      input.configData.query,
      `Can't configure application: 'query' field is missing`,
    );
    this.queryUrl = guaranteeNonEmptyString(
      input.configData.query.url,
      `Can't configure application: 'query.url' field is missing or empty`,
    );

    // studio
    assertNonNullable(
      input.configData.studio,
      `Can't configure application: 'studio' field is missing`,
    );
    this.studioUrl = guaranteeNonEmptyString(
      input.configData.studio.url,
      `Can't configure application: 'studio.url' field is missing or empty`,
    );
  }

  get defaultTaxonomyTreeOption(): TaxonomyTreeOption {
    return guaranteeNonNullable(
      this.taxonomyTreeOptions.find((option) => option.default),
      `Can't find a default taxonomy tree option`,
    );
  }

  setCurrentTaxonomyTreeOption(val: TaxonomyTreeOption): void {
    this.currentTaxonomyTreeOption = val;
  }
}
