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

import { test, expect, describe } from '@jest/globals';
import { unitTest, integrationTest } from '@finos/legend-shared/test';
import {
  Enumeration,
  ObserverContext,
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  PrimitiveType,
  PrecisePrimitiveType,
} from '@finos/legend-graph';
import { buildDefaultInstanceValue } from '../shared/ValueSpecificationEditorHelper.js';
import {
  getStandardPrimitiveTypeEquivalent,
  isTypeCompatibleForAssignment,
} from '../QueryBuilderValueSpecificationHelper.js';
import { TEST__setUpGraphManagerState } from '../../components/__test-utils__/QueryBuilderComponentTestUtils.js';
import { TEST__LegendApplicationPluginManager } from '../__test-utils__/QueryBuilderStateTestUtils.js';
import TEST_DATA__SimpleRelationalModel from './TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };

describe('buildDefaultInstanceValue', () => {
  test(
    integrationTest(
      'builds default string value for standard PrimitiveType.STRING',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrimitiveType.STRING,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.STRING);
      expect((result as PrimitiveInstanceValue).values[0]).toBe('');
    },
  );

  test(
    integrationTest(
      'builds default integer value for standard PrimitiveType.INTEGER',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrimitiveType.INTEGER,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.INTEGER);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(0);
    },
  );

  test(
    integrationTest(
      'builds default boolean value for standard PrimitiveType.BOOLEAN',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrimitiveType.BOOLEAN,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.BOOLEAN);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(false);
    },
  );

  test(
    integrationTest(
      'builds default null value for standard PrimitiveType.STRING when initialization is disabled',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrimitiveType.STRING,
        observerContext,
        false,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect((result as PrimitiveInstanceValue).values[0]).toBeNull();
    },
  );

  test(
    integrationTest(
      'builds default string value for PrecisePrimitiveType.VARCHAR',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.VARCHAR,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      // Should resolve to standard String type
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.STRING);
      expect((result as PrimitiveInstanceValue).values[0]).toBe('');
    },
  );

  test(
    integrationTest(
      'builds default integer value for PrecisePrimitiveType.INT',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.INT,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.INTEGER);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(0);
    },
  );

  test(
    integrationTest(
      'builds default integer value for PrecisePrimitiveType.BIG_INT',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.BIG_INT,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.INTEGER);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(0);
    },
  );

  test(
    integrationTest(
      'builds default float value for PrecisePrimitiveType.DOUBLE',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.DOUBLE,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.FLOAT);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(0);
    },
  );

  test(
    integrationTest(
      'builds default decimal value for PrecisePrimitiveType.NUMERIC',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.NUMERIC,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.DECIMAL);
      expect((result as PrimitiveInstanceValue).values[0]).toBe(0);
    },
  );

  test(
    integrationTest(
      'builds default datetime value for PrecisePrimitiveType.TIMESTAMP',
    ),
    async () => {
      const pluginManager = TEST__LegendApplicationPluginManager.create();
      const graphManagerState = await TEST__setUpGraphManagerState(
        TEST_DATA__SimpleRelationalModel,
        pluginManager,
      );
      const observerContext = new ObserverContext(
        graphManagerState.pluginManager.getPureGraphManagerPlugins(),
      );
      const result = buildDefaultInstanceValue(
        graphManagerState.graph,
        PrecisePrimitiveType.TIMESTAMP,
        observerContext,
        true,
      );
      expect(result).toBeInstanceOf(PrimitiveInstanceValue);
      expect(
        (result as PrimitiveInstanceValue).genericType.value.rawType.path,
      ).toBe(PRIMITIVE_TYPE.DATETIME);
      // DateTime default should be a string matching datetime format
      expect(typeof (result as PrimitiveInstanceValue).values[0]).toBe(
        'string',
      );
    },
  );
});

describe('getStandardPrimitiveTypeEquivalent', () => {
  test(
    unitTest('returns PRIMITIVE_TYPE for standard PrimitiveType instances'),
    () => {
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.STRING)).toBe(
        PRIMITIVE_TYPE.STRING,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.INTEGER)).toBe(
        PRIMITIVE_TYPE.INTEGER,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.FLOAT)).toBe(
        PRIMITIVE_TYPE.FLOAT,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.DECIMAL)).toBe(
        PRIMITIVE_TYPE.DECIMAL,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.BOOLEAN)).toBe(
        PRIMITIVE_TYPE.BOOLEAN,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.DATE)).toBe(
        PRIMITIVE_TYPE.DATE,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.STRICTDATE)).toBe(
        PRIMITIVE_TYPE.STRICTDATE,
      );
      expect(getStandardPrimitiveTypeEquivalent(PrimitiveType.DATETIME)).toBe(
        PRIMITIVE_TYPE.DATETIME,
      );
    },
  );

  test(
    unitTest('returns standard equivalent for PrecisePrimitiveType instances'),
    () => {
      expect(
        getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.VARCHAR),
      ).toBe(PRIMITIVE_TYPE.STRING);
      expect(getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.INT)).toBe(
        PRIMITIVE_TYPE.INTEGER,
      );
      expect(
        getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.BIG_INT),
      ).toBe(PRIMITIVE_TYPE.INTEGER);
      expect(
        getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.DOUBLE),
      ).toBe(PRIMITIVE_TYPE.FLOAT);
      expect(
        getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.NUMERIC),
      ).toBe(PRIMITIVE_TYPE.DECIMAL);
      expect(
        getStandardPrimitiveTypeEquivalent(PrecisePrimitiveType.TIMESTAMP),
      ).toBe(PRIMITIVE_TYPE.DATETIME);
    },
  );

  test(unitTest('returns undefined for non-primitive types'), () => {
    const enumeration = new Enumeration('test::MyEnum');
    expect(getStandardPrimitiveTypeEquivalent(enumeration)).toBeUndefined();
  });
});

describe('isTypeCompatibleForAssignment', () => {
  // ---- Standard primitive compatibility ----

  test(unitTest('returns false for undefined type'), () => {
    expect(isTypeCompatibleForAssignment(undefined, PrimitiveType.STRING)).toBe(
      false,
    );
  });

  test(unitTest('same standard types are compatible'), () => {
    expect(
      isTypeCompatibleForAssignment(PrimitiveType.STRING, PrimitiveType.STRING),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(
        PrimitiveType.INTEGER,
        PrimitiveType.INTEGER,
      ),
    ).toBe(true);
  });

  test(unitTest('numeric types are cross-compatible (autoboxing)'), () => {
    expect(
      isTypeCompatibleForAssignment(PrimitiveType.FLOAT, PrimitiveType.INTEGER),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(
        PrimitiveType.DECIMAL,
        PrimitiveType.NUMBER,
      ),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(PrimitiveType.INTEGER, PrimitiveType.FLOAT),
    ).toBe(true);
  });

  test(unitTest('date types are loosely compatible'), () => {
    expect(
      isTypeCompatibleForAssignment(
        PrimitiveType.STRICTDATE,
        PrimitiveType.DATETIME,
      ),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(PrimitiveType.DATE, PrimitiveType.DATETIME),
    ).toBe(true);
  });

  test(unitTest('incompatible standard types return false'), () => {
    expect(
      isTypeCompatibleForAssignment(
        PrimitiveType.STRING,
        PrimitiveType.INTEGER,
      ),
    ).toBe(false);
    expect(
      isTypeCompatibleForAssignment(PrimitiveType.BOOLEAN, PrimitiveType.FLOAT),
    ).toBe(false);
  });

  // ---- Precise primitive compatibility ----

  test(unitTest('precise VARCHAR is compatible with standard STRING'), () => {
    expect(
      isTypeCompatibleForAssignment(
        PrecisePrimitiveType.VARCHAR,
        PrimitiveType.STRING,
      ),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(
        PrimitiveType.STRING,
        PrecisePrimitiveType.VARCHAR,
      ),
    ).toBe(true);
  });

  test(
    unitTest('precise INT types are compatible with standard numeric types'),
    () => {
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.INT,
          PrimitiveType.INTEGER,
        ),
      ).toBe(true);
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.BIG_INT,
          PrimitiveType.FLOAT,
        ),
      ).toBe(true);
      expect(
        isTypeCompatibleForAssignment(
          PrimitiveType.DECIMAL,
          PrecisePrimitiveType.INT,
        ),
      ).toBe(true);
    },
  );

  test(
    unitTest('precise DOUBLE is compatible with standard numeric types'),
    () => {
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.DOUBLE,
          PrimitiveType.INTEGER,
        ),
      ).toBe(true);
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.DOUBLE,
          PrimitiveType.FLOAT,
        ),
      ).toBe(true);
    },
  );

  test(
    unitTest('precise TIMESTAMP is compatible with standard date types'),
    () => {
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.TIMESTAMP,
          PrimitiveType.DATETIME,
        ),
      ).toBe(true);
      expect(
        isTypeCompatibleForAssignment(
          PrimitiveType.STRICTDATE,
          PrecisePrimitiveType.TIMESTAMP,
        ),
      ).toBe(true);
    },
  );

  test(
    unitTest('precise NUMERIC is compatible with standard numeric types'),
    () => {
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.NUMERIC,
          PrimitiveType.DECIMAL,
        ),
      ).toBe(true);
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.NUMERIC,
          PrimitiveType.INTEGER,
        ),
      ).toBe(true);
    },
  );

  test(
    unitTest('precise types across different families are incompatible'),
    () => {
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.VARCHAR,
          PrimitiveType.INTEGER,
        ),
      ).toBe(false);
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.INT,
          PrimitiveType.STRING,
        ),
      ).toBe(false);
      // NOTE: date types are loosely compatible by design (accepted as RHS for any LHS),
      // so TIMESTAMP vs STRING returns true — this is correct behavior.
      expect(
        isTypeCompatibleForAssignment(
          PrecisePrimitiveType.TIMESTAMP,
          PrimitiveType.STRING,
        ),
      ).toBe(true);
    },
  );

  test(unitTest('two precise types in same family are compatible'), () => {
    expect(
      isTypeCompatibleForAssignment(
        PrecisePrimitiveType.INT,
        PrecisePrimitiveType.BIG_INT,
      ),
    ).toBe(true);
    expect(
      isTypeCompatibleForAssignment(
        PrecisePrimitiveType.DOUBLE,
        PrecisePrimitiveType.NUMERIC,
      ),
    ).toBe(true);
  });
});
