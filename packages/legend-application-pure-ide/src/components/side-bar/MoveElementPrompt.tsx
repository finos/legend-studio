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
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { Dialog } from '@finos/legend-art';
import {
  type ConceptTreeNode,
  ElementConceptAttribute,
} from '../../server/models/ConceptTree.js';
import { extractPackagePathFromPath } from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

const PACKAGE_PATH_PATTERN = /^(?:(?:\w[\w$]*)::)*\w[\w$]*$/;

export const MoveElementPrompt = observer(
  (props: { node: ConceptTreeNode }) => {
    const { node } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const packagePath =
      extractPackagePathFromPath(node.data.li_attr.pureId) ?? '';
    const [value, setValue] = useState(packagePath);
    const inputRef = useRef<HTMLInputElement>(null);

    // validation
    const isValidValue = Boolean(value.match(PACKAGE_PATH_PATTERN));
    const isSameValue = packagePath === value;
    const error = !isValidValue ? 'Invalid path' : undefined;

    // actions
    const closeModal = (): void =>
      ideStore.conceptTreeState.setNodeForMoveElement(undefined);
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
      ideStore.conceptTreeState
        .movePackageableElements(
          [guaranteeType(node.data.li_attr, ElementConceptAttribute)],
          value,
        )
        .catch(applicationStore.alertUnhandledError)
        .finally(() => closeModal());
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
          <div className="modal__title">Move element</div>
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
              Move
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
