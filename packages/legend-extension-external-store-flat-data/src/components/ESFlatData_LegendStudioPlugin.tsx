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

import type {
  ApplicationStore,
  LegendApplicationConfig,
} from '@finos/legend-application';
import { PURE_FlatDataStoreIcon, type TreeData } from '@finos/legend-art';
import {
  type Connection,
  type InputData,
  InstanceSetImplementation,
  type Mapping,
  type PackageableElement,
  PackageableElementExplicitReference,
  type SetImplementation,
  type Store,
  Class,
  Enumeration,
  getEnumerationMappingsByEnumeration,
  getRawGenericType,
  isStubbed_RawLambda,
  Measure,
  OptionalEnumerationMappingExplicitReference,
  PrimitiveType,
  type Property,
  PropertyExplicitReference,
  stub_RawLambda,
  Unit,
  generateIdentifiedConnectionId,
  IdentifiedConnection,
  type EngineRuntime,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  ContentType,
  createUrlStringFromData,
  deleteEntry,
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type ConnectionEditorRenderer,
  type ConnectionValueEditorStateBuilder,
  type ConnectionValueState,
  type DefaultConnectionValueBuilder,
  type DSLMapping_LegendStudioPlugin_Extension,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementTypeGetter,
  type MappingElement,
  type MappingElementSource,
  type MappingElementSourceExtractor,
  type MappingElementState,
  type MappingElementStateCreator,
  type NewConnectionDriverCreator,
  type NewConnectionValueDriver,
  type NewElementFromStateCreator,
  type NewElementState,
  type RuntimeConnectionTooltipTextBuilder,
  type SetImplemtationClassifier,
  LegendStudioPlugin,
  UnsupportedElementEditorState,
  getMappingElementSource,
  type MappingElementTargetExtractor,
  type SetImplementationMappingElementLabelInfoBuilder,
  type MappingElementLabel,
  type MappingElementTypeGetter,
  MAPPING_ELEMENT_TYPE,
  type InstanceSetImplementationSourceUpdater,
  getEmbeddedSetImplementations,
  type NewSetImplementationGetter,
  type InputDataGetter,
  createMockDataForMappingElementSource,
  type MappingElementGetter,
  type MappingElementTreeNodeDataChildIdsGetter,
  type MappingExplorerTreeNodeData,
  type MappingElementDeleteEntryGetter,
  type MappingElementReprocessor,
  reprocessMappingElement,
  type MappingExplorerTreeNodeExpandActionSetter,
  getMappingElementTreeNodeData,
  type SetImplementationDecorator,
  getDecoratedSetImplementationPropertyMappings,
  mapping_setPropertyMappings,
  type SetImplementationDecorationCleaner,
  type InputDataStateGetter,
  type MappingExecutionInputDataState,
  type InputDataStateBuilder,
  type MappingTestInputDataState,
  type MappingTestInputDataStateGetter,
  type MappingInputDataStateBuilder,
  type MappingTestInputDataStateBuilder,
  type InstanceSetImplementationStoreExtractor,
  type ServiceTestRuntimeConnectionBuilder,
  runtime_addIdentifiedConnection,
  type DSLService_LegendStudioPlugin_Extension,
  type ElementTypeLabelGetter,
  type PropertyMappingEditorRenderer,
  type InstanceSetImplementationState,
  type PropertyMappingState,
  type MappingElementVisitor,
  type MappingEditorState,
  type MappingElementSourceFilterTextGetter,
  type SourceElementLabelerGetter,
  type MappingElementSourceOptionBuilder,
  type MappingElementSourceSelectOption,
  type SourceOptionGetter,
  type MappingSourceTypeInfoGetter,
  type MappingSourceTypeInfo,
  type ClassMappingSourceDriverGetter,
  type SourceElementTreeRenderer,
} from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import packageJson from '../../package.json';
import { getAllRecordTypes } from '../helpers/ESFlatData_Helper.js';
import { FlatDataConnection } from '../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import type { AbstractFlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_AbstractFlatDataPropertyMapping.js';
import { EmbeddedFlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { FlatDataInputData } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import { FlatDataInstanceSetImplementation } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInstanceSetImplementation.js';
import { FlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataPropertyMapping.js';
import { FlatData } from '../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';
import { RootFlatDataRecordType } from '../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatDataDataType.js';
import { RootFlatDataRecordTypeExplicitReference } from '../models/metamodels/pure/model/store/flatData/model/ESFlatData_RootFlatDataRecordTypeReference.js';
import {
  FlatDataConnectionValueState,
  NewFlatDataConnectionDriver,
} from '../stores/studio/ESFlatData_FlatDataConnectionValueState.js';
import {
  FlatDataInstanceSetImplementationState,
  FlatDataPropertyMappingState,
  RootFlatDataInstanceSetImplementationState,
} from '../stores/studio/ESFlatData_FlatDataInstanceSetImplementationState.js';
import {
  flatData_setData,
  flatData_setSourceRootRecordType,
} from '../stores/studio/ESFlatData_GraphModifierHelper.js';
import { MappingExecutionFlatDataInputDataState } from '../stores/studio/ESFlatData_MappingExecutionFlatDataInputDataState.js';
import { MappingTestFlatDataInputDataState } from '../stores/studio/ESFlatData_MappingTestFlatDataInputDataState.js';
import { FlatDataConnectionEditor } from './ESFlatData_FlatDataConnectionEditor.js';
import { FlatDataPropertyMappingEditor } from './ESFlatData_FlatDataPropertyMappingEditor.js';
import { FlatDataRecordTypeTree } from './ESFlatData_FlatDataRecordTypeTree.js';
import { MappingExecutionFlatDataInputDataBuilder } from './ESFlatData_MappingExecutionFlatDataInputDataBuilder.js';
import { MappingTestFlatDataInputDataBuilder } from './ESFlatData_MappingTestFlatDataInputDataBuilder.js';

const FLAT_DATA_STORE_ELEMENT_TYPE = 'FLAT_DATA_STORE';
const FLAT_DATA_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_FLAT_DATA';
const FLAT_DATA_STORE_MAPPING_TYPE = 'flatData';
const EMBEDDED_FLAT_DATA_MAPPING_TYPE = 'embeddedFlatData';

export class ESFlatData_LegendStudioPlugin
  extends LegendStudioPlugin
  implements
    DSLMapping_LegendStudioPlugin_Extension,
    DSLService_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  getExtraSupportedElementTypes(): string[] {
    return [FLAT_DATA_STORE_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof FlatData) {
          return FLAT_DATA_STORE_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === FLAT_DATA_STORE_ELEMENT_TYPE) {
          return <PURE_FlatDataStoreIcon />;
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [
      (
        type: string,
        name: string,
        state: NewElementState,
      ): PackageableElement | undefined => {
        if (type === FLAT_DATA_STORE_ELEMENT_TYPE) {
          return new FlatData(name);
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorStateCreators(): ElementEditorStateCreator[] {
    return [
      (
        editorStore: EditorStore,
        element: PackageableElement,
      ): ElementEditorState | undefined => {
        if (element instanceof FlatData) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof FlatData) {
          return FLAT_DATA_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDnDTypes(): string[] {
    return [FLAT_DATA_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraElementTypeLabelGetters(): ElementTypeLabelGetter[] {
    return [
      (type: string): string | undefined => {
        if (type === FLAT_DATA_STORE_ELEMENT_TYPE) {
          return 'flat-data store';
        }
        return undefined;
      },
    ];
  }

  getExtraSetImplementationClassifiers(): SetImplemtationClassifier[] {
    return [
      (setImplementation: SetImplementation): string | undefined => {
        if (setImplementation instanceof FlatDataInstanceSetImplementation) {
          return FLAT_DATA_STORE_MAPPING_TYPE;
        } else if (
          setImplementation instanceof EmbeddedFlatDataPropertyMapping
        ) {
          return EMBEDDED_FLAT_DATA_MAPPING_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPropertyMappingEditorRenderers(): PropertyMappingEditorRenderer[] {
    return [
      (
        instanceSetImplementationState: InstanceSetImplementationState,
        propertyMappingState: PropertyMappingState,
      ): React.ReactNode | undefined => {
        if (
          instanceSetImplementationState instanceof
            FlatDataInstanceSetImplementationState &&
          propertyMappingState instanceof FlatDataPropertyMappingState
        ) {
          return (
            <FlatDataPropertyMappingEditor
              key={propertyMappingState.uuid}
              isReadOnly={false}
              flatDataInstanceSetImplementationState={
                instanceSetImplementationState
              }
              flatDataPropertyMappingState={propertyMappingState}
              setImplementationHasParserError={Boolean(
                instanceSetImplementationState.propertyMappingStates.find(
                  (pm) => pm.parserError,
                ),
              )}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraServiceTestRuntimeConnectionBuilders(): ServiceTestRuntimeConnectionBuilder[] {
    return [
      (
        sourceConnection: Connection,
        runtime: EngineRuntime,
        testData: string,
        editorStore: EditorStore,
      ): Connection | undefined => {
        if (sourceConnection instanceof FlatDataConnection) {
          runtime_addIdentifiedConnection(
            runtime,
            new IdentifiedConnection(
              generateIdentifiedConnectionId(runtime),
              new FlatDataConnection(
                PackageableElementExplicitReference.create(
                  sourceConnection.store.value,
                ),
                createUrlStringFromData(
                  testData,
                  ContentType.TEXT_PLAIN,
                  editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig()
                    .useBase64ForAdhocConnectionDataUrls,
                ),
              ),
            ),
            editorStore.changeDetectionState.observerContext,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraSetImplementationDecorators(): SetImplementationDecorator[] {
    return [
      (
        setImplementation: SetImplementation,
        editorStore: EditorStore,
      ): void => {
        if (
          setImplementation instanceof FlatDataInstanceSetImplementation ||
          setImplementation instanceof EmbeddedFlatDataPropertyMapping
        ) {
          const decoratePropertyMapping = (
            propertyMappings: AbstractFlatDataPropertyMapping[] | undefined,
            property: Property,
          ): AbstractFlatDataPropertyMapping[] => {
            // before decoration, make sure to prune stubbed property mappings in case they are nolonger compatible
            // with the set implemenetation (this happens when we switch sources)
            const existingPropertyMappings = (propertyMappings ?? []).filter(
              (pm) => {
                if (pm instanceof FlatDataPropertyMapping) {
                  return !isStubbed_RawLambda(pm.transform);
                }
                return true;
              },
            );
            const propertyType = property.genericType.value.rawType;
            if (
              propertyType instanceof PrimitiveType ||
              propertyType instanceof Unit ||
              propertyType instanceof Measure
            ) {
              // only allow one property mapping per primitive property
              assertTrue(
                !existingPropertyMappings.length ||
                  existingPropertyMappings.length === 1,
                'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) property',
              );
              return existingPropertyMappings.length
                ? [existingPropertyMappings[0] as FlatDataPropertyMapping]
                : [
                    new FlatDataPropertyMapping(
                      setImplementation,
                      PropertyExplicitReference.create(property),
                      stub_RawLambda(),
                      setImplementation,
                    ),
                  ];
            } else if (propertyType instanceof Enumeration) {
              // only allow one property mapping per enumeration property
              assertTrue(
                !existingPropertyMappings.length ||
                  existingPropertyMappings.length === 1,
                'Only one property mapping should exist per enumeration type property',
              );
              const ePropertyMapping = existingPropertyMappings.length
                ? [existingPropertyMappings[0] as FlatDataPropertyMapping]
                : [
                    new FlatDataPropertyMapping(
                      setImplementation,
                      PropertyExplicitReference.create(property),
                      stub_RawLambda(),
                      setImplementation,
                    ),
                  ];
              // Find existing enumeration mappings for the property enumeration
              const existingEnumerationMappings =
                getEnumerationMappingsByEnumeration(
                  setImplementation._PARENT,
                  getRawGenericType(
                    (ePropertyMapping[0] as FlatDataPropertyMapping).property
                      .value.genericType.value,
                    Enumeration,
                  ),
                );
              ePropertyMapping.forEach((epm) => {
                assertType(
                  epm,
                  FlatDataPropertyMapping,
                  'Property mapping for enumeration type property must be a simple property mapping',
                );
                // If there are no enumeration mappings, delete the transformer of the property mapping
                // If there is only 1 enumeration mapping, make it the transformer of the property mapping
                // Else, delete current transformer if it's not in the list of extisting enumeration mappings
                if (existingEnumerationMappings.length === 1) {
                  epm.transformer =
                    OptionalEnumerationMappingExplicitReference.create(
                      existingEnumerationMappings[0],
                    );
                } else if (
                  existingEnumerationMappings.length === 0 ||
                  !existingEnumerationMappings.find(
                    (eem) => eem === epm.transformer.value,
                  )
                ) {
                  epm.transformer =
                    OptionalEnumerationMappingExplicitReference.create(
                      undefined,
                    );
                }
              });
              return ePropertyMapping;
            } else if (propertyType instanceof Class) {
              // NOTE: flat data property mapping for complex property might change to use union.
              // As such, for now we won't support it, and will hide this from the UI for now. Since the exact playout of this is not known
              // we cannot do decoration as well.

              // assertTrue(!existingPropertyMappings.length || existingPropertyMappings.length === 1, 'Only one property mapping should exist per complex class');
              // return existingPropertyMappings.length ? [existingPropertyMappings[0]] : [];
              return existingPropertyMappings;
            }
            return [];
          };
          const propertyMappingsBeforeDecoration =
            setImplementation.propertyMappings;
          const decoratedPropertyMappings =
            getDecoratedSetImplementationPropertyMappings<AbstractFlatDataPropertyMapping>(
              setImplementation,
              decoratePropertyMapping,
            );
          mapping_setPropertyMappings(
            setImplementation,
            decoratedPropertyMappings.concat(
              propertyMappingsBeforeDecoration.filter(
                (propertyMapping) =>
                  !decoratedPropertyMappings.includes(propertyMapping),
              ),
            ),
            editorStore.changeDetectionState.observerContext,
          );
        }
      },
    ];
  }

  getExtraSetImplementationDecorationCleaners(): SetImplementationDecorationCleaner[] {
    return [
      (
        setImplementation: SetImplementation,
        editorStore: EditorStore,
      ): void => {
        if (
          setImplementation instanceof FlatDataInstanceSetImplementation ||
          setImplementation instanceof EmbeddedFlatDataPropertyMapping
        ) {
          mapping_setPropertyMappings(
            setImplementation,
            setImplementation.propertyMappings.filter(
              (propertyMapping) =>
                (propertyMapping instanceof FlatDataPropertyMapping &&
                  !isStubbed_RawLambda(propertyMapping.transform)) ||
                (propertyMapping instanceof EmbeddedFlatDataPropertyMapping &&
                  propertyMapping.property),
            ),
            editorStore.changeDetectionState.observerContext,
          );
        }
      },
    ];
  }

  getExtraMappingElementStateCreators(): MappingElementStateCreator[] {
    return [
      (
        mappingElement: MappingElement | undefined,
        editorStore: EditorStore,
      ): MappingElementState | undefined => {
        if (mappingElement instanceof FlatDataInstanceSetImplementation) {
          return new RootFlatDataInstanceSetImplementationState(
            editorStore,
            mappingElement,
          );
        } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
          throw new UnsupportedOperationError(
            `Can't create mapping element state for emebdded property mapping`,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementSourceExtractors(): MappingElementSourceExtractor[] {
    return [
      (
        mappingElement: MappingElement,
        plugins: LegendStudioPlugin[],
      ): MappingElementSource | undefined => {
        if (mappingElement instanceof FlatDataInstanceSetImplementation) {
          return mappingElement.sourceRootRecordType.value;
        } else if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
          return getMappingElementSource(
            guaranteeType(
              mappingElement.rootInstanceSetImplementation,
              FlatDataInstanceSetImplementation,
            ),
            plugins,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementTargetExtractors(): MappingElementTargetExtractor[] {
    return [
      (mappingElement: MappingElement): PackageableElement | undefined => {
        if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
          return mappingElement.class.value;
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementVisitors(): MappingElementVisitor[] {
    return [
      (
        instanceSetImplementationState: InstanceSetImplementationState,
        mappingEditorState: MappingEditorState,
        property: Property,
      ): void => {
        if (
          instanceSetImplementationState instanceof
          FlatDataInstanceSetImplementationState
        ) {
          const propertyMappingStates =
            instanceSetImplementationState.propertyMappingStates;
          if (
            propertyMappingStates.length === 1 &&
            propertyMappingStates[0]?.propertyMapping instanceof
              EmbeddedFlatDataPropertyMapping
          ) {
            mappingEditorState.openMappingElement(
              propertyMappingStates[0].propertyMapping,
              true,
            );
          } else if (!propertyMappingStates.length) {
            const embedded =
              instanceSetImplementationState.addEmbeddedPropertyMapping(
                property,
              );
            mappingEditorState.openMappingElement(embedded, true);
          }
        }
      },
    ];
  }

  getExtraMappingInputDataStateBuilders(): MappingInputDataStateBuilder[] {
    return [
      (
        inputDataState: MappingExecutionInputDataState,
      ): React.ReactNode | undefined => {
        if (inputDataState instanceof MappingExecutionFlatDataInputDataState) {
          return (
            <MappingExecutionFlatDataInputDataBuilder
              inputDataState={inputDataState}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingTestInputDataStateBuilders(): MappingTestInputDataStateBuilder[] {
    return [
      (
        inputDataState: MappingTestInputDataState,
        isReadOnly: boolean,
      ): React.ReactNode | undefined => {
        if (inputDataState instanceof MappingTestFlatDataInputDataState) {
          return (
            <MappingTestFlatDataInputDataBuilder
              inputDataState={inputDataState}
              isReadOnly={isReadOnly}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementSourceFilterTextGetters(): MappingElementSourceFilterTextGetter[] {
    return [
      (value: unknown): string | undefined => {
        if (value instanceof RootFlatDataRecordType) {
          return value._OWNER.name;
        }
        return undefined;
      },
    ];
  }

  getExtraSourceElementLabelerGetters(): SourceElementLabelerGetter[] {
    return [
      (source: unknown): string | undefined => {
        if (source instanceof RootFlatDataRecordType) {
          return source._OWNER.name;
        }
        return undefined;
      },
    ];
  }

  getExtraDnDSourceTypes(): string[] {
    return [FLAT_DATA_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraMappingSourceTypeInfoGetters(): MappingSourceTypeInfoGetter[] {
    return [
      (
        setImplementation: SetImplementation,
      ): MappingSourceTypeInfo | undefined => {
        if (setImplementation instanceof FlatDataInstanceSetImplementation) {
          return {
            sourceType: 'FLAT DATA',
            sourceName:
              setImplementation.sourceRootRecordType.value._OWNER.name,
          };
        } else if (
          setImplementation instanceof EmbeddedFlatDataPropertyMapping
        ) {
          return {
            sourceType: 'FLAT DATA',
            sourceName: (
              setImplementation.rootInstanceSetImplementation as FlatDataInstanceSetImplementation
            ).sourceRootRecordType.value._OWNER.name,
          };
        }
        return undefined;
      },
    ];
  }

  getExtraSourceOptionGetters(): SourceOptionGetter[] {
    return [
      (editorStore: EditorStore): unknown[] =>
        editorStore.graphManagerState.graph.ownStores
          .flatMap((store) =>
            store instanceof FlatData ? getAllRecordTypes(store) : undefined,
          )
          .filter(isNonNullable),
    ];
  }

  getExtraMappingElementSourceOptionBuilders(): MappingElementSourceOptionBuilder[] {
    return [
      (source: unknown): MappingElementSourceSelectOption | undefined => {
        if (source instanceof RootFlatDataRecordType) {
          return {
            label: `${source._OWNER._OWNER.name}.${source._OWNER.name}`,
            value: source,
          };
        }
        return undefined;
      },
    ];
  }

  getExtraInputDataStateBuilders(): InputDataStateBuilder[] {
    return [
      (
        inputData: InputData,
        editorStore: EditorStore,
        mapping: Mapping,
      ): MappingTestInputDataState | undefined => {
        if (inputData instanceof FlatDataInputData) {
          return new MappingTestFlatDataInputDataState(
            editorStore,
            mapping,
            inputData,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraInstanceSetImplementationStoreExtractors(): InstanceSetImplementationStoreExtractor[] {
    return [
      (sourceElement: MappingElementSource): Store | undefined => {
        if (sourceElement instanceof RootFlatDataRecordType) {
          return sourceElement._OWNER._OWNER;
        }
        return undefined;
      },
    ];
  }

  getExtraInputDataStateGetters(): InputDataStateGetter[] {
    return [
      (
        source: unknown,
        editorStore: EditorStore,
        mapping: Mapping,
        populateWithMockData: boolean,
      ): MappingExecutionInputDataState | undefined => {
        if (source instanceof RootFlatDataRecordType) {
          const newRuntimeState = new MappingExecutionFlatDataInputDataState(
            editorStore,
            mapping,
            source,
          );
          if (populateWithMockData) {
            flatData_setData(
              newRuntimeState.inputData,
              createMockDataForMappingElementSource(source, editorStore),
            );
          }
          return newRuntimeState;
        }
        return undefined;
      },
    ];
  }

  getExtraMappingTestInputDataStateGetters(): MappingTestInputDataStateGetter[] {
    return [
      (
        source: unknown,
        editorStore: EditorStore,
        mapping: Mapping,
        populateWithMockData: boolean,
      ): MappingTestInputDataState | undefined => {
        if (source instanceof RootFlatDataRecordType) {
          const newInputDataState = new MappingTestFlatDataInputDataState(
            editorStore,
            mapping,
            new FlatDataInputData(
              PackageableElementExplicitReference.create(
                guaranteeNonNullable(source._OWNER._OWNER),
              ),
              '',
            ),
          );
          if (populateWithMockData) {
            flatData_setData(
              newInputDataState.inputData,
              createMockDataForMappingElementSource(source, editorStore),
            );
          }
          return newInputDataState;
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementDeleteEntryGetters(): MappingElementDeleteEntryGetter[] {
    return [
      (mappingElement: MappingElement): void => {
        if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
          deleteEntry(mappingElement._OWNER.propertyMappings, mappingElement);
        }
      },
    ];
  }

  getExtraMappingExplorerTreeNodeExpandActionSetters(): MappingExplorerTreeNodeExpandActionSetter[] {
    return [
      (
        node: MappingExplorerTreeNodeData,
        editorStore: EditorStore,
        treeData: TreeData<MappingExplorerTreeNodeData>,
      ): void => {
        const mappingElement = node.mappingElement;
        if (
          mappingElement instanceof FlatDataInstanceSetImplementation ||
          mappingElement instanceof EmbeddedFlatDataPropertyMapping
        ) {
          mappingElement.propertyMappings
            .filter(filterByType(EmbeddedFlatDataPropertyMapping))
            .forEach((embeddedPM) => {
              const embeddedPropertyNode = getMappingElementTreeNodeData(
                embeddedPM,
                editorStore,
              );
              treeData.nodes.set(embeddedPropertyNode.id, embeddedPropertyNode);
            });
        }
      },
    ];
  }

  getExtraMappingElementReprocessors(): MappingElementReprocessor[] {
    return [
      (
        mappingElement: MappingElement,
        nodeData: MappingExplorerTreeNodeData,
        treeNodes: Map<string, MappingExplorerTreeNodeData>,
        openNodes: string[],
        editorStore: EditorStore,
      ): void => {
        if (
          mappingElement instanceof FlatDataInstanceSetImplementation ||
          mappingElement instanceof EmbeddedFlatDataPropertyMapping
        ) {
          const embedded = mappingElement.propertyMappings.filter(
            filterByType(EmbeddedFlatDataPropertyMapping),
          );
          nodeData.childrenIds = embedded.map(
            (e) => `${nodeData.id}.${e.property.value.name}`,
          );
          if (openNodes.includes(mappingElement.id.value)) {
            nodeData.isOpen = true;
            embedded.forEach((e) =>
              reprocessMappingElement(e, treeNodes, openNodes, editorStore),
            );
          }
        }
      },
    ];
  }

  getExtraMappingElementTypeGetters(): MappingElementTypeGetter[] {
    return [
      (mappingElement: MappingElement): MAPPING_ELEMENT_TYPE | undefined => {
        if (mappingElement instanceof EmbeddedFlatDataPropertyMapping) {
          return MAPPING_ELEMENT_TYPE.CLASS;
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementTreeNodeDataChildIdsGetters(): MappingElementTreeNodeDataChildIdsGetter[] {
    return [
      (
        mappingElement: MappingElement,
        nodeData: MappingExplorerTreeNodeData,
      ): string[] | undefined => {
        if (
          mappingElement instanceof FlatDataInstanceSetImplementation ||
          mappingElement instanceof EmbeddedFlatDataPropertyMapping
        ) {
          const embedded = mappingElement.propertyMappings.filter(
            filterByType(EmbeddedFlatDataPropertyMapping),
          );
          return embedded.map((e) => `${nodeData.id}.${e.property.value.name}`);
        }
        return undefined;
      },
    ];
  }

  getExtraInstanceSetImplementationSourceUpdaters(): InstanceSetImplementationSourceUpdater[] {
    return [
      (
        setImplementation: InstanceSetImplementation,
        newSource: unknown | undefined,
      ): boolean => {
        if (setImplementation instanceof FlatDataInstanceSetImplementation) {
          if (
            newSource instanceof RootFlatDataRecordType &&
            !getEmbeddedSetImplementations(setImplementation).length
          ) {
            flatData_setSourceRootRecordType(setImplementation, newSource);
            return true;
          }
        }
        return false;
      },
    ];
  }

  getExtraInputDataGetters(): InputDataGetter[] {
    return [
      (source: unknown, editorStore: EditorStore): InputData | undefined => {
        if (source instanceof RootFlatDataRecordType) {
          return new FlatDataInputData(
            PackageableElementExplicitReference.create(source._OWNER._OWNER),
            createMockDataForMappingElementSource(source, editorStore),
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementGetters(): MappingElementGetter[] {
    return [
      (
        mapping: Mapping,
        mappingElementId: string,
      ): MappingElement | undefined =>
        mapping.classMappings
          .filter(filterByType(InstanceSetImplementation))
          .map(getEmbeddedSetImplementations)
          .flat()
          .filter(filterByType(EmbeddedFlatDataPropertyMapping))
          .find(
            (me: { id: { value: string } }) => me.id.value === mappingElementId,
          ),
    ];
  }

  getExtraNewSetImplementationGetters(): NewSetImplementationGetter[] {
    return [
      (
        newSource: unknown,
        setImplementation: SetImplementation,
        mapping: Mapping,
      ): InstanceSetImplementation | undefined => {
        if (newSource instanceof RootFlatDataRecordType) {
          return new FlatDataInstanceSetImplementation(
            setImplementation.id,
            mapping,
            PackageableElementExplicitReference.create(
              setImplementation.class.value,
            ),
            setImplementation.root,
            RootFlatDataRecordTypeExplicitReference.create(newSource),
          );
        }
        return undefined;
      },
    ];
  }

  getExtraClassMappingSourceDriverGetters(): ClassMappingSourceDriverGetter[] {
    return [
      (
        element: PackageableElement,
        applicationStore: ApplicationStore<LegendApplicationConfig>,
        mappingEditorState: MappingEditorState,
        setImplementation: InstanceSetImplementation,
      ): unknown | undefined => {
        if (element instanceof FlatData) {
          const allRecordTypes = getAllRecordTypes(element);
          if (allRecordTypes.length === 0) {
            applicationStore.notifyWarning(
              `Source flat-data store '${element.path}' must have at least one action`,
            );
            return undefined;
          }
          if (allRecordTypes.length === 1) {
            flowResult(
              mappingEditorState.changeClassMappingSourceDriver(
                setImplementation,
                allRecordTypes[0],
              ),
            ).catch(applicationStore.alertUnhandledError);
          } else {
            return allRecordTypes[0];
          }
        }
        return undefined;
      },
    ];
  }

  getExtraSetImplementationMappingElementLabelInfoBuilders(): SetImplementationMappingElementLabelInfoBuilder[] {
    return [
      (
        setImplementation: SetImplementation,
      ): MappingElementLabel | undefined => {
        if (setImplementation instanceof EmbeddedFlatDataPropertyMapping) {
          return {
            value: `${setImplementation.class.value.name} [${setImplementation.property.value.name}]`,
            root: setImplementation.root.value,
            tooltip: setImplementation.class.value.path,
          };
        }
        return undefined;
      },
    ];
  }

  getExtraSourceElementTreeRenderers(): SourceElementTreeRenderer[] {
    return [
      (
        srcElement: unknown,
        instanceSetImplementationState: InstanceSetImplementationState,
      ): React.ReactNode | undefined => {
        if (srcElement instanceof RootFlatDataRecordType) {
          return (
            <FlatDataRecordTypeTree
              recordType={srcElement}
              selectedType={instanceSetImplementationState.selectedType}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraRuntimeConnectionTooltipTextBuilders(): RuntimeConnectionTooltipTextBuilder[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof FlatDataConnection) {
          return `Flat-data connection \u2022 Flat-data store ${connection.store.value.path}`;
        }
        return undefined;
      },
    ];
  }

  getExtraDefaultConnectionValueBuilders(): DefaultConnectionValueBuilder[] {
    return [
      (store: Store): Connection | undefined => {
        if (store instanceof FlatData) {
          return new FlatDataConnection(
            PackageableElementExplicitReference.create(store),
          );
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionValueEditorStateBuilders(): ConnectionValueEditorStateBuilder[] {
    return [
      (
        editorStore: EditorStore,
        connection: Connection,
      ): ConnectionValueState | undefined => {
        if (connection instanceof FlatDataConnection) {
          return new FlatDataConnectionValueState(editorStore, connection);
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionEditorRenderers(): ConnectionEditorRenderer[] {
    return [
      (
        connectionValueState: ConnectionValueState,
        isReadOnly: boolean,
      ): React.ReactNode | undefined => {
        if (connectionValueState instanceof FlatDataConnectionValueState) {
          return (
            <FlatDataConnectionEditor
              connectionValueState={connectionValueState}
              isReadOnly={isReadOnly}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraNewConnectionDriverCreators(): NewConnectionDriverCreator[] {
    return [
      (
        editorStore: EditorStore,
        store: Store,
      ): NewConnectionValueDriver<Connection> | undefined => {
        if (store instanceof FlatData) {
          return new NewFlatDataConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }
}
