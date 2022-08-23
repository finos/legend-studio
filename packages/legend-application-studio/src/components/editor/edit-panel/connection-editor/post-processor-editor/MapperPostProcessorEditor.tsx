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
} from '@finos/legend-graph';
import { isObservable, isObservableProp } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { RelationalDatabaseConnectionValueState } from '../../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import type { MapperPostProcessorEditorState } from '../../../../../stores/editor-state/element-editor-state/connection/MapperPostProcessorEditorState.js';
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
    mapperEditorState: MapperPostProcessorEditorState;
    postprocessor: PostProcessor;
    title: string;
    selectedMapper: Mapper | undefined;
  }) => {
    const {
      connectionValueState,
      mapper,
      title,
      postprocessor,
      mapperEditorState,
      selectedMapper,
    } = props;

    const setSelectedMapper = (val: Mapper): void => {
      console.log('here is the mapper that is clicked');
      console.log(val);
      mapperEditorState.setselectedMapper(val);
      connectionValueState.setSelectedSvpMapper(val);

      console.log('here is the editorstate');
      console.log(mapperEditorState.selectedMapper);
    };
    const selectMapper = (): void => setSelectedMapper(mapper);

    return (
      <div
        className={clsx(
          'panel__explorer__item',
          {
            '': !(mapper === props.selectedMapper),
          },
          {
            'panel__explorer__item--selected': mapper === props.selectedMapper,
          },
        )}
        onClick={selectMapper}
      >
        <div className="panel__explorer__item__label">{title}</div>
      </div>
    );
  },
);

const MapperSchemaEditor = observer(
  (props: {
    sourceSpec: RelationalDatabaseConnectionValueState;
    isReadOnly: boolean;
  }) => {
    const { sourceSpec, isReadOnly } = props;

    console.log(isObservable(sourceSpec.selectedSvpMapper?.from));
    console.log(isObservable(sourceSpec.selectedSvpMapper));

    //svptodelete todo: schema table
    // console.log(isObservable(sourceSpec.selectedSvpMapper as TableNameMapper));
    // console.log(
    //   isObservable((sourceSpec.selectedSvpMapper as TableNameMapper).schema),
    // );

    console.log(isObservableProp(sourceSpec, 'selectedSvpMapper'));

    return (
      <>
        <PanelStringEditor
          padding={true}
          isReadOnly={false}
          value={sourceSpec.selectedSvpMapper?.from}
          propertyName={'From..'}
          update={(value: string | undefined): void =>
            postProcessor_setMapperFrom(sourceSpec, value ?? '')
          }
        />
      </>
    );
  },
);

export const MapperPostProcessorEditor = observer(
  (props: {
    postprocessor: PostProcessor;
    mapperEditorState: MapperPostProcessorEditorState;
    connectionValueState: RelationalDatabaseConnectionValueState;
  }) => {
    const { connectionValueState, postprocessor, mapperEditorState } = props;

    const selectedMapper = connectionValueState.selectedSvpMapper;

    const addSchemaMapper = () => {
      mapper_addSchemaMapper(
        connectionValueState,
        postprocessor,
        mapperEditorState,
      );
    };

    const addTableMapper = () => {
      mapper_addTableMapper(connectionValueState, postprocessor);
    };

    const deleteMapper =
      (mapper: Mapper): (() => void) =>
      (): void => {
        postProcessor_deleteMapper(connectionValueState, mapper);
        if (mapper === connectionValueState.selectedSvpMapper) {
          connectionValueState.setSelectedSvpMapper(undefined);
        }
      };

    const mappers = (postprocessor as MapperPostProcessor).mappers;

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
                  {mappers.map((mapper, idx) => (
                    <ContextMenu
                      key={mapper.hashCode}
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
                        key={mapper.hashCode}
                        mapper={mapper}
                        mapperEditorState={mapperEditorState}
                        selectedMapper={mapperEditorState.selectedMapper}
                        postprocessor={postprocessor}
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
                      connectionValueState.selectedSvpMapper instanceof
                      TableNameMapper
                        ? 'Table Mapper'
                        : 'Schema Mapper'
                    }
                  ></PanelHeader>
                )}
                <div className="panel__content">
                  {!selectedMapper && (
                    <BlankPanelPlaceholder
                      placeholderText=""
                      tooltipText=""
                      readOnlyProps={
                        !mappers.length
                          ? {
                              placeholderText:
                                'Add a mapper to view properties',
                            }
                          : {
                              placeholderText:
                                'Select a mapper to view properties',
                            }
                      }
                    />
                  )}

                  {selectedMapper && (
                    // svp2
                    <>
                      <PanelForm>
                        <MapperSchemaEditor
                          // sourceSpec={mapperEditorState}
                          sourceSpec={connectionValueState}
                          // sourceSpec={selectedMapper}
                          isReadOnly={true}
                        />
                        <PanelStringEditor
                          padding={true}
                          isReadOnly={false}
                          value={selectedMapper.to}
                          propertyName={'To'}
                          update={(value: string | undefined): void =>
                            postProcessor_setMapperTo(
                              connectionValueState,
                              value ?? '',
                            )
                          }
                        />

                        {selectedMapper instanceof TableNameMapper && (
                          <>
                            <PanelStringEditor
                              padding={true}
                              isReadOnly={false}
                              value={selectedMapper.schema.from}
                              propertyName={'Schema From'}
                              update={(value: string | undefined): void =>
                                postProcessor_setMapperSchemaFrom(
                                  connectionValueState,
                                  value ?? '',
                                )
                              }
                            />
                            <PanelStringEditor
                              padding={true}
                              isReadOnly={false}
                              value={selectedMapper.schema.to}
                              propertyName={'Schema To'}
                              update={(value: string | undefined): void =>
                                postProcessor_setMapperSchemaTo(
                                  connectionValueState,
                                  value ?? '',
                                )
                              }
                            />
                          </>
                        )}

                        {/* {selectedMapper instanceof TableNameMapper
                        ? 'currently'
                        : 'not'} */}
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
