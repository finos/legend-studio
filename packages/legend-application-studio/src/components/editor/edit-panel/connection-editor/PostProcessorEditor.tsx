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

import { clsx } from '@finos/legend-art';
import type { PostProcessor } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { RelationalDatabaseConnectionValueState } from '../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';

export const PostProcessorEditor = observer(
  (props: {
    postprocessor: PostProcessor;
    connectionValueState: RelationalDatabaseConnectionValueState;
    title: string;
    firstSelectedPostProcessor: PostProcessor | undefined;
  }) => {
    const {
      postprocessor,
      connectionValueState,
      title,
      firstSelectedPostProcessor,
    } = props;
    const setSelectedPostP = (val: PostProcessor): void => {
      connectionValueState.setSelectedPostProcessor(val);
    };
    const selectPostP = (): void => setSelectedPostP(postprocessor);

    return (
      <div
        className={clsx(
          'panel__explorer__item',
          {
            '': !(postprocessor === firstSelectedPostProcessor),
          },
          {
            'panel__explorer__item--selected':
              postprocessor === firstSelectedPostProcessor,
          },
        )}
        onClick={selectPostP}
      >
        <div className="panel__explorer__item__label">{title}</div>
      </div>
    );
  },
);
