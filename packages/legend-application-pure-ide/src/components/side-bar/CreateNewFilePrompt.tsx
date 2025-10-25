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

const FILE_NAME_PATTERN = /^\w+(?:\.\w+)*$/;
const DEFAULT_FILE_NAME = 'untitled.pure';

export const CreateNewFilePrompt = observer(
  (props: { node: DirectoryTreeNode }) => {
    const { node } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const [value, setValue] = useState(DEFAULT_FILE_NAME);
    const inputRef = useRef<HTMLInputElement>(null);

    // validation
    const isValidValue = Boolean(value.match(FILE_NAME_PATTERN));
    const isUnique = !node.childrenIds
      ?.map((id) => ideStore.directoryTreeState.getTreeData().nodes.get(id))
      .filter((n) => n?.data.text === value).length;
    const error = !isValidValue
      ? 'Invalid file name'
      : !isUnique
        ? 'Already existed'
        : undefined;

    // actions
    const closeModal = (): void =>
      ideStore.directoryTreeState.setNodeForCreateNewFile(undefined);
    const onValueChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => setValue(event.target.value);
    const create = (
      event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
    ): void => {
      event.preventDefault();
      closeModal();
      flowResult(
        ideStore.createNewFile(`${node.data.li_attr.path}/${value}`),
      ).catch(applicationStore.alertUnhandledError);
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
          <div className="modal__title">Create a new file</div>
          <div className="command-modal__content">
            <form className="command-modal__content__form" onSubmit={create}>
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
              onClick={create}
            >
              Create
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
