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

import {
  type CardProps as MuiCardProps,
  Card as MuiCard,
  CardContent as MuiCardContent,
} from '@mui/material';
import clsx from 'clsx';

export const BaseCard: React.FC<
  {
    className?: string | undefined;
    cardMedia: React.ReactNode;
    cardName: string;
    cardContent: string;
    isDisable?: boolean;
    isActive?: boolean;
  } & MuiCardProps
> = (props) => {
  const {
    children,
    className,
    cardMedia,
    cardName,
    cardContent,
    isDisable,
    isActive,
    ...otherProps
  } = props;
  return (
    <MuiCard
      className={clsx(
        'mui-card',
        { 'mui-card--disable': isDisable },
        { 'mui-card--active': isActive },
        className,
      )}
      {...otherProps}
    >
      <div className="mui-card__media"> {cardMedia}</div>
      <MuiCardContent>
        <div className="mui-card__header">{cardName}</div>
        <div className="mui-card__content">{cardContent}</div>
      </MuiCardContent>
    </MuiCard>
  );
};
