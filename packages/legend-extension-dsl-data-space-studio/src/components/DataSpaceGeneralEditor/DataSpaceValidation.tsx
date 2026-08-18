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

import { clsx, WarningIcon } from '@finos/legend-art';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '@finos/legend-extension-dsl-data-space/graph';

export type DataSpaceValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
};

export const InlineIssue: React.FC<{ issue: DataSpaceValidationIssue }> = (
  props,
) => (
  <div
    className={clsx('dataSpace-editor__inline-warning', {
      'dataSpace-editor__inline-warning--error':
        props.issue.severity === 'error',
      'dataSpace-editor__inline-warning--warning':
        props.issue.severity === 'warning',
    })}
  >
    <WarningIcon />
    <span>{props.issue.message}</span>
  </div>
);

export const hasNoMappingSource = (
  executionContext: DataSpaceExecutionContext,
): boolean => !executionContext.mapping && !executionContext.mappingProvider;

export const collectExecutionContextValidationIssues = (
  executionContext: DataSpaceExecutionContext,
): DataSpaceValidationIssue[] => {
  const issues: DataSpaceValidationIssue[] = [];
  const hasMapping = Boolean(executionContext.mapping);
  const hasMappingProvider = Boolean(executionContext.mappingProvider);
  if (hasMapping && hasMappingProvider) {
    issues.push({
      severity: 'error',
      message: `Only one of mapping and mapping provider can be set.`,
    });
  }
  if (
    executionContext.mappingProvider &&
    !executionContext.mappingProvider.keys.length
  ) {
    issues.push({
      severity: 'error',
      message: `Select an access point group for the mapping provider.`,
    });
  }
  return issues;
};

export const hasExecutionContextValidationError = (
  executionContext: DataSpaceExecutionContext,
): boolean =>
  hasNoMappingSource(executionContext) ||
  collectExecutionContextValidationIssues(executionContext).some(
    (issue) => issue.severity === 'error',
  );

export const dataSpaceNeedsExecutionContextOrExecutable = (
  dataSpace: DataSpace,
): boolean =>
  !dataSpace.executionContexts?.length && !dataSpace.executables?.length;
