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

import type {
  DataSpaceDocResponse,
  DataSpaceExecutableMeta,
} from '@finos/legend-application-studio';
import type {
  DataSpace,
  DataSpaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  dataSpace_setDescription,
  dataSpace_setDiagramDescription,
  dataSpace_setDiagramTitle,
  dataSpace_setExecutableDescription,
  dataSpace_setExecutableTitle,
  dataSpace_setExecutionContextDescription,
  dataSpace_setTitle,
} from './studio/DSL_DataSpace_GraphModifierHelper.js';

/**
 * One title or description LegendAI proposes for a data space, for the user to
 * accept or reject. `read` and `write` locate the target by name/path/index
 * on whichever data space instance they are given, so they keep working on
 * the element found in a rebuilt graph.
 */
export type DataSpaceAISuggestionRow = {
  key: string;
  groupKey: string;
  groupLabel: string;
  fieldLabel: string;
  currentValue: string | undefined;
  suggestedValue: string;
  read: (dataSpace: DataSpace) => string | undefined;
  write: (dataSpace: DataSpace, value: string) => void;
};

const isBlank = (value: string | undefined): boolean => !value?.trim();

/**
 * Executables are matched by id; those declared without one are paired, in
 * order, with the remaining suggestions, as LegendAI lists them in grammar
 * order.
 */
const matchExecutables = (
  executables: DataSpaceExecutable[],
  metas: DataSpaceExecutableMeta[],
): Map<number, DataSpaceExecutableMeta> => {
  const matches = new Map<number, DataSpaceExecutableMeta>();
  const unmatchedMetaIndexes: number[] = [];
  metas.forEach((meta, metaIdx) => {
    const execIdx =
      meta.id === undefined || meta.id === null
        ? -1
        : executables.findIndex(
            (executable, idx) =>
              executable.id !== undefined &&
              executable.id === String(meta.id) &&
              !matches.has(idx),
          );
    if (execIdx === -1) {
      unmatchedMetaIndexes.push(metaIdx);
    } else {
      matches.set(execIdx, meta);
    }
  });
  const idlessExecIndexes = executables
    .map((executable, idx) => (executable.id === undefined ? idx : -1))
    .filter((idx) => idx !== -1 && !matches.has(idx));
  unmatchedMetaIndexes
    .slice(0, idlessExecIndexes.length)
    .forEach((metaIdx, i) =>
      matches.set(
        idlessExecIndexes[i] as number,
        metas[metaIdx] as DataSpaceExecutableMeta,
      ),
    );
  return matches;
};

export const buildDataSpaceAISuggestionRows = (
  dataSpace: DataSpace,
  suggestion: DataSpaceDocResponse,
): DataSpaceAISuggestionRow[] => {
  const rows: Omit<DataSpaceAISuggestionRow, 'currentValue'>[] = [];

  rows.push(
    {
      key: 'dataSpace.title',
      groupKey: 'dataSpace',
      groupLabel: 'Data Space',
      fieldLabel: 'Title',
      suggestedValue: suggestion.title,
      read: (ds) => ds.title,
      write: (ds, value) => dataSpace_setTitle(ds, value),
    },
    {
      key: 'dataSpace.description',
      groupKey: 'dataSpace',
      groupLabel: 'Data Space',
      fieldLabel: 'Description',
      suggestedValue: suggestion.description,
      read: (ds) => ds.description,
      write: (ds, value) => dataSpace_setDescription(ds, value),
    },
  );

  suggestion.executionContexts?.forEach((meta) => {
    const find = (ds: DataSpace) =>
      ds.executionContexts?.find((ec) => ec.name === meta.name);
    if (!find(dataSpace)) {
      return;
    }
    const groupKey = `executionContext:${meta.name}`;
    rows.push({
      key: `${groupKey}.description`,
      groupKey,
      groupLabel: `Execution Context · ${meta.name}`,
      fieldLabel: 'Description',
      suggestedValue: meta.description,
      read: (ds) => find(ds)?.description,
      write: (ds, value) => {
        const executionContext = find(ds);
        if (executionContext) {
          dataSpace_setExecutionContextDescription(executionContext, value);
        }
      },
    });
  });

  suggestion.diagrams?.forEach((meta) => {
    const find = (ds: DataSpace) =>
      ds.diagrams?.find((d) => d.diagram.value.path === meta.diagram);
    const diagram = find(dataSpace);
    if (!diagram) {
      return;
    }
    const groupKey = `diagram:${meta.diagram}`;
    const groupLabel = `Diagram · ${diagram.title || meta.diagram}`;
    rows.push(
      {
        key: `${groupKey}.title`,
        groupKey,
        groupLabel,
        fieldLabel: 'Title',
        suggestedValue: meta.title,
        read: (ds) => find(ds)?.title,
        write: (ds, value) => {
          const target = find(ds);
          if (target) {
            dataSpace_setDiagramTitle(target, value);
          }
        },
      },
      {
        key: `${groupKey}.description`,
        groupKey,
        groupLabel,
        fieldLabel: 'Description',
        suggestedValue: meta.description,
        read: (ds) => find(ds)?.description,
        write: (ds, value) => {
          const target = find(ds);
          if (target) {
            dataSpace_setDiagramDescription(target, value);
          }
        },
      },
    );
  });

  const executables = dataSpace.executables ?? [];
  const executableMatches = matchExecutables(
    executables,
    suggestion.executables ?? [],
  );
  Array.from(executableMatches.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([idx, meta]) => {
      const executable = executables[idx] as DataSpaceExecutable;
      const find = (ds: DataSpace) => ds.executables?.[idx];
      const groupKey = `executable:${idx}`;
      const groupLabel = `Executable · ${executable.title || (executable.id ?? idx + 1)}`;
      rows.push(
        {
          key: `${groupKey}.title`,
          groupKey,
          groupLabel,
          fieldLabel: 'Title',
          suggestedValue: meta.title,
          read: (ds) => find(ds)?.title,
          write: (ds, value) => {
            const target = find(ds);
            if (target) {
              dataSpace_setExecutableTitle(target, value);
            }
          },
        },
        {
          key: `${groupKey}.description`,
          groupKey,
          groupLabel,
          fieldLabel: 'Description',
          suggestedValue: meta.description,
          read: (ds) => find(ds)?.description,
          write: (ds, value) => {
            const target = find(ds);
            if (target) {
              dataSpace_setExecutableDescription(target, value);
            }
          },
        },
      );
    });

  return rows
    .map((row) => ({ ...row, currentValue: row.read(dataSpace) }))
    .filter(
      (row) =>
        !isBlank(row.suggestedValue) &&
        row.suggestedValue.trim() !== (row.currentValue ?? '').trim(),
    );
};

/**
 * Rows whose current value is empty are pre-selected; when the user asked to
 * regenerate everything, all rows are.
 */
export const isDataSpaceAISuggestionRowSelectedByDefault = (
  row: DataSpaceAISuggestionRow,
  overwrite: boolean,
): boolean => overwrite || isBlank(row.currentValue);

/**
 * Flattens the fields a suggestion wrote so the applied value can be compared
 * with what is eventually pushed.
 */
export const serializeDataSpaceAISuggestionFields = (
  dataSpace: DataSpace,
  rows: DataSpaceAISuggestionRow[],
): string => rows.map((row) => row.read(dataSpace) ?? '').join('\n');
