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

import { observer } from 'mobx-react-lite';
import { useState, type ChangeEvent } from 'react';
import { flowResult } from 'mobx';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import type { TerminalProductDataAccessState } from '../../stores/TerminalProduct/TerminalProductDataAccessState.js';

export const TerminalEntitlementsAccessCreator = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    terminalAccessState: TerminalProductDataAccessState;
  }) => {
    const { open, onClose, terminalAccessState } = props;
    const terminalProductViewerState = terminalAccessState.viewerState;

    const handleClose = () => {
      onClose();
    };
    const userId =
      terminalProductViewerState.applicationStore.identityService.currentUser;
    const [businessJustification, setBusinessJustification] = useState<
      string | undefined
    >();

    const onCreate = (): void => {
      if (businessJustification && userId) {
        flowResult(
          terminalAccessState.createTerminalRequest(
            userId,
            businessJustification,
          ),
        )
          .then(() => {
            handleClose();
          })
          .catch((error) => {
            terminalProductViewerState.applicationStore.alertUnhandledError(
              error,
            );
          });
      }
    };

    const isLoading =
      terminalAccessState.creatingTerminalOrderState.isInProgress;
    const terminalProductTitle = terminalProductViewerState.product.productName;

    return (
      <Dialog
        open={open}
        onClose={() => {
          handleClose();
        }}
        fullWidth={true}
        maxWidth="md"
      >
        <DialogTitle>Terminal Product Request</DialogTitle>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-creator__content">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!isLoading && (
            <>
              <div>
                Submit access request for{' '}
                <span className="marketplace-lakehouse-text__emphasis">
                  {terminalProductTitle}
                </span>{' '}
                Terminal Product
              </div>
              <TextField
                className="marketplace-lakehouse-entitlements__data-contract-creator__business-justification-input"
                required={true}
                name="User"
                label="User"
                variant="outlined"
                fullWidth={true}
                value={userId}
                disabled={true}
              />
              <TextField
                className="marketplace-lakehouse-entitlements__data-contract-creator__business-justification-input"
                required={true}
                name="business-justification"
                label="Business Justification"
                variant="outlined"
                fullWidth={true}
                value={businessJustification}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBusinessJustification(event.target.value)
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCreate} variant="contained">
            Create
          </Button>
          <Button
            onClick={() => {
              handleClose();
            }}
            variant="outlined"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
