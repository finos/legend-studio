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

import {
  shouldDisplayVirtualAssistantDocumentationEntry,
  useApplicationStore,
} from '@finos/legend-application';
import { cn, DataCubeIcon, MarkdownTextViewer } from '@finos/legend-art';
import { isString } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useREPLStore } from '../REPLStoreProvider.js';

export const DocumentationPanelLink: React.FC<{
  documentationKey: string;
  title?: string | undefined;
  className?: string | undefined;
}> = ({ documentationKey, title, className }) => {
  const application = useApplicationStore();
  const repl = useREPLStore();
  const documentationEntry =
    application.documentationService.getDocEntry(documentationKey);
  const openDocLink: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const entry =
      application.documentationService.getDocEntry(documentationKey);
    if (entry) {
      if (shouldDisplayVirtualAssistantDocumentationEntry(entry)) {
        application.assistantService.openDocumentationEntry(documentationKey);
        repl.documentationDisplay.open();
      } else if (entry.url) {
        application.navigationService.navigator.visitAddress(entry.url);
      }
    }
  };

  if (
    !documentationEntry ||
    (!documentationEntry.url &&
      !shouldDisplayVirtualAssistantDocumentationEntry(documentationEntry))
  ) {
    return null;
  }
  return (
    <div
      onClick={openDocLink}
      title={title ?? 'Click to see documentation'}
      className={cn('cursor-pointer text-xl text-sky-500', className)}
    >
      <DataCubeIcon.DocumentationHint />
    </div>
  );
};

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
