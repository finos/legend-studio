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

import { type JSX, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  Typography,
} from '@mui/material';
import type {
  TraderProfile,
  TraderProfileItem,
} from '@finos/legend-server-marketplace';
import { observer } from 'mobx-react-lite';
import { formatItemPrice, OrderProfileLabel } from './orderProfileUtils.js';

export const OrderProfileMultiselectModal = observer(
  (props: {
    profile: TraderProfile;
    open: boolean;
    onClose: () => void;
    onConfirm: (selectedTerminals: TraderProfileItem[]) => void;
  }): JSX.Element => {
    const { profile, open, onClose, onConfirm } = props;
    const terminalItems = profile.items.filter(
      (item) => item.isTerminal && !item.isOwned,
    );
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleConfirm = useCallback((): void => {
      const selectedItem = terminalItems.find((item) => item.id === selectedId);
      onConfirm(selectedItem ? [selectedItem] : []);
    }, [terminalItems, selectedId, onConfirm]);

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-multiselect-modal"
        aria-labelledby="order-profile-multiselect-title"
      >
        <DialogTitle id="order-profile-multiselect-title">
          {OrderProfileLabel.SELECT_TERMINAL_TITLE}
        </DialogTitle>
        <DialogContent dividers={true}>
          <Typography
            variant="body2"
            className="order-profile-multiselect-modal__description"
          >
            Choose one terminal to include from{' '}
            <strong>{profile.productName}</strong>.{' '}
            {OrderProfileLabel.SELECT_TERMINAL_DESCRIPTION}
          </Typography>
          <List dense={false}>
            {terminalItems.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                selected={selectedId === item.id}
                className={`order-profile-multiselect-modal__list-item${selectedId === item.id ? 'order-profile-multiselect-modal__list-item--selected' : ''}`}
              >
                <Radio
                  checked={selectedId === item.id}
                  onChange={() => setSelectedId(item.id)}
                  size="small"
                  className="order-profile-multiselect-modal__radio"
                  inputProps={{ 'aria-labelledby': `terminal-item-${item.id}` }}
                />
                <ListItemText
                  id={`terminal-item-${item.id}`}
                  disableTypography={true}
                  primary={
                    <Box className="order-profile-multiselect-modal__item-primary">
                      <Typography
                        variant="body1"
                        className="order-profile-multiselect-modal__item-name"
                      >
                        {item.productName}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="order-profile-multiselect-modal__item-price"
                      >
                        {formatItemPrice(item.price)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    item.model !== null && item.model !== undefined ? (
                      <Typography
                        variant="caption"
                        className="order-profile-multiselect-modal__item-model"
                      >
                        {OrderProfileLabel.MODEL_PREFIX}
                        {item.model}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            {OrderProfileLabel.CANCEL}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={selectedId === null}
          >
            {OrderProfileLabel.ADD_TO_CART}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
