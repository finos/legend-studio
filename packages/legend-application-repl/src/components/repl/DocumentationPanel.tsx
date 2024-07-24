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

import { useApplicationStore } from '@finos/legend-application';
import { MarkdownTextViewer } from '@finos/legend-art';
import { isString } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';

export const DocumentationPanel = observer(() => {
  const application = useApplicationStore();
  const entry = application.assistantService.currentDocumentationEntry;

  if (!entry) {
    return null;
  }
  return (
    <div className="h-full w-full overflow-auto bg-white p-4">
      <div className="mb-3 text-2xl font-bold">{entry.title}</div>
      {entry.content &&
        (isString(entry.content) ? (
          <div className="">{entry.content}</div>
        ) : (
          <MarkdownTextViewer value={entry.content} />
        ))}
    </div>
  );
});
