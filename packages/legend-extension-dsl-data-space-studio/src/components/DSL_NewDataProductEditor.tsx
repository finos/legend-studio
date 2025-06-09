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

import { useEditorStore } from '@finos/legend-application-studio';
import { observer } from 'mobx-react-lite';
import { NewDataProductDriver } from './DSL_DataProduct_ElementDriver.js';

export const NewDataProductDriverEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataProductDriver =
    editorStore.newElementState.getNewElementDriver(NewDataProductDriver);

  const handleTitleChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => dataProductDriver.setTitle(event.target.value);
  const handleDescriptionChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => dataProductDriver.setDescription(event.target.value);

  return (
    <>
      <div className="panel__content__form__section__header__label">Title</div>
      <div className="explorer__new-element-modal__driver">
        <input
          className="input--dark explorer__new-element-modal__name-input"
          spellCheck={false}
          value={dataProductDriver.title}
          onChange={handleTitleChange}
          placeholder={`Choose a title for this Data Product to display to consumers`}
        />
      </div>
      <div className="panel__content__form__section__header__label">
        Description
      </div>
      <div className="explorer__new-element-modal__driver">
        <input
          className="input--dark explorer__new-element-modal__name-input"
          spellCheck={false}
          value={dataProductDriver.description}
          onChange={handleDescriptionChange}
          placeholder={`Provide a meaningful description for this Data Product`}
        />
      </div>
    </>
  );
});
