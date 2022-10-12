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

import { clsx, QuestionCircleIcon } from '@finos/legend-art';
import { shouldDisplayVirtualAssistantDocumentationEntry } from '../../stores/AssistantService.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';

export const DocumentationLink: React.FC<{
  documentationKey: string;
  className?: string | undefined;
}> = (props) => {
  const { documentationKey, className } = props;
  const applicationStore = useApplicationStore();
  const documentationEntry =
    applicationStore.documentationService.getDocEntry(documentationKey);
  const openDocLink = (): void => {
    if (documentationEntry) {
      if (shouldDisplayVirtualAssistantDocumentationEntry(documentationEntry)) {
        applicationStore.assistantService.openDocumentationEntry(
          documentationKey,
        );
      } else if (documentationEntry.url) {
        applicationStore.navigator.visitAddress(documentationEntry.url);
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
    <QuestionCircleIcon
      title="Click to see documentation"
      onClick={openDocLink}
      className={clsx('documentation-link', className)}
    />
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

  if (!documentationEntry) {
    return null;
  }
  return (
    <div className={clsx('documentation-preview', className)}>
      <div className="documentation-preview__text">
        {text ?? documentationEntry?.text}
      </div>
      <div className="documentation-preview__hint">
        <DocumentationLink documentationKey={documentationKey} />
      </div>
    </div>
  );
};
