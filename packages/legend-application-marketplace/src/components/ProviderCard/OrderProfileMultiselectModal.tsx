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

import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
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

type TraderProfileItemWithOptionalMultiselect = TraderProfileItem & {
  multiselect?: boolean;
};

const getItemMultiselect = (item: TraderProfileItem): boolean | undefined =>
  (item as TraderProfileItemWithOptionalMultiselect).multiselect;

export const OrderProfileMultiselectModal = observer(
  (props: {
    profile: TraderProfile;
    open: boolean;
    onClose: () => void;
    onConfirm: (selectedItems: TraderProfileItem[]) => void;
  }): JSX.Element => {
    const { profile, open, onClose, onConfirm } = props;
    const sanitizeModelKey = (key: string): string =>
      key
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase();
    const isSelectableCandidate = (item: TraderProfileItem): boolean =>
      item.isTerminal && getItemMultiselect(item) === true;

    const [selectedByModel, setSelectedByModel] = useState<
      Record<string, number>
    >({});

    const groupedItems = useMemo(() => {
      const availableItems = profile.items.filter((item) => !item.isOwned);
      const groupedMap = new Map<string, TraderProfileItem[]>();
      for (const item of availableItems) {
        const modelKey = item.model ?? OrderProfileLabel.UNSPECIFIED_MODEL;
        const existingItems = groupedMap.get(modelKey);
        if (existingItems) {
          existingItems.push(item);
        } else {
          groupedMap.set(modelKey, [item]);
        }
      }

      return Array.from(groupedMap.entries()).map(([modelKey, items]) => {
        const selectableItems = items.filter(isSelectableCandidate);
        const isSelectable = selectableItems.length > 1;
        const selectableIds = new Set(selectableItems.map((item) => item.id));

        return {
          modelKey,
          items,
          selectableItems,
          bundledItems: isSelectable
            ? items.filter((item) => !selectableIds.has(item.id))
            : items,
          isSelectable,
        };
      });
    }, [profile.items]);

    const selectableGroups = groupedItems.filter((group) => group.isSelectable);

    useEffect(() => {
      if (open) {
        setSelectedByModel({});
      }
    }, [open, profile.id]);

    const allSelectableGroupsChosen = selectableGroups.every(
      (group) => selectedByModel[group.modelKey] !== undefined,
    );

    const handleModelSelection = useCallback((modelKey: string, id: number) => {
      setSelectedByModel((prev) => ({ ...prev, [modelKey]: id }));
    }, []);

    const handleConfirm = useCallback((): void => {
      const selectedItems: TraderProfileItem[] = [];
      for (const group of groupedItems) {
        if (group.isSelectable) {
          const selectedId = selectedByModel[group.modelKey];
          if (selectedId !== undefined) {
            const selectedItem = group.selectableItems.find(
              (item) => item.id === selectedId,
            );
            if (selectedItem) {
              selectedItems.push(selectedItem);
              selectedItems.push(...group.bundledItems);
            }
          }
        } else {
          selectedItems.push(...group.items);
        }
      }
      onConfirm(selectedItems);
    }, [groupedItems, selectedByModel, onConfirm]);

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
            Choose your preferred vendor profile for each model in{' '}
            <strong>{profile.productName}</strong>.{' '}
            {OrderProfileLabel.SELECT_TERMINAL_DESCRIPTION}
          </Typography>
          <Box className="order-profile-multiselect-modal__sections">
            {groupedItems.map((group) => (
              <Box
                key={group.modelKey}
                className="order-profile-multiselect-modal__section"
              >
                <Typography
                  variant="h6"
                  className="order-profile-multiselect-modal__section-title"
                >
                  {group.modelKey}
                </Typography>
                {group.isSelectable && (
                  <Typography
                    variant="body2"
                    className="order-profile-multiselect-modal__section-subtitle"
                  >
                    Select one preferred vendor profile.
                  </Typography>
                )}

                {group.isSelectable ? (
                  <List dense={false}>
                    {group.selectableItems.map((item) => {
                      const optionId = `terminal-item-${sanitizeModelKey(group.modelKey)}-${item.id}`;
                      return (
                        <ListItemButton
                          key={item.id}
                          onClick={() =>
                            handleModelSelection(group.modelKey, item.id)
                          }
                          selected={selectedByModel[group.modelKey] === item.id}
                          className={`order-profile-multiselect-modal__list-item ${selectedByModel[group.modelKey] === item.id ? 'order-profile-multiselect-modal__list-item--selected' : ''}`}
                        >
                          <Radio
                            checked={
                              selectedByModel[group.modelKey] === item.id
                            }
                            onChange={() =>
                              handleModelSelection(group.modelKey, item.id)
                            }
                            size="small"
                            className="order-profile-multiselect-modal__radio"
                            slotProps={{
                              input: {
                                'aria-labelledby': optionId,
                              },
                            }}
                          />
                          <ListItemText
                            id={optionId}
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
                              <Typography
                                variant="caption"
                                className="order-profile-multiselect-modal__item-model"
                              >
                                {item.providerName}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                ) : undefined}

                {group.bundledItems.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      className="order-profile-multiselect-modal__bundled-title"
                    >
                      Included with this model
                    </Typography>
                    <List dense={true}>
                      {group.bundledItems.map((item) => (
                        <ListItemText
                          key={`bundled-${group.modelKey}-${item.id}`}
                          className="order-profile-multiselect-modal__included-item"
                          primary={
                            <Box className="order-profile-multiselect-modal__item-primary">
                              <Typography
                                variant="body2"
                                className="order-profile-multiselect-modal__item-name"
                              >
                                {item.productName}
                              </Typography>
                              <Typography
                                variant="caption"
                                className="order-profile-multiselect-modal__item-price"
                              >
                                {formatItemPrice(item.price)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              className="order-profile-multiselect-modal__item-model"
                            >
                              {item.providerName}
                            </Typography>
                          }
                        />
                      ))}
                    </List>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            {OrderProfileLabel.CANCEL}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!allSelectableGroupsChosen}
          >
            {OrderProfileLabel.ADD_TO_CART}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
