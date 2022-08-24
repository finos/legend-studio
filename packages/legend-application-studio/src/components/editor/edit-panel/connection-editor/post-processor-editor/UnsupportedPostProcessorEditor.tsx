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

import { useApplicationStore } from '@finos/legend-application';
import { BlankPanelPlaceholder } from '@finos/legend-art';
import type { PostProcessor } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../EditorStoreProvider.js';

export const UnsupportedPostProcessorEditor = observer(
  (props: { postprocessor: PostProcessor }) => {
    const { postprocessor } = props;

    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const clickTextMode = applicationStore.guardUnhandledError(() =>
      flowResult(editorStore.toggleTextMode()),
    );

    return (
      <div className="panel__content">
        <BlankPanelPlaceholder
          text="Your post processor type is currently unsupported in the editor, please edit in text mode."
          onClick={clickTextMode}
          clickActionType="modify"
          tooltipText="Switch to text mode"
        />
      </div>
    );
  },
);
