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

import { RedoIcon } from '@finos/legend-art';
import { useEffect } from 'react';

export const RedoButton: React.FC<{
  isRedoUnderContext: boolean;
  canRedo: boolean;
  redo: () => void;
}> = (props) => {
  const { isRedoUnderContext, canRedo, redo } = props;

  useEffect(() => {
    const onCtrlY = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === 'y' && isRedoUnderContext) {
        event.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', onCtrlY);
    return () => {
      document.removeEventListener('keydown', onCtrlY);
    };
  }, [isRedoUnderContext, redo]);

  return (
    <div className="undo-redo">
      <button
        className="undo-redo__button"
        onClick={redo}
        tabIndex={-1}
        title={'Redo(ctrl + y)'}
        disabled={!canRedo}
      >
        <RedoIcon />
        <div className="undo-redo__button__label">Redo</div>
      </button>
    </div>
  );
};
