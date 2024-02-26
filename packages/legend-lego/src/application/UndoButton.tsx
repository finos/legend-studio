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

import { UndoIcon } from '@finos/legend-art';
import { useEffect } from 'react';

export const UndoButton: React.FC<{
  isUndoUnderContext: boolean;
  canUndo: boolean;
  undo: () => void;
}> = (props) => {
  const { isUndoUnderContext, canUndo, undo } = props;

  useEffect(() => {
    const onCtrlZ = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === 'z' && isUndoUnderContext) {
        event.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onCtrlZ);
    return () => {
      document.removeEventListener('keydown', onCtrlZ);
    };
  }, [isUndoUnderContext, undo]);

  return (
    <div className="undo-redo">
      <button
        className="undo-redo__button"
        onClick={undo}
        tabIndex={-1}
        title={'Undo(ctrl + z)'}
        disabled={!canUndo}
      >
        <UndoIcon />
        <div className="undo-redo__button__label">Undo</div>
      </button>
    </div>
  );
};
