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

import { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { CaseSensitiveIcon, clsx, Dialog, RegexIcon } from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';

export const TextSearchCommand = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const searchState = editorStore.textSearchCommandState;
  const inputRef = useRef<HTMLInputElement>(null);
  // configs
  const toggleCaseSensitive = (): void => searchState.toggleCaseSensitive();
  const toggleRegExp = (): void => searchState.toggleRegExp();
  // actions
  const closeModal = (): void => editorStore.setOpenTextSearchCommand(false);
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => searchState.setText(event.target.value);
  const search = (
    event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    closeModal();
    flowResult(editorStore.searchText()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const handleEnter = (): void => {
    inputRef.current?.focus();
  };

  return (
    <Dialog
      open={editorStore.openTextSearchCommand}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'command-modal__container' }}
      PaperProps={{ classes: { root: 'command-modal__inner-container' } }}
    >
      <div className="modal modal--dark command-modal">
        <div className="modal__title">Search</div>
        <div className="command-modal__content">
          <form className="command-modal__content__form" onSubmit={search}>
            <input
              ref={inputRef}
              className="command-modal__content__input input--dark"
              onChange={onSearchTextChange}
              value={searchState.text}
            />
          </form>
          <button
            className={clsx('command-modal__content__config-btn btn--sm', {
              'command-modal__content__config-btn--toggled':
                searchState.isCaseSensitive,
            })}
            title={`Match Case (${searchState.isCaseSensitive ? 'on' : 'off'})`}
            onClick={toggleCaseSensitive}
          >
            <CaseSensitiveIcon />
          </button>
          <button
            className={clsx('command-modal__content__config-btn btn--sm', {
              'command-modal__content__config-btn--toggled':
                searchState.isRegExp,
            })}
            title={`Use Regular Expression (${
              searchState.isRegExp ? 'on' : 'off'
            })`}
            onClick={toggleRegExp}
          >
            <RegexIcon />
          </button>
          <button
            className="command-modal__content__submit-btn btn--dark btn--caution"
            onClick={search}
          >
            Search
          </button>
        </div>
      </div>
    </Dialog>
  );
});
