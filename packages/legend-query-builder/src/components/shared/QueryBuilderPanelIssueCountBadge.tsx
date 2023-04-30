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

import { TimesCircleIcon } from '@finos/legend-art';
import { quantifyList } from '@finos/legend-shared';

export const QueryBuilderPanelIssueCountBadge: React.FC<{
  issues: string[] | undefined;
}> = (props) => {
  const { issues } = props;
  if (!issues) {
    return null;
  }
  const labelText = quantifyList(issues, 'issue');
  return (
    <div
      className="query-builder-panel-issue-count-badge"
      title={`Found ${labelText}:\n${issues
        .map((issue) => `\u2022 ${issue}`)
        .join('\n')}`}
    >
      <TimesCircleIcon className="query-builder-panel-issue-count-badge__icon" />
      <div className="query-builder-panel-issue-count-badge__text">
        {labelText}
      </div>
    </div>
  );
};
