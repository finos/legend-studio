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

import type { V1_AccessPointGroup } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useState, type ChangeEvent } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { useAuth } from 'react-oidc-context';
import { flowResult } from 'mobx';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

export const DataContractCreator = observer(
  (props: {
    onClose: () => void;
    accessPointGroup: V1_AccessPointGroup;
    viewerState: DataProductViewerState;
  }) => {
    const { onClose, viewerState, accessPointGroup } = props;
    const auth = useAuth();
    const [description, setDescription] = useState<string | undefined>(
      undefined,
    );

    const onCreate = (): void => {
      if (description) {
        flowResult(
          props.viewerState.create(
            description,
            accessPointGroup,
            auth.user?.access_token,
          ),
        ).catch(viewerState.applicationStore.alertUnhandledError);
      }
    };

    return (
      <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogTitle>Data Contract Request</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Submit access request for{' '}
            <span className="marketplace-lakehouse-text__emphasis">
              {accessPointGroup.id}
            </span>{' '}
            Access Point Group in{' '}
            <span className="marketplace-lakehouse-text__emphasis">
              {viewerState.product.title}
            </span>{' '}
            Data Product
          </Typography>
          <TextField
            required={true}
            name="description"
            label="Description"
            variant="outlined"
            margin="dense"
            fullWidth={true}
            value={description}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setDescription(event.target.value);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCreate} variant="contained">
            Create
          </Button>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
