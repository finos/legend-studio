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

import { describe, expect, jest, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  DataSpaceMappingProvider,
  resolveExecutionContextMapping,
} from '@finos/legend-extension-dsl-data-space/graph';
import { buildExecutionContextOption } from '@finos/legend-extension-dsl-data-space/application-query';
import {
  QueryBuilderEmbeddedFromExecutionContextState,
  QueryBuilderExternalExecutionContextState,
  QueryBuilderConfig,
} from '@finos/legend-query-builder';
import {
  LambdaFunction,
  Multiplicity,
  FunctionType,
  PrimitiveType,
  PackageableElementExplicitReference,
  RuntimePointer,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  buildContext,
  buildDataSpace,
  buildMapping,
  buildMappingProvider,
  buildRuntime,
  buildState,
} from '../__test-utils__/DataSpaceQueryBuilderStateTestUtils.js';

describe('DataSpaceQueryBuilderState with a mappingProvider-backed context', () => {
  test(
    unitTest(
      'the state resolves the MAPG to the underlying mapping (parity with a `mapping:` context)',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');

      const mapgContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(usageStatsMapping),
        defaultRuntime: runtime,
      });
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace(
          'UsageStatsDataSpace',
          [mapgContext, directContext],
          'lakehouse',
        ),
        mapgContext,
      );

      expect(state.executionContext).toBe(mapgContext);
      expect(resolveExecutionContextMapping(mapgContext)).toBe(
        usageStatsMapping,
      );
      expect(resolveExecutionContextMapping(directContext)).toBe(
        usageStatsMapping,
      );
    },
  );

  test(
    unitTest(
      'switching from a `mapping:` context to a `mappingProvider:` context keeps the same mapping bound',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');

      const mapgContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(usageStatsMapping),
        defaultRuntime: runtime,
      });
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace(
          'UsageStatsDataSpace',
          [directContext, mapgContext],
          'direct',
        ),
        directContext,
      );

      expect(resolveExecutionContextMapping(state.executionContext)).toBe(
        usageStatsMapping,
      );

      state.setExecutionContext(mapgContext);

      expect(state.executionContext).toBe(mapgContext);
      expect(resolveExecutionContextMapping(state.executionContext)).toBe(
        usageStatsMapping,
      );
    },
  );

  test(
    unitTest(
      'a MAPG-backed context with a stale APG id fails to resolve - the creator store surfaces this',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const provider = buildMappingProvider(usageStatsMapping);
      provider.keys = ['aGroupThatWasRenamed'];

      const mapgContext = buildContext('lakehouse', {
        mappingProvider: provider,
        defaultRuntime: buildRuntime('LakehouseRuntime'),
      });

      expect(resolveExecutionContextMapping(mapgContext)).toBeUndefined();
    },
  );

  test(
    unitTest(
      'switches to embedded execution context state so top-level mapping/runtime drop out of the plan request',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');

      const mapgContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(usageStatsMapping),
        defaultRuntime: runtime,
      });
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace(
          'UsageStatsDataSpace',
          [directContext, mapgContext],
          'direct',
        ),
        directContext,
      );

      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderExternalExecutionContextState,
      );
      state.executionContextState.setMapping(usageStatsMapping);
      state.executionContextState.setRuntimeValue(
        new RuntimePointer(PackageableElementExplicitReference.create(runtime)),
      );
      expect(state.executionContextState.explicitMappingValue).toBe(
        usageStatsMapping,
      );
      expect(state.executionContextState.explicitRuntimeValue).toBeInstanceOf(
        RuntimePointer,
      );

      state.setExecutionContext(mapgContext);
      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderEmbeddedFromExecutionContextState,
      );
      expect(state.executionContextState.explicitMappingValue).toBeUndefined();
      expect(state.executionContextState.explicitRuntimeValue).toBeUndefined();
      expect(state.executionContextState.mapping).toBe(usageStatsMapping);
      expect(state.executionContextState.runtimeValue).toBeInstanceOf(
        RuntimePointer,
      );

      state.setExecutionContext(directContext);
      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderExternalExecutionContextState,
      );
      expect(state.executionContextState.explicitMappingValue).toBe(
        usageStatsMapping,
      );
    },
  );

  test(
    unitTest(
      "typed-TDS is respected: a non-MAPG DataSpace launched with `enableTypedTDS: true` keeps the base's Embedded state instead of being downgraded to External",
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const config = new QueryBuilderConfig();
      config.enableTypedTDS = true;

      const state = buildState(
        buildDataSpace('UsageStatsDataSpace', [directContext], 'direct'),
        directContext,
        { config },
      );

      expect(state.isFetchStructureTyped).toBe(true);
      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderEmbeddedFromExecutionContextState,
      );
      expect(state.executionContextState.explicitMappingValue).toBeUndefined();
      expect(state.executionContextState.explicitRuntimeValue).toBeUndefined();
    },
  );

  test(
    unitTest(
      'typed-TDS is respected: switching MAPG -> non-MAPG while typed-TDS is on keeps the state Embedded',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const mapgContext = buildContext('lakehouse', {
        mappingProvider: buildMappingProvider(usageStatsMapping),
        defaultRuntime: runtime,
      });
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const config = new QueryBuilderConfig();
      config.enableTypedTDS = true;

      const state = buildState(
        buildDataSpace(
          'UsageStatsDataSpace',
          [mapgContext, directContext],
          'lakehouse',
        ),
        mapgContext,
        { config },
      );

      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderEmbeddedFromExecutionContextState,
      );

      state.setExecutionContext(directContext);
      expect(state.executionContextState).toBeInstanceOf(
        QueryBuilderEmbeddedFromExecutionContextState,
      );
    },
  );

  test(
    unitTest(
      'buildExecutionContextExpression wraps the lambda body in ->with(DataProduct)->from(Runtime) for a mapping-provider context',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const provider = buildMappingProvider(usageStatsMapping);
      const dataProduct = provider.element.value;

      const mapgContext = buildContext('lakehouse', {
        mappingProvider: provider,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace('UsageStatsDataSpace', [mapgContext], 'lakehouse'),
        mapgContext,
      );
      state.executionContextState.setRuntimeValue(
        new RuntimePointer(PackageableElementExplicitReference.create(runtime)),
      );

      const bodyExpression = new SimpleFunctionExpression('getAll');
      const lambda = new LambdaFunction(
        new FunctionType(
          PackageableElementExplicitReference.create(PrimitiveType.STRING),
          Multiplicity.ONE,
        ),
      );
      lambda.expressionSequence = [bodyExpression];

      const result = state.buildExecutionContextExpression(lambda);

      const outer = result.expressionSequence[0];
      expect(outer).toBeInstanceOf(SimpleFunctionExpression);
      const fromExpr = outer as SimpleFunctionExpression;
      expect(
        matchFunctionName(fromExpr.functionName, SUPPORTED_FUNCTIONS.FROM),
      ).toBe(true);
      expect(fromExpr.parametersValues.length).toBe(2);

      const withExpr = fromExpr.parametersValues[0] as SimpleFunctionExpression;
      expect(withExpr).toBeInstanceOf(SimpleFunctionExpression);
      expect(
        matchFunctionName(withExpr.functionName, SUPPORTED_FUNCTIONS.WITH),
      ).toBe(true);
      expect(withExpr.parametersValues.length).toBe(2);

      expect(withExpr.parametersValues[0]).toBe(bodyExpression);
      const withArg = withExpr.parametersValues[1] as unknown as {
        values: unknown[];
      };
      expect(withArg.values[0]).toMatchObject({ value: dataProduct });
      const fromArg = fromExpr.parametersValues[1] as unknown as {
        values: unknown[];
      };
      expect(fromArg.values[0]).toMatchObject({ value: runtime });
    },
  );

  test(
    unitTest(
      'buildExecutionContextExpression falls through to base grammar for direct-mapping contexts',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace('UsageStatsDataSpace', [directContext], 'direct'),
        directContext,
      );
      state.executionContextState.setMapping(usageStatsMapping);
      state.executionContextState.setRuntimeValue(
        new RuntimePointer(PackageableElementExplicitReference.create(runtime)),
      );

      const bodyExpression = new SimpleFunctionExpression('getAll');
      const lambda = new LambdaFunction(
        new FunctionType(
          PackageableElementExplicitReference.create(PrimitiveType.STRING),
          Multiplicity.ONE,
        ),
      );
      lambda.expressionSequence = [bodyExpression];

      const result = state.buildExecutionContextExpression(lambda);

      expect(result.expressionSequence[0]).toBe(bodyExpression);
    },
  );

  test(
    unitTest(
      'a mapping provider whose element is not a DataProduct surfaces a notification instead of crashing',
    ),
    () => {
      const usageStatsMapping = buildMapping('UsageStatsMapping');
      const runtime = buildRuntime('LakehouseRuntime');
      const bogusProvider = new DataSpaceMappingProvider();
      bogusProvider.element =
        PackageableElementExplicitReference.create(usageStatsMapping);
      bogusProvider.keys = [];
      const bogusContext = buildContext('bogus', {
        mappingProvider: bogusProvider,
        defaultRuntime: runtime,
      });
      const directContext = buildContext('direct', {
        mapping: usageStatsMapping,
        defaultRuntime: runtime,
      });

      const state = buildState(
        buildDataSpace(
          'UsageStatsDataSpace',
          [directContext, bogusContext],
          'direct',
        ),
        directContext,
      );

      const notifyErrorSpy = jest.spyOn(
        state.applicationStore.notificationService,
        'notifyError',
      );

      const beforeState = state.executionContextState;
      state.setExecutionContext(bogusContext);
      expect(notifyErrorSpy).toHaveBeenCalledTimes(0);
      expect(state.executionContextState).toBe(beforeState);

      const bodyExpression = new SimpleFunctionExpression('getAll');
      const lambda = new LambdaFunction(
        new FunctionType(
          PackageableElementExplicitReference.create(PrimitiveType.STRING),
          Multiplicity.ONE,
        ),
      );
      lambda.expressionSequence = [bodyExpression];

      const result = state.buildExecutionContextExpression(lambda);
      expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
      expect(result.expressionSequence[0]).toBe(bodyExpression);
    },
  );
});

describe(
  unitTest('buildExecutionContextOption (setup panel context selector)'),
  () => {
    test(
      unitTest(
        'a MAPG-backed context renders with the same option shape as a direct-mapping context',
      ),
      () => {
        const runtime = buildRuntime('LakehouseRuntime');
        const mapping = buildMapping('CovidLakehouseMapping');

        const directContext = buildContext('lakehouse', {
          mapping,
          defaultRuntime: runtime,
        });
        const mapgContext = buildContext('lakehouse', {
          mappingProvider: buildMappingProvider(mapping),
          defaultRuntime: runtime,
        });

        const directOption = buildExecutionContextOption(directContext);
        const mapgOption = buildExecutionContextOption(mapgContext);

        expect(directOption.label).toBe('lakehouse');
        expect(mapgOption.label).toBe('lakehouse');
        expect(mapgOption.value).toBe(mapgContext);
      },
    );
  },
);
