/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { CustomSelectorInput } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  type PersistenceServiceOption,
  NewPersistenceDriver,
} from '../../stores/studio/DSL_Persistence_NewPersistenceDriver.js';

export const NewPersistenceDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const persistenceDriver =
    editorStore.newElementState.getNewElementDriver(NewPersistenceDriver);
  const serviceOptions = persistenceDriver.serviceOptions;

  const onServiceChange = (val: PersistenceServiceOption | null): void =>
    persistenceDriver.setServiceOption(val ?? undefined);
  const handleDocumentationChange: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => persistenceDriver.setDocumentation(event.target.value);

  return (
    <>
      <div className="panel__content__form__section__header__label">
        Service
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="explorer__new-element-modal__driver__dropdown"
          options={serviceOptions}
          onChange={onServiceChange}
          value={persistenceDriver.serviceOption ?? null}
          placeholder={
            serviceOptions.length
              ? 'Choose the service to persist...'
              : 'No services in this project: create a service first'
          }
          disabled={!serviceOptions.length}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <div className="panel__content__form__section__header__label">
        Documentation
      </div>
      <div className="explorer__new-element-modal__driver">
        <input
          className="input--dark explorer__new-element-modal__name-input"
          spellCheck={false}
          value={persistenceDriver.documentation}
          onChange={handleDocumentationChange}
          placeholder="Describe what this persistence does"
        />
      </div>
    </>
  );
});
