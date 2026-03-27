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
import { unitTest } from '@finos/legend-shared/test';
import { V1_CompilationWarning } from '../V1_CompilationWarning.js';
import { V1_DefectSeverityLevel } from '../V1_Defect.js';

const TEST_DATA__pureWarningDefect = {
  defectSeverityLevel: 'WARN',
  defectTypeId: 'PureWarning',
  message: 'Duplicate column definitions [FirstName] in table: table1',
  sourceInformation: {
    endColumn: 5,
    endLine: 10,
    sourceId: '',
    startColumn: 5,
    startLine: 6,
  },
};

const TEST_DATA__errorDefect = {
  defectSeverityLevel: 'ERROR',
  defectTypeId: 'SomeError',
  message: 'Some error defect',
  sourceInformation: {
    endColumn: 1,
    endLine: 1,
    sourceId: '',
    startColumn: 1,
    startLine: 1,
  },
};

const TEST_DATA__infoDefect = {
  defectSeverityLevel: 'INFO',
  defectTypeId: 'SomeInfo',
  message: 'Some info defect',
  sourceInformation: {
    endColumn: 1,
    endLine: 1,
    sourceId: '',
    startColumn: 1,
    startLine: 1,
  },
};

describe(unitTest('V1_CompilationWarning serialization'), () => {
  test('should deserialize a PureWarning defect', () => {
    const warning = V1_CompilationWarning.serialization.fromJson(
      TEST_DATA__pureWarningDefect,
    );
    expect(warning.message).toBe(
      'Duplicate column definitions [FirstName] in table: table1',
    );
    expect(warning.defectSeverityLevel).toBe(V1_DefectSeverityLevel.WARN);
    expect(warning.defectTypeId).toBe('PureWarning');
    expect(warning.sourceInformation).toBeDefined();
    expect(warning.sourceInformation?.startLine).toBe(6);
    expect(warning.sourceInformation?.endLine).toBe(10);
  });
});

describe(unitTest('Defect severity filtering'), () => {
  const deserializeAndFilterWarnings = (
    defects: Record<string, unknown>[],
  ): V1_CompilationWarning[] => {
    return defects
      .map((defect) => V1_CompilationWarning.serialization.fromJson(defect))
      .filter(
        (defect) => defect.defectSeverityLevel === V1_DefectSeverityLevel.WARN,
      );
  };

  test('should include WARN-level defects', () => {
    const warnings = deserializeAndFilterWarnings([
      TEST_DATA__pureWarningDefect,
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.defectTypeId).toBe('PureWarning');
  });

  test('should exclude ERROR-level defects', () => {
    const warnings = deserializeAndFilterWarnings([
      TEST_DATA__pureWarningDefect,
      TEST_DATA__errorDefect,
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.defectTypeId).toBe('PureWarning');
  });

  test('should exclude INFO-level defects', () => {
    const warnings = deserializeAndFilterWarnings([
      TEST_DATA__pureWarningDefect,
      TEST_DATA__infoDefect,
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.defectTypeId).toBe('PureWarning');
  });

  test('should return empty array when all defects are non-WARN', () => {
    const warnings = deserializeAndFilterWarnings([
      TEST_DATA__errorDefect,
      TEST_DATA__infoDefect,
    ]);
    expect(warnings).toHaveLength(0);
  });

  test('should handle mixed severity levels correctly', () => {
    const warnings = deserializeAndFilterWarnings([
      TEST_DATA__pureWarningDefect,
      TEST_DATA__errorDefect,
      TEST_DATA__infoDefect,
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.defectTypeId).toBe('PureWarning');
  });
});
