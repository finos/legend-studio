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
import { ActionAlert } from './ActionAlert.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { BlockingAlert } from './BlockingAlert.js';
import { NotificationManager } from './NotificationManager.js';

export const LegendApplicationComponentFrameworkProvider = observer(
  (props: { children: React.ReactNode }) => {
    const { children } = props;
    const applicationStore = useApplicationStore();

    return (
      <LegendStyleProvider>
        <BlockingAlert />
        <ActionAlert />
        <NotificationManager />
        <Backdrop className="backdrop" open={applicationStore.showBackdrop} />
        <DndProvider backend={HTML5Backend}>{children}</DndProvider>
      </LegendStyleProvider>
    );
  },
);
