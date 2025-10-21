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
  CardActions as MuiCardActions,
  Button,
} from '@mui/material';
import { clsx } from '../utils/ComponentUtils.js';

export type MuiCardActionConfig = {
  title: string;
  content: React.ReactNode;
  action: () => void;
};

export const BaseCard: React.FC<
  {
    className?: string | undefined;
    cardMedia?: React.ReactNode;
    cardName: string;
    cardContent: React.ReactNode;
    cardActions?: MuiCardActionConfig[];
    disabled?: boolean;
    isActive?: boolean;
    isStable?: boolean;
  } & MuiCardProps
> = (props) => {
  const {
    children,
    className,
    cardMedia,
    cardName,
    cardContent,
    cardActions,
    disabled: isDisable,
    isActive,
    isStable,
    ...otherProps
  } = props;
  return (
    <MuiCard
      className={clsx(
        'mui-card',
        { 'mui-card--disable': isDisable },
        { 'mui-card--active': isActive },
        { 'mui-card--stable': isStable },
        className,
      )}
      {...otherProps}
    >
      {cardMedia && <div className="mui-card__media"> {cardMedia}</div>}
      <MuiCardContent>
        <div className="mui-card__header">{cardName}</div>
        <div className="mui-card__content">{cardContent}</div>
      </MuiCardContent>
      {cardActions && (
        <MuiCardActions>
          {cardActions.map((cardAction) => (
            <Button
              className="mui-card__card-action"
              key={cardAction.title}
              onClick={cardAction.action}
            >
              <div className="mui-card__card-action__label">
                {cardAction.title}
              </div>
              <div className="mui-card__card-action__content">
                {cardAction.content}
              </div>
            </Button>
          ))}
        </MuiCardActions>
      )}
    </MuiCard>
  );
};
