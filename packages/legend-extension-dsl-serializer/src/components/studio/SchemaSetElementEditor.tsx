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
import { FaLock, FaPlus } from 'react-icons/fa';
import {
  CaretDownIcon,
  clsx,
  ContextMenu,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { StudioTextInputEditor, useEditorStore } from '@finos/legend-studio';
import type { SchemaSet } from '../../models/metamodels/pure/model/packageableElements/schemaSet/SchemaSet';
import { Schema } from '../../models/metamodels/pure/model/packageableElements/schemaSet/Schema';
import { SchemaSetEditorState } from '../../stores/studio/SchemaSetEditorState';
import { EDITOR_LANGUAGE } from '@finos/legend-application';
import { FORMAT_TYPE } from '../../models/metamodels/pure/model/packageableElements/schemaSet/SchemaSet';
import { guaranteeNonNullable } from '@finos/legend-shared';

const SchemaSetFormatBasicEditor = observer(
  (props: { schemaSet: SchemaSet; isReadOnly: boolean }) => {
    const { schemaSet, isReadOnly } = props;
    const changeType =
      (val: FORMAT_TYPE): (() => void) =>
      (): void => {
        !isReadOnly && schemaSet.setFormat(val);
      };
    return (
      <div className="schema-set-format-editor">
        <DropdownMenu
          disabled={isReadOnly}
          content={
            <MenuContent className="schema-set-format-editor__dropdown">
              {Object.values(FORMAT_TYPE).map((format) => (
                <MenuContentItem
                  key={format}
                  className="schema-set-format-editor__option"
                  onClick={changeType(format)}
                >
                  {format}
                </MenuContentItem>
              ))}
            </MenuContent>
          }
          menuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'right' },
          }}
        >
          <div className="schema-set-format-editor__type">
            <div className="schema-set-format-editor__type__label">
              {schemaSet.format}
            </div>
            <div className="schema-set-format-editor__type__icon">
              <CaretDownIcon />
            </div>
          </div>
        </DropdownMenu>
      </div>
    );
  },
);

const SchemaBasicEditor = observer(
  (props: { schema: Schema; isReadOnly: boolean }) => {
    const { schema, isReadOnly } = props;
    const changeId: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      schema.setId(event.target.value);
    const changeLocation: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => schema.setLocation(event.target.value);
    return (
      <div className="schema-editor">
        <input
          className="schema-editor__id"
          disabled={isReadOnly}
          value={schema.id}
          spellCheck={false}
          onChange={changeId}
          placeholder={`Id`}
        />
        <input
          className="schema-editor__location"
          disabled={isReadOnly}
          value={schema.location}
          spellCheck={false}
          onChange={changeLocation}
          placeholder={`Location`}
        />
        <div className={clsx('schema-editor__content')}>
          <div className="schema-editor__content__input">
            <StudioTextInputEditor
              inputValue={schema.content}
              language={EDITOR_LANGUAGE.TEXT}
              updateInput={(val: string): void => {
                schema.setContent(val);
              }}
              hideGutter={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const SchemaSetEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(SchemaSetEditorState);
  const schemaSet = editorState.schemaSet;
  const schemaState = editorState.currentSchema;
  const isReadOnly = editorState.isReadOnly;
  const getIndex = (value: Schema): number =>
    guaranteeNonNullable(
      schemaSet.schemas.findIndex((schema: Schema) => value === schema),
      `Can't find schema '${value}' in schema set '${schemaSet.path}'`,
    );
  const changeState =
    (schema: Schema): (() => void) =>
    (): void => {
      editorState.setCurrentSchema(schema);
    };
  const addSchema = (): void => {
    if (!isReadOnly) {
      const schema = new Schema();
      schema.setContent('');
      schemaSet.addSchema(schema);
      editorState.setCurrentSchema(schema);
    }
  };
  const deleteSchema =
    (val: Schema): (() => void) =>
    (): void => {
      schemaSet.deleteSchema(val);
      if (schemaSet.schemas.length !== 0) {
        editorState.setCurrentSchema(
          schemaSet.schemas[schemaSet.schemas.length - 1],
        );
      }
      if (schemaSet.schemas.length === 0) {
        editorState.setCurrentSchema(undefined);
      }
    };
  return (
    <div className="schema-set-panel">
      <div className="schema-set-panel__header">
        <div className="schema-set-panel__header__title">
          {isReadOnly && (
            <div className="schema-set-panel__header__lock">
              <FaLock />
            </div>
          )}
          <div className="schema-set-panel__header__title__label">
            Schema Set
          </div>
          <div className="schema-set-panel__header__title__content">
            {schemaSet.name}
          </div>
        </div>
      </div>
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel minSize={280} maxSize={280}>
          <div className="schema-set-panel">
            <div className="schema-set-panel__header">
              <div className="schema-set-panel__header__actions">
                <SchemaSetFormatBasicEditor
                  schemaSet={schemaSet}
                  isReadOnly={isReadOnly}
                />
                <button
                  className="schema-set-panel__header__action"
                  onClick={addSchema}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title={'Add Schema'}
                >
                  <FaPlus />
                </button>
              </div>
            </div>
            <ContextMenu
              className="schema-set-panel__content"
              disabled={isReadOnly}
              content={
                !isReadOnly &&
                schemaState !== undefined && (
                  <div
                    className="schema-set-panel__context-menu"
                    onClick={deleteSchema(schemaState)}
                  >
                    Delete
                  </div>
                )
              }
              menuProps={{ elevation: 7 }}
            >
              <div className="schema-set-panel__content__lists">
                <MenuContent className="schema-set-panel__dropdown">
                  {schemaSet.schemas.map((schema: Schema, index: number) => (
                    <MenuContentItem
                      key={schema.uuid}
                      className={
                        schemaState === schema
                          ? 'schema-set-panel__option schema-set-panel__option__active'
                          : 'schema-set-panel__option'
                      }
                      onClick={changeState(schema)}
                    >
                      {schema.id ? schema.id : `Schema${index + 1}`}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              </div>
            </ContextMenu>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <div className="schema-set-panel">
            <div className="schema-set-panel__header">
              <div className="schema-set-panel__header__title">
                {isReadOnly && (
                  <div className="schema-set-panel__header__lock">
                    <FaLock />
                  </div>
                )}
                <div className="schema-set-panel__header__title__label">
                  Schema
                </div>
                <div className="schema-set-panel__header__title__content">
                  {schemaState !== undefined
                    ? schemaState.id
                      ? schemaState.id
                      : `Schema${getIndex(schemaState) + 1}`
                    : ''}
                </div>
              </div>
            </div>
            <div className="schema-set-panel__content">
              <div className="schema-set-panel__content__lists">
                {schemaState !== undefined && (
                  <SchemaBasicEditor
                    key={schemaState.uuid}
                    schema={schemaState}
                    isReadOnly={isReadOnly}
                  />
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});
