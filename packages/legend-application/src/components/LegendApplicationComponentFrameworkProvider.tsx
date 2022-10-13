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

import { Backdrop, LegendStyleProvider } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { type KeyMap, GlobalHotKeys } from 'react-hotkeys';
import { ActionAlert } from './ActionAlert.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { BlockingAlert } from './BlockingAlert.js';
import { NotificationManager } from './NotificationManager.js';

const buildReactHotkeysConfiguration = (
  commandKeyMap: Map<string, string | undefined>,
  handlerCreator: (
    keyCombination: string,
  ) => (keyEvent?: KeyboardEvent) => void,
): [KeyMap, { [key: string]: (keyEvent?: KeyboardEvent) => void }] => {
  const keyMap: Record<PropertyKey, string[]> = {};
  commandKeyMap.forEach((keyCombination, commandKey) => {
    if (keyCombination) {
      keyMap[commandKey] = [keyCombination];
    }
  });
  const handlers: Record<PropertyKey, (keyEvent?: KeyboardEvent) => void> = {};
  commandKeyMap.forEach((keyCombination, commandKey) => {
    if (keyCombination) {
      handlers[commandKey] = handlerCreator(keyCombination);
    }
  });
  return [keyMap, handlers];
};

export const LegendApplicationComponentFrameworkProvider = observer(
  (props: { children: React.ReactNode }) => {
    const { children } = props;
    const applicationStore = useApplicationStore();

    const [keyMap, hotkeyHandlerMap] = buildReactHotkeysConfiguration(
      applicationStore.keyboardShortcutsService.commandKeyMap,
      (keyCombination: string) => (event?: KeyboardEvent) => {
        // TODO: consider if we should prevent default here at all we should
        // consider having a list of key combinations to prevent default, i.e. `event?.preventDefault();`
        // such as those of browsers' features
        applicationStore.keyboardShortcutsService.dispatch(keyCombination);
      },
    );

    return (
      <LegendStyleProvider>
        <BlockingAlert />
        <ActionAlert />
        <NotificationManager />
        <Backdrop className="backdrop" open={applicationStore.showBackdrop} />
        <DndProvider backend={HTML5Backend}>
          <GlobalHotKeys
            keyMap={keyMap}
            handlers={hotkeyHandlerMap}
            allowChanges={true}
          >
            {children}
          </GlobalHotKeys>
        </DndProvider>
      </LegendStyleProvider>
    );
  },
);
