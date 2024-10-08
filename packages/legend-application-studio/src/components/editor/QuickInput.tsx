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

import React, { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type SelectComponent,
  NonBlockingDialog,
  createFilter,
  CustomSelectorInput,
  Modal,
} from '@finos/legend-art';
import type {
  QuickInputOption,
  QuickInputState,
} from '../../stores/editor/QuickInputState.js';
import { useEditorStore } from './EditorStoreProvider.js';

function QuickInputDialog<T>(props: {
  quickInputState: QuickInputState<T>;
}): React.ReactElement {
  const { quickInputState } = props;
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const { placeholder, options, getSearchValue, onSelect, customization } =
    quickInputState;
  const inputRef = useRef<SelectComponent>(null);
  const close = (): void => editorStore.setQuickInputState(undefined);

  const filterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: { label: string; data: QuickInputOption<T> }) =>
      getSearchValue({ label: option.label, value: option.data.value }),
  });
  const onChange = (value: QuickInputOption<T>): void => {
    onSelect(value);
    close();
  };
  const handleEnter = (): void => {
    inputRef.current?.focus();
  };

  // TODO: include title and properly style it like vscode quick input
  return (
    <NonBlockingDialog
      open={true}
      onClose={close}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      onClickAway={close}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="search-modal"
      >
        <div className="quick-input">
          <CustomSelectorInput
            inputRef={inputRef}
            className="quick-input__input"
            options={options}
            onChange={onChange}
            filterOption={filterOption}
            placeholder={placeholder}
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            menuIsOpen={true}
            optionCustomization={{
              rowHeight: customization?.rowHeight,
            }}
          />
        </div>
      </Modal>
    </NonBlockingDialog>
  );
}

export const QuickInput = observer(() => {
  const editorStore = useEditorStore();
  if (!editorStore.quickInputState) {
    return null;
  }
  return <QuickInputDialog quickInputState={editorStore.quickInputState} />;
});
