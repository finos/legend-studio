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

import { Fragment } from 'react';
import { Grid2, Typography } from '@mui/material';
import {
  GridTiemStatus,
  type GridItemDetail,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { clsx } from '@finos/legend-art';

export const GridItemsViewer = (props: {
  details: GridItemDetail[];
  title: string;
}) => {
  const gridDetails = props.details;
  const title = props.title;
  return (
    <>
      <Typography
        className="entitlements-grid-viewer__header"
        variant="h6"
        sx={{ marginBottom: '0.5rem' }}
      >
        {title}
      </Typography>
      <Grid2
        container={true}
        spacing={0}
        sx={{
          '--Grid-borderWidth': '1px',
          borderTop: 'var(--Grid-borderWidth) solid',
          borderLeft: 'var(--Grid-borderWidth) solid',
          borderColor: 'divider',
          '& > div': {
            borderRight: 'var(--Grid-borderWidth) solid',
            borderBottom: 'var(--Grid-borderWidth) solid',
            borderColor: 'divider',
          },
        }}
      >
        {gridDetails.map((gridItem, index) => (
          <Fragment key={gridItem.name}>
            <Grid2
              container={false}
              size={4}
              sx={{
                alignContent: 'center',
                backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
              }}
            >
              <Typography
                variant="button"
                fontWeight={'bold'}
                sx={{ fontSize: '14px', padding: '6px' }}
              >
                {gridItem.name}
              </Typography>
            </Grid2>
            <Grid2
              container={false}
              size={8}
              sx={{
                alignContent: 'center',
                backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontSize: '14px', padding: '6px' }}
                className={clsx({
                  'entitlements-grid-viewer__item-clickable-text': Boolean(
                    gridItem.onClick,
                  ),
                  'entitlements-grid-viewer__status--success':
                    gridItem.status === GridTiemStatus.SUCCESS,
                  'entitlements-grid-viewer__status--error':
                    gridItem.status === GridTiemStatus.ERROR,
                  'entitlements-grid-viewer__status--in-progress':
                    gridItem.status === GridTiemStatus.INFO,
                })}
                onClick={() => gridItem.onClick?.()}
              >
                {gridItem.value}
              </Typography>
            </Grid2>
          </Fragment>
        ))}
      </Grid2>
    </>
  );
};
