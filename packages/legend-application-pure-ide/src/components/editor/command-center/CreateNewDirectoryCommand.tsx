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
import { useEditorStore } from '../EditorStoreProvider.js';
import { Dialog } from '@finos/legend-art';

export const CreateNewDirectoryCommand = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const currentNode = editorStore.directoryTreeState.nodeForCreateNewDirectory;
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // actions
  const closeModal = (): void =>
    editorStore.directoryTreeState.setNodeForCreateNewDirectory(undefined);
  const onValueChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => setValue(event.target.value);
  const create = (
    event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
  ): void => {
    if (!currentNode) {
      return;
    }
    event.preventDefault();
    closeModal();
    flowResult(
      editorStore.createNewDirectory(
        `${currentNode.data.li_attr.path}/${value}`,
      ),
    ).catch(applicationStore.alertUnhandledError);
  };
  const handleEnter = (): void => {
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <Dialog
      open={Boolean(currentNode)}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'command-modal__container' }}
      PaperProps={{ classes: { root: 'command-modal__inner-container' } }}
    >
      <div className="modal modal--dark command-modal">
        <div className="modal__title">Create a new directory</div>
        <div className="command-modal__content">
          <form className="command-modal__content__form" onSubmit={create}>
            <input
              ref={inputRef}
              className="command-modal__content__input input--dark"
              onChange={onValueChange}
              value={value}
            />
          </form>
          <button
            className="command-modal__content__submit-btn btn--dark"
            onClick={create}
          >
            Create
          </button>
        </div>
      </div>
    </Dialog>
  );
});
