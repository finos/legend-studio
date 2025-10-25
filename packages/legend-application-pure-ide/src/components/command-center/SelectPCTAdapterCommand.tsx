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

import { observer } from 'mobx-react-lite';
import {
  compareLabelFn,
  CustomSelectorInput,
  Dialog,
  type SelectComponent,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { flowResult } from 'mobx';
import type { PCTAdapter } from '../../server/models/Test.js';
import { useRef, useState } from 'react';

function buildPCTAdapterOption(adapter: PCTAdapter) {
  return {
    label: adapter.name === '' ? adapter.func : adapter.name,
    value: adapter,
  };
}

export const SelectPCTAdapterCommand = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const selectorRef = useRef<SelectComponent>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeModal = (): void => ideStore.setPCTRunPath(undefined);
  const runPCT = (val: { label: string; value: PCTAdapter } | null): void => {
    if (val) {
      ideStore.setSelectedPCTAdapter(val.value);
      if (ideStore.PCTRunPath) {
        flowResult(
          ideStore.executeTests(
            ideStore.PCTRunPath,
            false,
            ideStore.selectedPCTAdapter?.func,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
      closeModal();
    }
  };
  const handleEnter = (): void => {
    selectorRef.current?.focus();
  };

  return (
    <Dialog
      open={Boolean(ideStore.PCTRunPath)}
      onClose={closeModal}
      classes={{ container: 'command-modal__container' }}
      slotProps={{
        transition: { onEnter: handleEnter },
        paper: { classes: { root: 'command-modal__inner-container' } },
      }}
    >
      <div className="modal modal--dark command-modal">
        <div className="modal__title">Select PCT Adapter</div>
        <div className="command-modal__content">
          <CustomSelectorInput
            inputRef={selectorRef}
            className="command-modal__content__input"
            options={ideStore.PCTAdapters.map(buildPCTAdapterOption).sort(
              compareLabelFn,
            )}
            onMenuOpen={() => setMenuOpen(true)}
            onMenuClose={() => setMenuOpen(false)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                ideStore.selectedPCTAdapter &&
                !menuOpen
              ) {
                event.stopPropagation();
                event.preventDefault();
                runPCT(buildPCTAdapterOption(ideStore.selectedPCTAdapter));
              }
            }}
            value={
              ideStore.selectedPCTAdapter
                ? buildPCTAdapterOption(ideStore.selectedPCTAdapter)
                : null
            }
            onChange={runPCT}
            placeholder="Select a PCT adapter"
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
      </div>
    </Dialog>
  );
});
