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

import { type JSX, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Popover,
  Typography,
} from '@mui/material';
import { clsx, FilterIcon } from '@finos/legend-art';

interface ColumnFilterButtonProps {
  /** Human-readable column name, used for the button's aria-label and popover title. */
  columnLabel: string;
  /** Distinct values available to filter on for this column. */
  options: string[];
  /** Currently selected values; an empty set means "no filter applied" (show all). */
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * A column-header filter button that opens a multi-select checklist popover,
 * shared by the recommended add-ons list and the order profile / owned
 * terminal detail tables.
 */
export const ColumnFilterButton = (
  props: ColumnFilterButtonProps,
): JSX.Element => {
  const { columnLabel, options, selected, onChange } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isActive = selected.size > 0;

  const toggleOption = (option: string): void => {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(next);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Filter by ${columnLabel}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        className={clsx('column-filter-button', {
          'column-filter-button--active': isActive,
        })}
      >
        <FilterIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        className="column-filter-button__popover"
      >
        <Box className="column-filter-button__popover-content">
          <Typography
            variant="subtitle2"
            className="column-filter-button__popover-title"
          >
            Filter by {columnLabel}
          </Typography>
          {options.length === 0 ? (
            <Typography
              variant="body2"
              className="column-filter-button__popover-empty"
            >
              No values available
            </Typography>
          ) : (
            options.map((option) => (
              <FormControlLabel
                key={option}
                className="column-filter-button__popover-option"
                control={
                  <Checkbox
                    size="small"
                    checked={selected.has(option)}
                    onChange={() => toggleOption(option)}
                  />
                }
                label={option}
              />
            ))
          )}
          {isActive && (
            <Button
              size="small"
              onClick={() => onChange(new Set())}
              className="column-filter-button__popover-clear"
            >
              Clear filter
            </Button>
          )}
        </Box>
      </Popover>
    </>
  );
};
