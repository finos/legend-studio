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

import { format } from 'sql-formatter';

/** A statement laid out on lines, as Legend Query shows its SQL; as it came when it can't be read */
export const formatCubeSqlStatement = (statement: string): string => {
  try {
    return format(statement, { language: 'sql' });
  } catch {
    return statement;
  }
};

/** A run's statements, each formatted, numbered as Legend Query numbers them when there are several */
export const formatCubeSql = (statements: readonly string[]): string =>
  statements.length === 1
    ? formatCubeSqlStatement(statements[0] as string)
    : statements
        .map(
          (statement, index) =>
            `--QUERY #${index + 1}\n${formatCubeSqlStatement(statement)}`,
        )
        .join('\n\n');
