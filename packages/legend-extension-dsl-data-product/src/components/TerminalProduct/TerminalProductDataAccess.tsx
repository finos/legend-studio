/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import type { TerminalProductDataAccessState } from '../../stores/TerminalProduct/TerminalProductDataAccessState.js';
import { TerminalEntitlementsAccessCreator } from './TerminalEntitlementsAccessCreator.js';

export const TerminalAccessButton = observer(
  (props: { handleAccessButtonClick: () => void }) => {
    const { handleAccessButtonClick } = props;

    const { label, color, onClick } = {
      label: 'REQUEST ACCESS',
      color: 'primary' as const,
      onClick: handleAccessButtonClick,
    };

    return (
      <>
        <Button
          variant="contained"
          color={color}
          onClick={onClick}
          loading={false}
        >
          {label}
        </Button>
      </>
    );
  },
);
export const TerminalAccessViewer = observer(
  (props: {
    terminalProductDataAccessState: TerminalProductDataAccessState;
  }) => {
    const { terminalProductDataAccessState } = props;

    const [showTerminalAccessCreator, setShowTerminalAccessCreator] =
      useState(false);

    const handleRequestAccessButtonClick = useCallback((): void => {
      setShowTerminalAccessCreator(true);
    }, []);

    return (
      <>
        <TerminalAccessButton
          handleAccessButtonClick={handleRequestAccessButtonClick}
        />
        {showTerminalAccessCreator && (
          <TerminalEntitlementsAccessCreator
            open={true}
            onClose={() => setShowTerminalAccessCreator(false)}
            terminalAccessState={terminalProductDataAccessState}
          />
        )}
      </>
    );
  },
);
