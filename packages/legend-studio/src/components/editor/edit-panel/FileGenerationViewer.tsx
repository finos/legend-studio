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
  FileGenerationViewerState,
  getTextContent,
  getEditorLanguageFromFormat,
} from '../../../stores/editor-state/FileGenerationViewerState';
import { FaLock, FaFire, FaArrowCircleRight } from 'react-icons/fa';
import { TextInputEditor } from '../../shared/TextInputEditor';
import type { FileGenerationSpecification } from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider';

export const FileGenerationViewer = observer(() => {
  const editorStore = useEditorStore();
  const generatedFileState = editorStore.getCurrentEditorState(
    FileGenerationViewerState,
  );
  const generatedFile = generatedFileState.generatedFile;
  const fileGeneration = generatedFile.parentId
    ? editorStore.graphState.graph.getNullableFileGeneration(
        generatedFile.parentId,
      )
    : undefined;
  const visitFileGeneration = (fg: FileGenerationSpecification): void =>
    editorStore.openElement(fg);

  return (
    <div className="file-generation-viewer">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {
              <div className="uml-element-editor__header__lock">
                <FaLock />
              </div>
            }
            <div className="panel__header__title__label">generated-file</div>
            <div className="panel__header__title__content">
              {generatedFile.name}
            </div>
          </div>
        </div>
        <div className="panel file-generation-viewer__content">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">
                {fileGeneration?.type}
              </div>
            </div>
            <div className="panel__header__actions">
              {fileGeneration && (
                <button
                  className="uml-element-editor__header__generation-origin"
                  onClick={(): void => visitFileGeneration(fileGeneration)}
                  tabIndex={-1}
                  title={`Visit generation parent '${fileGeneration.path}'`}
                >
                  <div className="uml-element-editor__header__generation-origin__label">
                    <FaFire />
                  </div>
                  <div className="uml-element-editor__header__generation-origin__parent-name">
                    {fileGeneration.name}
                  </div>
                  <div className="uml-element-editor__header__generation-origin__visit-btn">
                    <FaArrowCircleRight />
                  </div>
                </button>
              )}
            </div>
          </div>
          <div className="panel__content">
            {
              <TextInputEditor
                inputValue={getTextContent(
                  generatedFile.content,
                  generatedFile.format,
                )}
                isReadOnly={true}
                language={getEditorLanguageFromFormat(generatedFile.format)}
              />
            }
          </div>
        </div>
      </div>
    </div>
  );
});
