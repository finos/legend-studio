/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  DataProduct,
  Mapping,
  ModelAccessPointGroup,
  PackageableElementExplicitReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
} from '@finos/legend-extension-dsl-data-space/graph';
import { resolveExecutionContext } from '../QueryEditorStore.js';

const MAPG_ID = 'covidMapg';

const buildRuntime = (name: string): PackageableRuntime =>
  new PackageableRuntime(name);

const buildMappingProvider = (
  mapping: Mapping,
  groupId = MAPG_ID,
): DataSpaceMappingProvider => {
  const group = new ModelAccessPointGroup();
  group.id = groupId;
  group.mapping = PackageableElementExplicitReference.create(mapping);
  const dataProduct = new DataProduct('CovidDataProduct');
  dataProduct.accessPointGroups = [group];
  const provider = new DataSpaceMappingProvider();
  provider.element = PackageableElementExplicitReference.create(dataProduct);
  provider.keys = [groupId];
  return provider;
};

const buildContext = (
  name: string,
  config: {
    mapping?: Mapping | undefined;
    mappingProvider?: DataSpaceMappingProvider | undefined;
    defaultRuntime?: PackageableRuntime | undefined;
  },
): DataSpaceExecutionContext => {
  const context = new DataSpaceExecutionContext();
  context.name = name;
  context.mapping = config.mapping
    ? PackageableElementExplicitReference.create(config.mapping)
    : undefined;
  context.mappingProvider = config.mappingProvider;
  context.defaultRuntime = config.defaultRuntime
    ? PackageableElementExplicitReference.create(config.defaultRuntime)
    : undefined;
  return context;
};

const buildDataSpace = (
  contexts: DataSpaceExecutionContext[],
  defaultContextName?: string | undefined,
): DataSpace => {
  const dataSpace = new DataSpace('COVIDDatapace');
  dataSpace.executionContexts = contexts;
  dataSpace.defaultExecutionContext = defaultContextName
    ? contexts.find((ctx) => ctx.name === defaultContextName)
    : undefined;
  return dataSpace;
};

const buildUnresolvableMappingProvider = (): DataSpaceMappingProvider => {
  const provider = buildMappingProvider(new Mapping('CovidLakehouseMapping'));
  provider.keys = ['aGroupThatNoLongerExists'];
  return provider;
};

describe('resolveExecutionContext', () => {
  test(
    unitTest('matches a saved query against a mapping-provider-backed context'),
    () => {
      const lakehouseMapping = new Mapping('CovidLakehouseMapping');
      const lakeMapping = new Mapping('CovidLakeMapping');
      const lakehouseRuntime = buildRuntime('LakehouseRuntime');
      const lakeRuntime = buildRuntime('LakeRuntime');

      const lakeContext = buildContext('lake', {
        mapping: lakeMapping,
        defaultRuntime: lakeRuntime,
      });
      const lakehouseContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(lakehouseMapping),
        defaultRuntime: lakehouseRuntime,
      });
      const dataSpace = buildDataSpace([lakeContext, lakehouseContext], 'lake');

      expect(
        resolveExecutionContext(
          dataSpace,
          undefined,
          lakehouseMapping,
          lakehouseRuntime,
        ),
      ).toBe(lakehouseContext);
    },
  );

  test(
    unitTest(
      'disambiguates by runtime across two provider-backed contexts sharing a mapping',
    ),
    () => {
      const sharedMapping = new Mapping('CovidLakehouseMapping');
      const lakeMapping = new Mapping('CovidLakeMapping');
      const runtimeA = buildRuntime('WarehouseA');
      const runtimeB = buildRuntime('WarehouseB');

      const lakeContext = buildContext('lake', {
        mapping: lakeMapping,
        defaultRuntime: buildRuntime('LakeRuntime'),
      });
      const contextA = buildContext('lakehouseA', {
        mappingProvider: buildMappingProvider(sharedMapping),
        defaultRuntime: runtimeA,
      });
      const contextB = buildContext('lakehouseB', {
        mappingProvider: buildMappingProvider(sharedMapping),
        defaultRuntime: runtimeB,
      });
      const dataSpace = buildDataSpace(
        [lakeContext, contextA, contextB],
        'lake',
      );

      expect(
        resolveExecutionContext(dataSpace, undefined, sharedMapping, runtimeB),
      ).toBe(contextB);
    },
  );

  test(
    unitTest('prefers an explicitly named execution context over any matching'),
    () => {
      const mapping = new Mapping('CovidLakehouseMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const lakehouseContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(mapping),
        defaultRuntime: runtime,
      });
      const lakeContext = buildContext('lake', {
        mapping: new Mapping('CovidLakeMapping'),
        defaultRuntime: buildRuntime('LakeRuntime'),
      });
      const dataSpace = buildDataSpace(
        [lakeContext, lakehouseContext],
        'lakehouse',
      );

      expect(resolveExecutionContext(dataSpace, 'lake', mapping, runtime)).toBe(
        lakeContext,
      );
    },
  );

  test(
    unitTest(
      'falls back to the default context when the saved mapping matches it',
    ),
    () => {
      const mapping = new Mapping('CovidLakehouseMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const lakehouseContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(mapping),
        defaultRuntime: runtime,
      });
      const dataSpace = buildDataSpace([lakehouseContext], 'lakehouse');

      expect(
        resolveExecutionContext(dataSpace, undefined, mapping, runtime),
      ).toBe(lakehouseContext);
    },
  );

  describe('when no default execution context is designated', () => {
    test(
      unitTest('selects the only context when the data product declares one'),
      () => {
        const onlyContext = buildContext('onlyContext', {
          mapping: new Mapping('CovidLakeMapping'),
          defaultRuntime: buildRuntime('LakeRuntime'),
        });
        const dataSpace = buildDataSpace([onlyContext]);

        expect(dataSpace.defaultExecutionContext).toBeUndefined();
        expect(
          resolveExecutionContext(dataSpace, undefined, undefined, undefined),
        ).toBe(onlyContext);
      },
    );

    test(
      unitTest('still honours an explicitly named context when several exist'),
      () => {
        const lakehouseContext = buildContext('lakehouse', {
          mapping: new Mapping('CovidLakehouseMapping'),
          defaultRuntime: buildRuntime('LakehouseRuntime'),
        });
        const dataSpace = buildDataSpace([
          buildContext('lake', {
            mapping: new Mapping('CovidLakeMapping'),
            defaultRuntime: buildRuntime('LakeRuntime'),
          }),
          lakehouseContext,
        ]);

        expect(
          resolveExecutionContext(dataSpace, 'lakehouse', undefined, undefined),
        ).toBe(lakehouseContext);
      },
    );
  });

  test(
    unitTest(
      'returns undefined when the data product declares no execution contexts',
    ),
    () => {
      const dataSpace = buildDataSpace([]);

      expect(dataSpace.executionContexts).toEqual([]);
      expect(
        resolveExecutionContext(dataSpace, undefined, undefined, undefined),
      ).toBeUndefined();
    },
  );

  test(
    unitTest(
      'returns undefined for a key that matches no context, so callers can report it as stale',
    ),
    () => {
      const dataSpace = buildDataSpace(
        [
          buildContext('lake', {
            mapping: new Mapping('CovidLakeMapping'),
            defaultRuntime: buildRuntime('LakeRuntime'),
          }),
        ],
        'lake',
      );

      expect(
        resolveExecutionContext(
          dataSpace,
          'aContextThatWasRenamed',
          undefined,
          undefined,
        ),
      ).toBeUndefined();
    },
  );

  test(
    unitTest(
      'does not match a provider-backed context whose mapping provider no longer resolves',
    ),
    () => {
      const savedMapping = new Mapping('CovidLakehouseMapping');
      const savedRuntime = buildRuntime('LakehouseRuntime');
      const lakeContext = buildContext('lake', {
        mapping: new Mapping('CovidLakeMapping'),
        defaultRuntime: buildRuntime('LakeRuntime'),
      });
      const brokenProviderContext = buildContext('lakehouse', {
        mappingProvider: buildUnresolvableMappingProvider(),
        defaultRuntime: savedRuntime,
      });
      const dataSpace = buildDataSpace(
        [lakeContext, brokenProviderContext],
        'lake',
      );

      expect(
        resolveExecutionContext(
          dataSpace,
          undefined,
          savedMapping,
          savedRuntime,
        ),
      ).toBeUndefined();
    },
  );
});
