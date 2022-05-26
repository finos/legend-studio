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
  ChevronDoubleRightIcon,
  clsx,
  EmptyLightBulbIcon,
  LightBulbIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from './ApplicationStoreProvider';

export const VirtualAssistant = observer(() => {
  const applicationStore = useApplicationStore();
  const assistantService = applicationStore.assistantService;
  const currentContextualDocumentationEntry =
    assistantService.currentContextualDocumentationEntry;

  const toggleAssistant = (): void => {
    const newVal = !assistantService.isHidden;
    assistantService.setIsHidden(newVal);
    if (newVal) {
      assistantService.setIsOpen(false);
    }
  };

  return (
    <div className="virtual-assistant">
      <div
        //  NOTE: make sure when we change the documentation entry, the flashing animation
        // is replayed
        key={currentContextualDocumentationEntry?.uuid ?? ''}
        className={clsx('virtual-assistant__station', {
          'virtual-assistant__station--collapsed': assistantService.isHidden,
          'virtual-assistant__station--active':
            !assistantService.isHidden &&
            Boolean(currentContextualDocumentationEntry),
        })}
      >
        {!assistantService.isHidden && (
          <button
            className="virtual-assistant__station__trigger"
            tabIndex={-1}
            title={`${
              currentContextualDocumentationEntry
                ? 'Contextual documentation available.\n'
                : ''
            }Click to open assistant panel...`}
          >
            {currentContextualDocumentationEntry ? (
              <LightBulbIcon />
            ) : (
              <EmptyLightBulbIcon />
            )}
          </button>
        )}
        <button
          className="virtual-assistant__station__arrow"
          tabIndex={-1}
          onClick={toggleAssistant}
          title={
            assistantService.isHidden
              ? 'Click to show assistant'
              : 'Click to hide assistant'
          }
        >
          <ChevronDoubleRightIcon />
        </button>
      </div>
    </div>
  );
});
