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

import { observer } from 'mobx-react-lite';
import type { SnackbarCloseReason } from '@material-ui/core/Snackbar';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import {
  useApplicationStore,
  DEFAULT_NOTIFICATION_HIDE_TIME,
  NOTIFCATION_SEVERITY,
} from '../../stores/ApplicationStore';
import {
  FaTimes,
  FaCheckCircle,
  FaInfoCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaBug,
} from 'react-icons/fa';

export const NotificationSnackbar = observer(() => {
  const applicationStore = useApplicationStore();
  const notification = applicationStore.notification;
  const isOpen = Boolean(notification);
  // TODO: have a better way to truncate message in snackbar
  const message = notification?.message ?? '';
  const severity = notification?.severity ?? NOTIFCATION_SEVERITY.INFO;
  let notificationIcon = (
    <div className="notification__message__content__icon notification__message__content__icon--info">
      <FaInfoCircle />
    </div>
  );
  switch (severity) {
    case NOTIFCATION_SEVERITY.ILEGAL_STATE:
      notificationIcon = (
        <div className="notification__message__content__icon notification__message__content__icon--error">
          <FaBug />
        </div>
      );
      break;
    case NOTIFCATION_SEVERITY.ERROR:
      notificationIcon = (
        <div className="notification__message__content__icon notification__message__content__icon--error">
          <FaTimesCircle />
        </div>
      );
      break;
    case NOTIFCATION_SEVERITY.WARNING:
      notificationIcon = (
        <div className="notification__message__content__icon notification__message__content__icon--warning">
          <FaExclamationTriangle />
        </div>
      );
      break;
    case NOTIFCATION_SEVERITY.SUCCESS:
      notificationIcon = (
        <div className="notification__message__content__icon notification__message__content__icon--success">
          <FaCheckCircle />
        </div>
      );
      break;
    default:
      break;
  }
  const handleClose = (): void => applicationStore.setNotification(undefined);
  const onSnackbarAutoHideOrClickAway = (
    event: React.SyntheticEvent<unknown>,
    reason: SnackbarCloseReason,
  ): void => {
    // NOTE: we only should not allow dismissing the notification on click-away. First of call, this might not be desirable
    // second, this clashes with modal that traps focus, e.g. when we have another modal open and want to show a notification
    // the notification focus is stolen by the modal leading to the snackbar immediately gets clicked-away and closed
    if (reason === 'timeout') {
      handleClose();
    }
  };

  return (
    <Snackbar
      classes={{
        root: 'notification',
        anchorOriginBottomRight: 'notification__position',
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      open={isOpen}
      // setting the auto-hide duration to null will stop it from hiding automatically
      autoHideDuration={
        applicationStore.notification
          ? applicationStore.notification.autoHideDuration ?? null
          : DEFAULT_NOTIFICATION_HIDE_TIME
      }
      onClose={onSnackbarAutoHideOrClickAway}
      // When displaying multiple consecutive Snackbars from a parent rendering a single <Snackbar/>,
      // add the key prop to ensure independent treatment of each message. e.g. <Snackbar key={message}/>,
      // otherwise, the message may update-in-place and features such as autoHideDuration may be canceled.
      key={
        typeof message === 'string' || typeof message === 'number'
          ? message
          : ''
      }
    >
      <SnackbarContent
        classes={{
          root: 'notification__content',
          message: 'notification__message',
          action: 'notification__actions',
        }}
        message={
          <div className="notification__message__content">
            {notificationIcon}
            <div className="notification__message__content__text">
              {message}
            </div>
          </div>
        }
        action={[
          <button
            className="notification__action"
            key="close"
            onClick={handleClose}
            tabIndex={-1}
            title={'Dismiss'}
          >
            <FaTimes />
          </button>,
        ]}
      />
    </Snackbar>
  );
});
