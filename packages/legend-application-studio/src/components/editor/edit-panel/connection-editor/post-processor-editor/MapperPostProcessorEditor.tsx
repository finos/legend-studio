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

import {
  ResizablePanelGroup,
  ResizablePanel,
  PanelHeader,
  PanelHeaderActionItem,
  PlusIcon,
  ResizablePanelSplitter,
  BlankPanelPlaceholder,
  clsx,
  PanelStringEditor,
  PanelForm,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  DropdownMenu,
} from '@finos/legend-art';
import {
  type Mapper,
  type PostProcessor,
  type MapperPostProcessor,
  TableNameMapper,
  SchemaNameMapper,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { RelationalDatabaseConnectionValueState } from '../../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  mapper_addSchemaMapper,
  mapper_addTableMapper,
  postProcessor_deleteMapper,
  postProcessor_setMapperFrom,
  postProcessor_setMapperSchemaFrom,
  postProcessor_setMapperSchemaTo,
  postProcessor_setMapperTo,
} from '../../../../../stores/graphModifier/StoreRelational_GraphModifierHelper.js';

export const MapperEditor = observer(
  (props: {
    connectionValueState: RelationalDatabaseConnectionValueState;
    mapper: Mapper;
    title: string;
    selectedMapper: Mapper | undefined;
    validationErrorMessage?: string | undefined;
  }) => {
    const {
      connectionValueState,
      mapper,
      title,
      selectedMapper,
      validationErrorMessage,
    } = props;

    const setSelectedMapper = (val: Mapper): void => {
      connectionValueState.setSelectedMapper(val);

      if (val instanceof TableNameMapper) {
        connectionValueState.setSelectedSchema(val.schema);
      }
    };
    const selectMapper = (): void => setSelectedMapper(mapper);

    return (
      <div
        className={clsx(
          'panel__explorer__item',
          {
            '': !(mapper === selectedMapper),
          },
          {
            'panel__explorer__item--selected': mapper === selectedMapper,
          },
          {
            'panel__explorer__item--with-validation--error': Boolean(
              validationErrorMessage,
            ),
          },
          {
            'panel__explorer__item--selected--with-validation--error':
              Boolean(validationErrorMessage) && mapper === selectedMapper,
          },
        )}
        onClick={selectMapper}
      >
        <div
          className="panel__explorer__item__label"
          title={validationErrorMessage}
        >
          {title}
        </div>
      </div>
    );
  },
);

export const MapperPostProcessorEditor = observer(
  (props: {
    postprocessor: PostProcessor;
    connectionValueState: RelationalDatabaseConnectionValueState;
  }) => {
    const { connectionValueState, postprocessor } = props;

    const selectedMapper = connectionValueState.selectedMapper;

    const selectedSchemaNameMapper =
      selectedMapper instanceof TableNameMapper
        ? selectedMapper.schema
        : undefined;

    const addSchemaMapper = (): (() => void) => (): void => {
      mapper_addSchemaMapper(connectionValueState, postprocessor);
    };

    const addTableMapper = (): (() => void) => (): void => {
      mapper_addTableMapper(connectionValueState, postprocessor);
    };

    const deleteMapper =
      (mapper: Mapper): (() => void) =>
      (): void => {
        postProcessor_deleteMapper(connectionValueState, mapper);
        if (mapper === connectionValueState.selectedMapper) {
          connectionValueState.setSelectedMapper(undefined);
          connectionValueState.setSelectedSchema(undefined);
        }
      };

    const mappers = (postprocessor as MapperPostProcessor).mappers;
    const isSchemaMapperDuplicated = (val: Mapper): boolean =>
      mappers.filter(
        (p) =>
          p.from === val.from &&
          p.to === val.to &&
          val instanceof SchemaNameMapper &&
          p instanceof SchemaNameMapper,
      ).length >= 2;

    const isTableMapperDuplicated = (val: Mapper): boolean =>
      mappers
        .filter(
          (p) => val instanceof TableNameMapper && p instanceof TableNameMapper,
        )
        .filter(
          (p) =>
            (p as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (p as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (p as TableNameMapper).from === (val as TableNameMapper).from &&
            (p as TableNameMapper).from === (val as TableNameMapper).from,
        ).length >= 2;

    const isMapperDuplicated = (val: Mapper): boolean =>
      isSchemaMapperDuplicated(val) || isTableMapperDuplicated(val);

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={170} minSize={70}>
              <div className="relational-connection-editor__auth">
                <DropdownMenu
                  className=""
                  content={
                    <MenuContent>
                      <MenuContentItem onClick={addSchemaMapper}>
                        New Schema Mapper
                      </MenuContentItem>
                      <MenuContentItem onClick={addTableMapper}>
                        New Table Mapper
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                    elevation: 7,
                  }}
                >
                  <PanelHeader title="mapper">
                    <PanelHeaderActionItem tip="Create Mapper">
                      <PlusIcon />
                    </PanelHeaderActionItem>
                  </PanelHeader>
                </DropdownMenu>

                <div className="panel__content">
                  {mappers.map((mapper) => (
                    <ContextMenu
                      key={mapper._UUID}
                      disabled={false}
                      content={
                        <MenuContent>
                          <MenuContentItem onClick={deleteMapper(mapper)}>
                            Delete
                          </MenuContentItem>
                        </MenuContent>
                      }
                      menuProps={{ elevation: 7 }}
                    >
                      <MapperEditor
                        connectionValueState={connectionValueState}
                        key={mapper._UUID}
                        mapper={mapper}
                        selectedMapper={connectionValueState.selectedMapper}
                        validationErrorMessage={
                          isMapperDuplicated(mapper)
                            ? 'Mappers have the same values'
                            : undefined
                        }
                        title={
                          mapper instanceof TableNameMapper
                            ? 'Table Mapper'
                            : 'Schema Mapper'
                        }
                      />
                    </ContextMenu>
                  ))}
                </div>
              </div>
            </ResizablePanel>

            <ResizablePanelSplitter />

            <ResizablePanel>
              <div className="relational-connection-editor__source">
                {selectedMapper && (
                  <PanelHeader
                    title={
                      connectionValueState.selectedMapper instanceof
                      TableNameMapper
                        ? 'Table Mapper'
                        : 'Schema Mapper'
                    }
                  ></PanelHeader>
                )}
                <div className="panel__content">
                  {!selectedMapper && (
                    <BlankPanelPlaceholder
                      text=""
                      tooltipText=""
                      disabled={true}
                      previewText={
                        !mappers.length
                          ? 'Add a mapper to view properties'
                          : 'Select a mapper to view properties'
                      }
                    />
                  )}
                  {selectedMapper && (
                    <>
                      <PanelForm>
                        <PanelStringEditor
                          padding={true}
                          isReadOnly={false}
                          value={selectedMapper.from}
                          propertyName={'From'}
                          update={(value: string | undefined): void =>
                            postProcessor_setMapperFrom(
                              selectedMapper,
                              value ?? '',
                            )
                          }
                        />
                        <PanelStringEditor
                          padding={true}
                          isReadOnly={false}
                          value={selectedMapper.to}
                          propertyName={'To'}
                          update={(value: string | undefined): void =>
                            postProcessor_setMapperTo(
                              selectedMapper,
                              value ?? '',
                            )
                          }
                        />
                        {selectedSchemaNameMapper && (
                          <>
                            <PanelStringEditor
                              padding={true}
                              isReadOnly={false}
                              value={selectedSchemaNameMapper.from}
                              propertyName={'Schema From'}
                              update={(value: string | undefined): void => {
                                postProcessor_setMapperSchemaFrom(
                                  selectedSchemaNameMapper,
                                  value ?? '',
                                );
                              }}
                            />
                            <PanelStringEditor
                              padding={true}
                              isReadOnly={false}
                              value={selectedSchemaNameMapper.to}
                              propertyName={'Schema To'}
                              update={(value: string | undefined): void =>
                                postProcessor_setMapperSchemaTo(
                                  selectedSchemaNameMapper,
                                  value ?? '',
                                )
                              }
                            />
                          </>
                        )}
                      </PanelForm>
                    </>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
