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
  LockIcon,
  FireIcon,
  StickArrowCircleRightIcon,
  Panel,
  PanelContent,
} from '@finos/legend-art';
import type { PackageableElement } from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  ArtifactGenerationViewerState,
  getEditorLanguageForFormat,
  getTextContent,
} from '../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import type { FileSystem_File } from '../../../stores/editor/utils/FileSystemTreeUtils.js';

export const FileSystem_FileViewer = observer(
  (props: {
    generatedArtifact: FileSystem_File;
    visitGenerator: ((generator: PackageableElement) => void) | undefined;
    generator: PackageableElement | undefined;
  }) => {
    const { generatedArtifact, visitGenerator, generator } = props;
    return (
      <div className="file-generation-viewer">
        <Panel>
          <div className="panel__header">
            <div className="panel__header__title">
              {
                <div className="uml-element-editor__header__lock">
                  <LockIcon />
                </div>
              }
              <div className="panel__header__title__label">
                generated-artifact
              </div>
              <div className="panel__header__title__content">
                {generatedArtifact.name}
              </div>
            </div>
          </div>
          <div className="panel file-generation-viewer__content">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">
                  {generator?.name}
                </div>
              </div>
              <div className="panel__header__actions">
                {generator && (
                  <button
                    className="uml-element-editor__header__generation-origin"
                    onClick={(): void => visitGenerator?.(generator)}
                    tabIndex={-1}
                    title={`Visit generation parent '${generator.path}'`}
                  >
                    <div className="uml-element-editor__header__generation-origin__label">
                      <FireIcon />
                    </div>
                    <div className="uml-element-editor__header__generation-origin__parent-name">
                      {generator.name}
                    </div>
                    <div className="uml-element-editor__header__generation-origin__visit-btn">
                      <StickArrowCircleRightIcon />
                    </div>
                  </button>
                )}
              </div>
            </div>
            <PanelContent>
              <CodeEditor
                inputValue={getTextContent(
                  generatedArtifact.content,
                  generatedArtifact.format,
                )}
                isReadOnly={true}
                language={getEditorLanguageForFormat(generatedArtifact.format)}
              />
            </PanelContent>
          </div>
        </Panel>
      </div>
    );
  },
);

export const ArtifactGenerationViewer = observer(() => {
  const editorStore = useEditorStore();
  const generatedArtifactState =
    editorStore.tabManagerState.getCurrentEditorState(
      ArtifactGenerationViewerState,
    );
  const generatedArtifact = generatedArtifactState.artifact;
  const generator = generatedArtifact.parentId
    ? editorStore.graphManagerState.graph.getNullableElement(
        generatedArtifact.parentId,
      )
    : undefined;
  const visitGenerator = (fg: PackageableElement): void =>
    editorStore.graphEditorMode.openElement(fg);

  return (
    <FileSystem_FileViewer
      generatedArtifact={generatedArtifact}
      generator={generator}
      visitGenerator={visitGenerator}
    />
  );
});
