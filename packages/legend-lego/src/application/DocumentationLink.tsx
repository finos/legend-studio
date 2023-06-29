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
import { clsx, QuestionCircleIcon } from '@finos/legend-art';

export const DocumentationLink: React.FC<{
  documentationKey: string;
  inline?: boolean | undefined;
  title?: string | undefined;
  className?: string | undefined;
}> = ({ documentationKey, title, className, inline = true }) => {
  const applicationStore = useApplicationStore();
  const documentationEntry =
    applicationStore.documentationService.getDocEntry(documentationKey);
  const openDocLink: React.MouseEventHandler<HTMLDivElement> = (
    event,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    applicationStore.assistantService.openDocumentationEntryLink(
      documentationKey,
    );
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
      className={clsx('documentation-link', className, {
        'documentation-link--inline': inline,
      })}
    >
      <QuestionCircleIcon />
    </div>
  );
};

export const DocumentationPreview: React.FC<{
  text?: string | undefined;
  documentationKey: string;
  className?: string | undefined;
}> = (props) => {
  const { documentationKey, text, className } = props;
  const applicationStore = useApplicationStore();
  const documentationEntry =
    applicationStore.documentationService.getDocEntry(documentationKey);
  const textContent = text ?? documentationEntry?.text;

  if (!textContent) {
    return null;
  }
  return (
    <div className={clsx('documentation-preview', className)}>
      <div className="documentation-preview__text">{textContent}</div>
      <div className="documentation-preview__hint">
        {documentationEntry && (
          <DocumentationLink documentationKey={documentationKey} />
        )}
      </div>
    </div>
  );
};
