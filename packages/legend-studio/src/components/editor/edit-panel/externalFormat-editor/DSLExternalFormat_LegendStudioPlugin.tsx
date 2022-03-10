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
import { BufferIcon, SitemapIcon } from '@finos/legend-art';
import { SchemaSetEditor } from './SchemaSetElementEditor';
import {
  type Connection,
  type PackageableElement,
  type Store,
  OptionalPackageableElementExplicitReference,
  PackageableElementExplicitReference,
  SchemaSet,
  Binding,
  ModelUnit,
  ExternalFormatConnection,
  UrlStream,
} from '@finos/legend-graph';
import {
  ExternalFormatConnectionEditor,
  ExternalFormatConnectionValueState,
  NewExternalFormatConnectionDriver,
} from './ExternalFormatConnectionEditor';
import { BindingEditor } from './BindingElementEditor';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { ReactNode } from 'react';
import {
  type ElementEditorRenderer,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementTypeGetter,
  type NewElementDriverCreator,
  type NewElementDriverEditorRenderer,
  type NewElementFromStateCreator,
  LegendStudioPlugin,
} from '../../../../stores/LegendStudioPlugin';
import type {
  ConnectionEditorRenderer,
  ConnectionValueEditorStateBuilder,
  DefaultConnectionValueBuilder,
  DSLMapping_LegendStudioPlugin_Extension,
  NewConnectionDriverCreator,
  RuntimeConnectionTooltipTextBuilder,
} from '../../../../stores/DSLMapping_LegendStudioPlugin_Extension';
import type {
  NewConnectionValueDriver,
  NewElementDriver,
  NewElementState,
} from '../../../../stores/NewElementState';
import {
  NewSchemaSetDriver,
  NewSchemaSetDriverEditor,
} from '../../../../stores/editor-state/element-editor-state/externalFormat/NewSchemaSetDriver';
import type { EditorStore } from '../../../../stores/EditorStore';
import type { ElementEditorState } from '../../../../stores/editor-state/element-editor-state/ElementEditorState';
import { SchemaSetEditorState } from '../../../../stores/editor-state/element-editor-state/externalFormat/SchemaSetEditorState';
import { BindingEditorState } from '../../../../stores/editor-state/element-editor-state/externalFormat/BindingEditorState';
import type { ConnectionValueState } from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState';

const SCHEMA_SET_ELEMENT_TYPE = 'SCHEMASET';
const SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SCHEMA_SET';
const BINDING_ELEMENT_TYPE = 'BINDING';
const BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_BINDING';

export class DSLExternalFormat_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSLMapping_LegendStudioPlugin_Extension
{
  constructor() {
    super('@finos/legend-studio-plugin-dsl-externalFormat', 'workspace:*');
  }

  getExtraSupportedElementTypes(): string[] {
    return [SCHEMA_SET_ELEMENT_TYPE, BINDING_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof SchemaSet) {
          return SCHEMA_SET_ELEMENT_TYPE;
        } else if (element instanceof Binding) {
          return BINDING_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return (
            <div className="icon icon--schema-set">
              <SitemapIcon />
            </div>
          );
        } else if (type === BINDING_ELEMENT_TYPE) {
          return (
            <div className="icon icon--binding">
              <BufferIcon />
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorRenderers(): ElementEditorRenderer[] {
    return [
      (elementEditorState: ElementEditorState): React.ReactNode | undefined => {
        if (elementEditorState instanceof SchemaSetEditorState) {
          return <SchemaSetEditor key={elementEditorState.uuid} />;
        } else if (elementEditorState instanceof BindingEditorState) {
          return <BindingEditor key={elementEditorState.uuid} />;
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
        const externalFormatState =
          state.editorStore.graphState.graphGenerationState.externalFormatState;

        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          const schemaSet = state
            .getNewElementDriver(NewSchemaSetDriver)
            .createElement(name);
          return schemaSet;
        } else if (type === BINDING_ELEMENT_TYPE) {
          const binding = new Binding(name);
          binding.setContentType(
            guaranteeNonNullable(externalFormatState.formatContentTypes[0]),
          );
          binding.schemaSet =
            OptionalPackageableElementExplicitReference.create<SchemaSet>(
              undefined,
            );
          const modelUnit = new ModelUnit();
          binding.modelUnit = modelUnit;
          return binding;
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
        if (element instanceof SchemaSet) {
          return new SchemaSetEditorState(editorStore, element);
        } else if (element instanceof Binding) {
          return new BindingEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverCreators(): NewElementDriverCreator[] {
    return [
      (
        type: string,
        editorStore: EditorStore,
      ): NewElementDriver<PackageableElement> | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return new NewSchemaSetDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverEditorRenderers(): NewElementDriverEditorRenderer[] {
    return [
      (type: string): ReactNode | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return <NewSchemaSetDriverEditor />;
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof SchemaSet) {
          return SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        } else if (element instanceof Binding) {
          return BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }
  getExtraGrammarTextEditorDnDTypes(): string[] {
    return [
      SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
      BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
    ];
  }

  getExtraRuntimeConnectionTooltipTextBuilders(): RuntimeConnectionTooltipTextBuilder[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof ExternalFormatConnection) {
          return `External format connection \u2022 store ${connection.store.value.path}`;
        }
        return undefined;
      },
    ];
  }

  getExtraDefaultConnectionValueBuilders(): DefaultConnectionValueBuilder[] {
    return [
      (store: Store): Connection | undefined => {
        if (store instanceof Binding) {
          const externalFormatConnection = new ExternalFormatConnection(
            PackageableElementExplicitReference.create(store),
          );
          const urlStream = new UrlStream();
          urlStream.setUrl('');
          externalFormatConnection.externalSource = urlStream;
          return externalFormatConnection;
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
        if (connection instanceof ExternalFormatConnection) {
          return new ExternalFormatConnectionValueState(
            editorStore,
            connection,
          );
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
        if (
          connectionValueState instanceof ExternalFormatConnectionValueState
        ) {
          return (
            <ExternalFormatConnectionEditor
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
        if (store instanceof Binding) {
          return new NewExternalFormatConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }
}
