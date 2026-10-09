/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { useEditorStore } from '@finos/legend-application-studio';
import {
  PanelForm,
  PanelFormBooleanField,
  PanelFormTextField,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { DataSpaceRelatedDataSpacesSection } from './DataSpaceRelatedDataSpacesSection.js';

export const DataSpaceInfoTab = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const isReadOnly = dataSpaceState.isReadOnly;

  return (
    <PanelForm>
      <PanelFormBooleanField
        name="Verified"
        prompt="Marks this Data Space as verified"
        value={dataSpaceState.isVerified}
        isReadOnly={isReadOnly}
        update={(value): void => dataSpaceState.toggleVerified(Boolean(value))}
      />
      <PanelFormBooleanField
        name="In Development"
        prompt="Marks this Data Space as still in development"
        value={dataSpaceState.isInDevelopment}
        isReadOnly={isReadOnly}
        update={(value): void =>
          dataSpaceState.toggleInDevelopment(Boolean(value))
        }
      />
      <PanelFormBooleanField
        name="External"
        prompt="Marks this Data Space as externally sourced"
        value={dataSpaceState.isExternal}
        isReadOnly={isReadOnly}
        update={(value): void => dataSpaceState.toggleExternal(Boolean(value))}
      />
      <PanelFormTextField
        name="Deprecation Notice"
        value={dataSpaceState.deprecationNotice}
        isReadOnly={isReadOnly}
        update={(value): void => dataSpaceState.setDeprecationNotice(value)}
      />
      <DataSpaceRelatedDataSpacesSection />
    </PanelForm>
  );
});
