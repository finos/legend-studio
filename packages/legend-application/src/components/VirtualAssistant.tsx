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
  clsx,
  ChevronDoubleRightIcon,
  EmptyLightBulbIcon,
  LightBulbIcon,
  BasePopper,
  TimesIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { useApplicationStore } from './ApplicationStoreProvider';

export const VirtualAssistantPanel = observer(
  (props: { triggerElement: HTMLElement | null }) => {
    const { triggerElement } = props;
    const applicationStore = useApplicationStore();
    const assistantService = applicationStore.assistantService;

    return (
      <BasePopper
        open={assistantService.isOpen}
        className="virtual-assistant__panel__container"
        anchorEl={triggerElement}
        placement="top-end"
      >
        <div className="virtual-assistant__panel"></div>
      </BasePopper>
    );
  },
);

export const VirtualAssistant = observer(() => {
  const applicationStore = useApplicationStore();
  const assistantService = applicationStore.assistantService;
  const currentContextualDocumentationEntry =
    assistantService.currentContextualDocumentationEntry;
  const assistantRef = useRef<HTMLDivElement>(null);
  const toggleAssistantPanel = (): void => {
    assistantService.setIsOpen(!assistantService.isOpen);
  };

  const toggleAssistant = (): void => {
    const newVal = !assistantService.isHidden;
    assistantService.setIsHidden(newVal);
    if (newVal) {
      assistantService.setIsOpen(false);
    }
  };

  return (
    <div className="virtual-assistant" ref={assistantRef}>
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
          <>
            <button
              className="virtual-assistant__station__trigger"
              tabIndex={-1}
              onClick={toggleAssistantPanel}
              title={
                assistantService.isOpen
                  ? `Click to close assistant panel`
                  : `${
                      currentContextualDocumentationEntry
                        ? 'Contextual support available.\n'
                        : ''
                    }Click to open assistant panel...`
              }
            >
              {assistantService.isOpen ? (
                <TimesIcon />
              ) : currentContextualDocumentationEntry ? (
                <LightBulbIcon />
              ) : (
                <EmptyLightBulbIcon />
              )}
            </button>
            {assistantRef.current && (
              <VirtualAssistantPanel triggerElement={assistantRef.current} />
            )}
          </>
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
