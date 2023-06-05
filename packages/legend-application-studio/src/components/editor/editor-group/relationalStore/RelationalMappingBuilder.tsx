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

import { observer } from 'mobx-react-lite';
import {
  BlankPanelContent,
  CustomSelectorInput,
  ModalFooterButton,
  PanelContent,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { useState } from 'react';
import type { Schema } from '@finos/legend-graph';
import type { RelationalMappingBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/relationalStore/RelationalMappingBuilderState.js';
import { flowResult } from 'mobx';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';

export const RelationalMappingBuilder = observer(
  (props: {
    relationalMappingBuilderState: RelationalMappingBuilderState;
    isReadOnly: boolean;
  }) => {
    const { relationalMappingBuilderState, isReadOnly } = props;
    const database = relationalMappingBuilderState.database;
    const isExecutingAction =
      relationalMappingBuilderState.buildingMappingState.isInProgress;
    const [schema, setSchema] = useState(database.schemas[0]);
    const shemaOptions = database.schemas.map((_s) => ({
      label: _s.name,
      value: _s,
    }));
    const mappingPackage = relationalMappingBuilderState.mappingPackage;
    const selectedSchema = schema
      ? {
          value: schema,
          label: schema.name,
        }
      : undefined;

    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      relationalMappingBuilderState.setMappingPackage(event.target.value);
    };
    const preview = (): void => {
      console.log('hello');
      if (schema) {
        flowResult(relationalMappingBuilderState.generateMapping(schema));
      }
    };

    const onSchemaSetChange = (
      val: { label: string; value: Schema } | undefined,
    ): void => {
      setSchema(val?.value);
    };

    return (
      <div className="panel relational-mapping-builder">
        <div className="database-builder__content">
          <PanelLoadingIndicator isLoading={isExecutingAction} />
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={450}>
              <div className="database-builder__config">
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">config</div>
                  </div>
                </div>
                <div className="panel__content database-builder__config__content">
                  <div className="binding-general-editor__section__header__label">
                    Schema
                  </div>
                  <div>
                    <CustomSelectorInput
                      className="binding-general-editor__section__dropdown"
                      disabled={database.schemas.length === 1}
                      options={shemaOptions}
                      onChange={onSchemaSetChange}
                      value={selectedSchema}
                      placeholder="Choose a Schema "
                      darkMode={true}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel>
              <div className="panel database-builder__model">
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">
                      mapping model
                    </div>
                  </div>
                </div>
                <PanelContent>
                  <div className="database-builder__modeller">
                    <div className="panel__content__form__section database-builder__modeller__path">
                      <div className="panel__content__form__section__header__label">
                        Target Mapping Path
                      </div>
                      <input
                        className="panel__content__form__section__input"
                        spellCheck={false}
                        value={mappingPackage}
                        onChange={changeValue}
                      />
                    </div>
                    <div className="database-builder__modeller__preview">
                      {relationalMappingBuilderState.generatedModel && (
                        <CodeEditor
                          language={CODE_EDITOR_LANGUAGE.PURE}
                          inputValue={
                            relationalMappingBuilderState.generatedModel
                          }
                          isReadOnly={true}
                        />
                      )}
                      {!relationalMappingBuilderState.generatedModel && (
                        <BlankPanelContent>No model preview</BlankPanelContent>
                      )}
                    </div>
                  </div>
                </PanelContent>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <div>
          <ModalFooterButton
            className="database-builder__action--btn"
            disabled={isExecutingAction}
            onClick={preview}
            title="Preview model..."
          >
            Preview
          </ModalFooterButton>
          <ModalFooterButton
            className="database-builder__action--btn"
            disabled={isReadOnly}
            onClick={preview}
          >
            Add To Project
          </ModalFooterButton>
        </div>
      </div>
    );
  },
);
