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

import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { Dialog } from '@finos/legend-art';
import type { DirectoryTreeNode } from '../../server/models/DirectoryTree.js';

const FILE_PATH_PATTERN = /^\/?(?:\w+\/)*\w+(?:\.\w+)*$/;

export const RenameFilePrompt = observer(
  (props: { node: DirectoryTreeNode }) => {
    const { node } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const [value, setValue] = useState(node.data.li_attr.path);
    const inputRef = useRef<HTMLInputElement>(null);

    // validation
    const isValidValue = Boolean(value.match(FILE_PATH_PATTERN));
    const isSameValue = node.data.li_attr.path === value;
    const error = !isValidValue ? 'Invalid path' : undefined;

    // actions
    const closeModal = (): void =>
      ideStore.directoryTreeState.setNodeForRenameFile(undefined);
    const onValueChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => setValue(event.target.value);
    const rename = (
      event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
    ): void => {
      event.preventDefault();
      if (isSameValue) {
        return;
      }
      closeModal();
      flowResult(ideStore.renameFile(node.data.li_attr.path, value)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const handleEnter = (): void => inputRef.current?.focus();

    return (
      <Dialog
        open={true}
        onClose={closeModal}
        classes={{ container: 'command-modal__container' }}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
          paper: {
            classes: { root: 'command-modal__inner-container' },
          },
        }}
      >
        <div className="modal modal--dark command-modal">
          <div className="modal__title">Rename file</div>
          <div className="command-modal__content">
            <form className="command-modal__content__form" onSubmit={rename}>
              <div className="input-group command-modal__content__input">
                <input
                  ref={inputRef}
                  className="input input--dark"
                  onChange={onValueChange}
                  value={value}
                  spellCheck={false}
                />
                {error && (
                  <div className="input-group__error-message">{error}</div>
                )}
              </div>
            </form>
            <button
              className="command-modal__content__submit-btn btn--dark"
              disabled={Boolean(error)}
              onClick={rename}
            >
              Rename
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
