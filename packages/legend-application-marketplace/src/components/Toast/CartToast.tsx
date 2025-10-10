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

import { Snackbar, Alert } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

class ToastNotificationManager {
  private listeners: ((notification: ToastNotification) => void)[] = [];

  subscribe(listener: (notification: ToastNotification) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notify(message: string, type: ToastNotification['type'] = 'success') {
    const notification: ToastNotification = {
      id: Date.now().toString(),
      message,
      type,
    };
    this.listeners.forEach((listener) => listener(notification));
  }

  success(message: string) {
    this.notify(message, 'success');
  }

  error(message: string) {
    this.notify(message, 'error');
  }

  warning(message: string) {
    this.notify(message, 'warning');
  }

  info(message: string) {
    this.notify(message, 'info');
  }
}

export const toastManager = new ToastNotificationManager();

export const CartToast = observer(() => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((notification) => {
      setNotifications((prev) => [...prev, notification]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id),
        );
      }, 3000);
    });

    return unsubscribe;
  }, []);

  const handleClose = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getSeverityColor = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#4caf50';
    }
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={3000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          sx={{
            top: `${80 + index * 70}px !important`,
            zIndex: 9999,
          }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              backgroundColor: getSeverityColor(notification.type),
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: 500,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              minWidth: '300px',
              '& .MuiAlert-icon': {
                fontSize: '2rem',
              },
              '& .MuiAlert-action': {
                paddingTop: 0,
              },
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
});
