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

import { Badge } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import type { CartStore } from '../../stores/cart/CartStore.js';

interface CartBadgeProps {
  cartStore: CartStore;
  children: React.ReactNode;
}

export const CartBadge = observer((props: CartBadgeProps) => {
  const { cartStore, children } = props;
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (cartStore.cartSummary.total_items > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [cartStore.cartSummary.total_items]);

  return (
    <Badge
      badgeContent={
        cartStore.cartSummary.total_items > 0
          ? cartStore.cartSummary.total_items
          : null
      }
      color="error"
      sx={{
        '& .MuiBadge-badge': {
          backgroundColor: '#d32f2f',
          color: 'white',
          fontSize: '1.25rem',
          fontWeight: 600,
          height: '20px',
          minWidth: '20px',
          borderRadius: '10px',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          animation: animate ? 'cartBadgePulse 0.6s ease-in-out' : 'none',
        },
        '@keyframes cartBadgePulse': {
          '0%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.3)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
      }}
    >
      {children}
    </Badge>
  );
});
