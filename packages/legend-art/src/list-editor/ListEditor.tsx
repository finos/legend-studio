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

import React, { useState } from 'react';
import { TimesIcon } from '../icon/Icon.js';
import { PanelFormListItems } from '../layout/Panel.js';
import { observer } from 'mobx-react-lite';

export const ListEditor = observer(
  <T,>(props: {
    title?: string;
    prompt?: string;
    elements: T[] | undefined;
    keySelector: (element: T) => string;
    elementRenderer: (element: T) => React.ReactElement;
    newElementRenderer: (onFinishEditing: () => void) => React.ReactElement;
    handleRemoveElement: (element: T) => void;
    isReadOnly: boolean;
    emptyMessage?: string;
  }) => {
    const {
      title,
      prompt,
      elements,
      keySelector,
      elementRenderer,
      newElementRenderer,
      handleRemoveElement,
      isReadOnly,
      emptyMessage,
    } = props;
    const [showAddButton, setShowAddButton] = useState(true);

    const onFinishEditing = () => {
      setShowAddButton(true);
    };

    return (
      <PanelFormListItems title={title} prompt={prompt}>
        <div className="panel__content__form__section__list">
          <div className="panel__content__form__section__list__items">
            {elements?.map((element) => {
              return (
                <div
                  key={keySelector(element)}
                  className="panel__content__form__section__list__item"
                >
                  {elementRenderer(element)}
                  {!isReadOnly && (
                    <button
                      className="panel__content__form__section__list__item__content__actions__btn"
                      onClick={() => handleRemoveElement(element)}
                      tabIndex={-1}
                      title="Remove element"
                    >
                      <TimesIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!showAddButton && (
            <div className="panel__content__form__section__list__new-item">
              {newElementRenderer(onFinishEditing)}
              <button
                className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={() => setShowAddButton(true)}
                tabIndex={-1}
              >
                Cancel
              </button>
            </div>
          )}
          {!elements?.length && showAddButton && (
            <div className="panel__content__form__section__list__empty">
              {emptyMessage ?? 'No elements specified'}
            </div>
          )}
          {showAddButton && (
            <div className="panel__content__form__section__list__new-item__add">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={() => setShowAddButton(false)}
                tabIndex={-1}
              >
                Add Value
              </button>
            </div>
          )}
        </div>
      </PanelFormListItems>
    );
  },
);
