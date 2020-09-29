/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from 'Stores/EditorStore';
import { GenerationSpecificationEditorState } from 'Stores/editor-state/GenerationSpecificationEditorState';
import { FaLock, FaFire } from 'react-icons/fa';
import clsx from 'clsx';
import { ElementIcon } from 'Components/shared/Icon';
import { MdRefresh } from 'react-icons/md';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { TEST_ID } from 'Const';
import { GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';

const GenerationOrderList = observer((props: {
  generationSpecification: GenerationSpecification;
}) => {
  const { generationSpecification } = props;
  const { generationNodes, fileGenerations } = generationSpecification;

  return (
    <div className="panel generation-tree-editor__explorer">
      <div className="generation-tree-editor__non-editable">
        Only Editable Through Text Mode
      </div>
      <div className="generation-tree-editor__explorer__content">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">Model Generation Order</div>
          <div className="panel__content__form__section__list">
            <div className="panel__content__form__section__list__items" data-testid={TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}>
              {generationNodes.map((value, idx) => (
                <div key={value.generationElement.value.path + value.id} className="panel__content__form__section__list__item generation-tree-editor__item">
                  <div className="panel__content__form__section__list__item__value generation-tree-editor__generation-element">
                    {<div className="generation-tree-editor__generation-element__icon"><ElementIcon element={value.generationElement.value} /></div>}
                    <div className="generation-tree-editor__generation-element__path">
                      {`${idx + 1}. ${value.generationElement.value.path}${value.generationElement.value.path !== value.id ? ` [${value.id}]` : ''}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">File Generations</div>
          <div className="panel__content__form__section__list">
            <div className="panel__content__form__section__list__items" data-testid={TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}>
              {fileGenerations.map(fileGenerationRef => (
                <div key={fileGenerationRef.value.path} className="panel__content__form__section__list__item generation-tree-editor__item">
                  <div className="panel__content__form__section__list__item__value generation-tree-editor__generation-element">
                    {<div className="generation-tree-editor__generation-element__icon"><ElementIcon element={fileGenerationRef.value} /></div>}
                    <div className="generation-tree-editor__generation-element__path">
                      {fileGenerationRef.value.path}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const GenerationSpecificationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const generationSpecificationState = editorStore.getCurrentEditorState(GenerationSpecificationEditorState);
  const modelGenerationState = editorStore.graphState.graphGenerationState;
  const generationSpec = generationSpecificationState.generationSpec;
  const generate = applicationStore.guaranteeSafeAction(() => modelGenerationState.globalGenerate());
  const emptyGenerationEntities = applicationStore.guaranteeSafeAction(() => modelGenerationState.clearGenerations());

  return (
    <div className="generation-tree-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {<div className="uml-element-editor__header__lock"><FaLock title="Editable only through text mode" /></div>}
            <div className="panel__header__title__label">Generation Specification</div>
            <div className="panel__header__title__content">{generationSpec.name}</div>
          </div>
          <div className="panel__header__actions">
            <button
              className={clsx('editor__status-bar__action editor__status-bar__generate-btn',
                { 'editor__status-bar__generate-btn--wiggling': modelGenerationState.isRunningGlobalGenerate }
              )}
              tabIndex={-1}
              onClick={generate}
              title={'Generate'}
            ><FaFire /></button>
            <button
              className={clsx('editor__status-bar__action editor__status-bar__generate-btn',
                { 'local-changes__refresh-btn--loading': modelGenerationState.isClearingGenerationEntities }
              )}
              onClick={emptyGenerationEntities}
              tabIndex={-1}
              title="Clear generation entities"
            ><MdRefresh /></button>
          </div>
        </div>
        <div className="panel__content generation-tree-editor__content">
          <GenerationOrderList generationSpecification={generationSpec} />
        </div>
      </div>
    </div>
  );
});
