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
  AccessPointGroup,
  DataProduct,
  Mapping,
  ModelAccessPointGroup,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import {
  resolveExecutionContextMapping,
  resolveMappingFromMappingProvider,
} from '../DSL_DataSpace_GraphManagerHelper.js';

const MAPG_ID = 'covidMapg';

const buildModelAccessPointGroup = (
  id: string,
  mapping: Mapping,
): ModelAccessPointGroup => {
  const group = new ModelAccessPointGroup();
  group.id = id;
  group.mapping = PackageableElementExplicitReference.create(mapping);
  return group;
};

const buildDataProduct = (
  path: string,
  groups: AccessPointGroup[],
): DataProduct => {
  const dataProduct = new DataProduct(path);
  dataProduct.accessPointGroups = groups;
  return dataProduct;
};

const buildProvider = (
  element: DataProduct | Mapping,
  keys: string[],
): DataSpaceMappingProvider => {
  const provider = new DataSpaceMappingProvider();
  provider.element = PackageableElementExplicitReference.create(element);
  provider.keys = keys;
  return provider;
};

const buildContext = (
  name: string,
  config: {
    mapping?: Mapping | undefined;
    mappingProvider?: DataSpaceMappingProvider | undefined;
  },
): DataSpaceExecutionContext => {
  const context = new DataSpaceExecutionContext();
  context.name = name;
  context.mapping = config.mapping
    ? PackageableElementExplicitReference.create(config.mapping)
    : undefined;
  context.mappingProvider = config.mappingProvider;
  return context;
};

describe('resolveMappingFromMappingProvider', () => {
  test(
    unitTest('resolves the mapping of the group named by the first key'),
    () => {
      const targetMapping = new Mapping('CovidDataMapping');
      const otherMapping = new Mapping('OtherMapping');
      const dataProduct = buildDataProduct('CovidDataProduct', [
        buildModelAccessPointGroup('otherMapg', otherMapping),
        buildModelAccessPointGroup(MAPG_ID, targetMapping),
      ]);

      expect(
        resolveMappingFromMappingProvider(
          buildProvider(dataProduct, [MAPG_ID]),
        ),
      ).toBe(targetMapping);
    },
  );

  test(
    unitTest('ignores access point groups that are not model-backed'),
    () => {
      const targetMapping = new Mapping('CovidDataMapping');
      const nonModelGroup = new AccessPointGroup();
      nonModelGroup.id = MAPG_ID;
      const dataProduct = buildDataProduct('CovidDataProduct', [
        nonModelGroup,
        buildModelAccessPointGroup(MAPG_ID, targetMapping),
      ]);

      expect(
        resolveMappingFromMappingProvider(
          buildProvider(dataProduct, [MAPG_ID]),
        ),
      ).toBe(targetMapping);
    },
  );

  test(
    unitTest(
      'returns undefined when the provider element is not a data product',
    ),
    () => {
      const mapping = new Mapping('CovidDataMapping');
      expect(
        resolveMappingFromMappingProvider(buildProvider(mapping, [MAPG_ID])),
      ).toBeUndefined();
    },
  );

  test(
    unitTest('returns undefined when no group matches the first key'),
    () => {
      const dataProduct = buildDataProduct('CovidDataProduct', [
        buildModelAccessPointGroup('someOtherMapg', new Mapping('Other')),
      ]);
      expect(
        resolveMappingFromMappingProvider(
          buildProvider(dataProduct, [MAPG_ID]),
        ),
      ).toBeUndefined();
    },
  );

  test(unitTest('returns undefined when there are no keys'), () => {
    const dataProduct = buildDataProduct('CovidDataProduct', [
      buildModelAccessPointGroup(MAPG_ID, new Mapping('CovidDataMapping')),
    ]);
    expect(
      resolveMappingFromMappingProvider(buildProvider(dataProduct, [])),
    ).toBeUndefined();
  });
});

describe('resolveExecutionContextMapping', () => {
  test(unitTest('returns the mapping when one is set directly'), () => {
    const mapping = new Mapping('CovidDataMapping');
    expect(
      resolveExecutionContextMapping(buildContext('direct', { mapping })),
    ).toBe(mapping);
  });

  test(unitTest('resolves through the provider when no mapping is set'), () => {
    const mapping = new Mapping('CovidDataMapping');
    const dataProduct = buildDataProduct('CovidDataProduct', [
      buildModelAccessPointGroup(MAPG_ID, mapping),
    ]);
    expect(
      resolveExecutionContextMapping(
        buildContext('provided', {
          mappingProvider: buildProvider(dataProduct, [MAPG_ID]),
        }),
      ),
    ).toBe(mapping);
  });

  test(
    unitTest('returns undefined when neither a mapping nor a provider is set'),
    () => {
      expect(
        resolveExecutionContextMapping(buildContext('bare', {})),
      ).toBeUndefined();
    },
  );
});
