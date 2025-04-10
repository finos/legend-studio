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
    // eslint-disable-line comma-spacing
    title?: string;
    prompt?: string;
    items: T[] | undefined;
    keySelector: (item: T) => string;
    ItemComponent: (props: { item: T }) => React.ReactElement;
    NewItemComponent: (props: {
      onFinishEditing: () => void;
    }) => React.ReactElement;
    handleRemoveItem: (item: T) => void;
    isReadOnly: boolean;
    emptyMessage?: string;
  }) => {
    const {
      title,
      prompt,
      items,
      keySelector,
      ItemComponent,
      NewItemComponent,
      handleRemoveItem,
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
            {items?.map((item) => {
              return (
                <div
                  key={keySelector(item)}
                  className="panel__content__form__section__list__item"
                >
                  <ItemComponent item={item} />
                  {!isReadOnly && (
                    <button
                      className="panel__content__form__section__list__item__content__actions__btn"
                      onClick={() => handleRemoveItem(item)}
                      tabIndex={-1}
                      title="Remove item"
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
              <NewItemComponent onFinishEditing={onFinishEditing} />
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
          {!items?.length && showAddButton && (
            <div className="panel__content__form__section__list__empty">
              {emptyMessage ?? 'No items specified'}
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
