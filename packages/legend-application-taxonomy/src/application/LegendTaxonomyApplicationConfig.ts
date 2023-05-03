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

type LegendStudioApplicationInstanceConfigurationData = {
  sdlcProjectIDPrefix: string;
  url: string;
};

export interface LegendTaxonomyApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  depot: {
    url: string;
  };
  engine: { url: string; queryUrl?: string };
  query: { url: string };
  studio: {
    url: string;
    instances: LegendStudioApplicationInstanceConfigurationData[];
  };
  taxonomy: PlainObject<TaxonomyTreeOption>[];
}

class LegendTaxonomyApplicationCoreOptions {
  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendTaxonomyApplicationCoreOptions, {}),
  );

  static create(
    configData: PlainObject<LegendTaxonomyApplicationCoreOptions>,
  ): LegendTaxonomyApplicationCoreOptions {
    return LegendTaxonomyApplicationCoreOptions.serialization.fromJson(
      configData,
    );
  }
}

export class LegendTaxonomyApplicationConfig extends LegendApplicationConfig {
  readonly options = new LegendTaxonomyApplicationCoreOptions();

  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;
  readonly depotServerUrl: string;
  readonly queryApplicationUrl: string;
  readonly studioApplicationUrl: string;
  readonly studioInstances: LegendStudioApplicationInstanceConfigurationData[] =
    [];

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
    this.engineServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.engine.url,
        `Can't configure application: 'engine.url' field is missing or empty`,
      ),
    );
    this.engineQueryServerUrl = input.configData.engine.queryUrl;

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
    assertNonNullable(
      input.configData.query,
      `Can't configure application: 'query' field is missing`,
    );
    this.queryApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.query.url,
        `Can't configure application: 'query.url' field is missing or empty`,
      ),
    );

    // studio
    assertNonNullable(
      input.configData.studio,
      `Can't configure application: 'studio' field is missing`,
    );
    this.studioApplicationUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.studio.url,
        `Can't configure application: 'studio.url' field is missing or empty`,
      ),
    );
    this.studioInstances = guaranteeNonNullable(
      input.configData.studio.instances,
      `Can't configure application: 'studio.instances' field is missing`,
    );

    // options
    this.options = LegendTaxonomyApplicationCoreOptions.create(
      (input.configData.extensions?.core ??
        {}) as PlainObject<LegendTaxonomyApplicationCoreOptions>,
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

  override getDefaultApplicationStorageKey(): string {
    return 'legend-taxonomy';
  }
}
