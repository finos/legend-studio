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
import { UMLEditorState } from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import { ClassEditor } from './ClassEditor';
import { EnumerationEditor } from './EnumerationEditor';
import { AssociationEditor } from './AssociationEditor';
import { ProfileEditor } from './ProfileEditor';
import { useEditorStore } from '../../EditorStoreProvider';
import { Class, Enumeration, Association, Profile } from '@finos/legend-graph';

export const UMLEditor = observer(() => {
  const editorStore = useEditorStore();
  const umlEditorState = editorStore.getCurrentEditorState(UMLEditorState);
  const currentElement = umlEditorState.element;

  return (
    <div className="uml-editor">
      {currentElement instanceof Class && (
        <ClassEditor _class={currentElement} />
      )}
      {currentElement instanceof Enumeration && (
        <EnumerationEditor enumeration={currentElement} />
      )}
      {currentElement instanceof Association && (
        <AssociationEditor association={currentElement} />
      )}
      {currentElement instanceof Profile && (
        <ProfileEditor profile={currentElement} />
      )}
    </div>
  );
});
