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
import { useApplicationStore } from './ApplicationStoreProvider';

export const DocumentationLink: React.FC<{
  documentationKey: string;
  className?: string | undefined;
}> = (props) => {
  const { documentationKey, className } = props;
  const applicationStore = useApplicationStore();
  const documentationLink =
    applicationStore.docRegistry.getEntry(documentationKey);
  const openDocLink = (): void => {
    if (documentationLink) {
      applicationStore.navigator.openNewWindow(documentationLink);
    }
  };

  if (!documentationLink) {
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
