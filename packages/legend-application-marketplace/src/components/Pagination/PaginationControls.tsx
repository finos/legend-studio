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

import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import {
  Box,
  MenuItem,
  Pagination,
  Select,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';

export const PaginationControls = observer(
  (props: {
    totalItems: number;
    itemsPerPage: number;
    page: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    disabled?: boolean;
  }) => {
    const {
      totalItems,
      itemsPerPage,
      page,
      onPageChange,
      onItemsPerPageChange,
      disabled = false,
    } = props;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handlePageChange = useCallback(
      (_: unknown, newPage: number) => {
        onPageChange(newPage);
      },
      [onPageChange],
    );

    const handleItemsPerPageChange = useCallback(
      (event: SelectChangeEvent<number>) => {
        onItemsPerPageChange(Number(event.target.value));
      },
      [onItemsPerPageChange],
    );

    return (
      <Box className="legend-marketplace-pagination-container">
        <Box className="legend-marketplace-pagination-page-size">
          <Typography variant="body2" sx={{ fontSize: '2rem' }}>
            Items per page:
          </Typography>
          <Select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            size="medium"
            disabled={disabled}
          >
            <MenuItem value={12}>12</MenuItem>
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={36}>36</MenuItem>
            <MenuItem value={48}>48</MenuItem>
          </Select>
        </Box>
        <Box className="legend-marketplace-pagination-info">
          <Typography variant="body2">
            Showing <strong>{(page - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(page * itemsPerPage, totalItems)}</strong> of{' '}
            <strong>{totalItems}</strong> results
          </Typography>
        </Box>

        <Box className="legend-marketplace-pagination-controls">
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton={true}
            showLastButton={true}
            disabled={disabled}
            siblingCount={1}
            boundaryCount={2}
            size="large"
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '1.5rem',
              },
            }}
          />
        </Box>
      </Box>
    );
  },
);
