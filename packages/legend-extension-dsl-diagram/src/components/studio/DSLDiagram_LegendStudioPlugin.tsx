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

import packageJson from '../../../package.json';
import {
  LegendStudioPlugin,
  type NewElementFromStateCreator,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementTypeGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementIconGetter,
  type ElementEditorRenderer,
  type DSL_LegendStudioPlugin_Extension,
  type NewElementState,
  type ElementEditorPostDeleteAction,
  type ElementEditorPostRenameAction,
  type ClassPreviewRenderer,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserElementDocumentationGetter,
} from '@finos/legend-studio';
import { ShapesIcon } from '@finos/legend-art';
import type { Class, PackageableElement } from '@finos/legend-graph';
import { Diagram } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_Diagram';
import { DiagramEditorState } from '../../stores/studio/DiagramEditorState';
import { DiagramEditor } from './DiagramEditor';
import { ClassDiagramPreview } from './ClassDiagramPreview';
import {
  type LegendApplicationDocumentationEntry,
  type LegendApplicationKeyedDocumentationEntry,
  collectKeyedDocumnetationEntriesFromConfig,
} from '@finos/legend-application';
import {
  PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_DIAGRAM_PARSER_NAME,
} from '../../graphManager/DSLDiagram_PureGraphManagerPlugin';
import {
  DSL_DIAGRAM_DOCUMENTATION_ENTRIES,
  DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY,
} from './DSLDiagram_LegendStudioDocumentation';

const DIAGRAM_ELEMENT_TYPE = 'DIAGRAM';
const DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_DIAGRAM';

export class DSLDiagram_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSL_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  override getExtraKeyedDocumentationEntries(): LegendApplicationKeyedDocumentationEntry[] {
    return collectKeyedDocumnetationEntriesFromConfig(
      DSL_DIAGRAM_DOCUMENTATION_ENTRIES,
    );
  }

  override getExtraClassPreviewRenderers(): ClassPreviewRenderer[] {
    return [
      (_class: Class): React.ReactNode => (
        <ClassDiagramPreview _class={_class} />
      ),
    ];
  }

  getExtraSupportedElementTypes(): string[] {
    return [DIAGRAM_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Diagram) {
          return DIAGRAM_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === DIAGRAM_ELEMENT_TYPE) {
          return (
            <div className="icon color--diagram">
              <ShapesIcon />
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
        if (elementEditorState instanceof DiagramEditorState) {
          return <DiagramEditor key={elementEditorState.uuid} />;
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
        if (type === DIAGRAM_ELEMENT_TYPE) {
          return new Diagram(name);
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
        if (element instanceof Diagram) {
          return new DiagramEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Diagram) {
          return DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDnDTypes(): string[] {
    return [DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraElementEditorPostRenameActions(): ElementEditorPostRenameAction[] {
    return [
      (editorStore: EditorStore, element: PackageableElement): void => {
        // rerender currently opened diagram
        if (editorStore.currentEditorState instanceof DiagramEditorState) {
          editorStore.currentEditorState.renderer.render();
        }
      },
    ];
  }

  getExtraElementEditorPostDeleteActions(): ElementEditorPostDeleteAction[] {
    return [
      (editorStore: EditorStore, element: PackageableElement): void => {
        // rerender currently opened diagram
        if (editorStore.currentEditorState instanceof DiagramEditorState) {
          editorStore.currentEditorState.renderer.render();
        }
      },
    ];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_DIAGRAM_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.docRegistry.getEntry(
              DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DIAGRAM_ELEMENT,
            );
          }
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarParserDocumentationGetters(): PureGrammarParserDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_DIAGRAM_PARSER_NAME) {
          return editorStore.applicationStore.docRegistry.getEntry(
            DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
          );
        }
        return undefined;
      },
    ];
  }
}
