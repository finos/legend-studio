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
import type { ReactElement } from 'react';
import { Mapping, PackageableRuntime } from '@finos/legend-graph';
import {
  DataSpaceExecutionContextAnalysisResult,
  DataSpaceMappingProviderAnalysisResult,
} from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { PURE_DataProductIcon, PURE_MappingIcon } from '@finos/legend-art';
import {
  DataSpaceExecutionContextMappingIcon,
  DataSpaceExecutionContextMappingLabel,
} from '../DataSpaceExecutionContextViewer.js';

const buildAnalysisContext = (
  name: string,
  opts: {
    mapping: Mapping;
    defaultRuntime: PackageableRuntime;
    mappingProvider?: { element: string; keys: string[] } | undefined;
  },
): DataSpaceExecutionContextAnalysisResult => {
  const ctx = new DataSpaceExecutionContextAnalysisResult();
  ctx.name = name;
  ctx.mapping = opts.mapping;
  ctx.defaultRuntime = opts.defaultRuntime;
  ctx.compatibleRuntimes = [opts.defaultRuntime];
  if (opts.mappingProvider) {
    const provider = new DataSpaceMappingProviderAnalysisResult();
    provider.element = opts.mappingProvider.element;
    provider.keys = opts.mappingProvider.keys;
    ctx.mappingProvider = provider;
  }
  return ctx;
};

const renderIcon = (
  executionContext: DataSpaceExecutionContextAnalysisResult,
): ReactElement =>
  DataSpaceExecutionContextMappingIcon({
    executionContext,
  }) as ReactElement;

const renderLabelProps = (
  executionContext: DataSpaceExecutionContextAnalysisResult,
): { title?: string; children?: unknown } => {
  const element = DataSpaceExecutionContextMappingLabel({
    executionContext,
  }) as ReactElement<{ title?: string; children?: unknown }>;
  return element.props;
};

describe(unitTest('DataSpaceExecutionContextMappingIcon'), () => {
  test(
    unitTest('renders the mapping icon for a direct-mapping context'),
    () => {
      const ctx = buildAnalysisContext('lake', {
        mapping: new Mapping('mapping::CovidLakeMapping'),
        defaultRuntime: new PackageableRuntime('runtime::LakeRuntime'),
      });

      expect(renderIcon(ctx).type).toBe(PURE_MappingIcon);
    },
  );

  test(
    unitTest(
      'renders the data product icon for a mappingProvider-backed context',
    ),
    () => {
      const ctx = buildAnalysisContext('lakehouse', {
        mapping: new Mapping('mapping::internal::ResolvedLakehouseMapping'),
        defaultRuntime: new PackageableRuntime('runtime::LakehouseRuntime'),
        mappingProvider: {
          element: 'domain::products::UsageStatsDataProduct',
          keys: ['usageStatsGroup'],
        },
      });

      expect(renderIcon(ctx).type).toBe(PURE_DataProductIcon);
    },
  );
});

describe(unitTest('DataSpaceExecutionContextMappingLabel'), () => {
  test(
    unitTest(
      'a direct-mapping context renders the full mapping path (and no data product label)',
    ),
    () => {
      const ctx = buildAnalysisContext('lake', {
        mapping: new Mapping('mapping::CovidLakeMapping'),
        defaultRuntime: new PackageableRuntime('runtime::LakeRuntime'),
      });

      const { title, children } = renderLabelProps(ctx);

      expect(children).toBe('mapping::CovidLakeMapping');
      expect(title).toBe('Mapping: mapping::CovidLakeMapping');
    },
  );

  test(
    unitTest(
      'a mappingProvider-backed context renders the data product NAME (not path) and hides the resolved mapping',
    ),
    () => {
      const ctx = buildAnalysisContext('lakehouse', {
        mapping: new Mapping('mapping::internal::ResolvedLakehouseMapping'),
        defaultRuntime: new PackageableRuntime('runtime::LakehouseRuntime'),
        mappingProvider: {
          element: 'domain::products::UsageStatsDataProduct',
          keys: ['usageStatsGroup'],
        },
      });

      const { title, children } = renderLabelProps(ctx);
      expect(children).toBe('UsageStatsDataProduct');
      expect(title).toBe(
        'Data Product: domain::products::UsageStatsDataProduct',
      );
      expect(children).not.toContain(
        'mapping::internal::ResolvedLakehouseMapping',
      );
      expect(title).not.toContain(
        'mapping::internal::ResolvedLakehouseMapping',
      );
    },
  );

  test(
    unitTest(
      'a mappingProvider element declared at the root package still renders the same name in the tooltip and label',
    ),
    () => {
      const ctx = buildAnalysisContext('lakehouse', {
        mapping: new Mapping('shouldNotAppear'),
        defaultRuntime: new PackageableRuntime('runtime::LakehouseRuntime'),
        mappingProvider: {
          element: 'RootProduct',
          keys: ['grp'],
        },
      });

      const { title, children } = renderLabelProps(ctx);

      expect(children).toBe('RootProduct');
      expect(title).toBe('Data Product: RootProduct');
      expect(children).not.toContain('shouldNotAppear');
    },
  );
});
