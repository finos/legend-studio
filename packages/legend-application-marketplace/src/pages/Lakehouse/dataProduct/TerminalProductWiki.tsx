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
import React, { useEffect, useRef } from 'react';
import {
  TERMINAL_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import {
  AnchorLinkIcon,
  PencilEditIcon,
  MarkdownTextViewer,
  UserIcon,
  KeyIcon,
  QuestionCircleIcon,
  ReportIcon,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { DataproducteWikiPlaceholder } from './DataProductWiki.js';
import type { TerminalProductViewerState } from '../../../stores/lakehouse/TerminalProductViewerState.js';
import { TERMINAL_ACCESS } from './TerminalDataAccess.js';
import { Divider } from '@mui/material';
import type { IconType } from 'react-icons';
import { FaGithub } from 'react-icons/fa';
import { TiWorldOutline } from 'react-icons/ti';
import { DataProducteDataAccess } from './DataProductDataAccess.js';

export const TerminalProductWikiPlaceHolder = observer(
  (props: {
    terminalProductViewerState: TerminalProductViewerState;
    section: TERMINAL_PRODUCT_VIEWER_SECTION;
  }) => {
    const { terminalProductViewerState, section } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(section);
    useEffect(() => {
      if (sectionRef.current) {
        terminalProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        terminalProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [terminalProductViewerState, anchor]);
    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            {prettyCONSTName(section)}
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() =>
                terminalProductViewerState.changeZone(anchor, true)
              }
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          <DataproducteWikiPlaceholder message="No wiki content available." />
        </div>
      </div>
    );
  },
);

export const TerminalProductDescription = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(
      TERMINAL_PRODUCT_VIEWER_SECTION.DESCRIPTION,
    );

    useEffect(() => {
      if (sectionRef.current) {
        terminalProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        terminalProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [terminalProductViewerState, anchor]);

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__terminal__description-div">
          {terminalProductViewerState.product.description !== undefined ? (
            <div className="data-space__viewer__description">
              <div className="data-space__viewer__description__content">
                <MarkdownTextViewer
                  className="data-space__viewer__markdown-text-viewer"
                  value={{
                    value: terminalProductViewerState.product.description,
                  }}
                  components={{
                    h1: 'h2',
                    h2: 'h3',
                    h3: 'h4',
                  }}
                />
              </div>
            </div>
          ) : (
            <DataproducteWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);

export const TerminalProductPrice = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;
    const [isAnnual, setIsAnnual] = React.useState(true);

    const getAvailablePrice = () => {
      if (terminal.price) {
        return terminal.price;
      }
      if (terminal.tieredPrice) {
        return terminal.tieredPrice;
      }
      if (terminal.totalFirmPrice) {
        return terminal.totalFirmPrice;
      }
      return undefined;
    };
    const availablePrice = getAvailablePrice();

    if (!availablePrice) {
      return (
        <DataproducteWikiPlaceholder message="No price information available." />
      );
    }

    const getDisplayPrice = () => {
      const price = Number(availablePrice);
      if (isAnnual) {
        return price.toFixed(2);
      }
      return (price / 12).toFixed(2);
    };

    const handlePricingToggle = () => {
      setIsAnnual((prev) => !prev);
    };

    return (
      <div
        className="data-space__viewer__wiki__section__pricing"
        onClick={handlePricingToggle}
      >
        ${getDisplayPrice()} {isAnnual ? 'ANNUALLY' : 'MONTHLY'} PER LICENSE
      </div>
    );
  },
);

const getButtonConfig = (accessStatus: TERMINAL_ACCESS) => {
  const baseClass = 'data-space__viewer__content__access-button';

  switch (accessStatus) {
    case TERMINAL_ACCESS.REQUEST:
      return {
        text: 'REQUEST ACCESS',
        className: baseClass,
        disabled: false,
      };
    case TERMINAL_ACCESS.PENDING:
      return {
        text: 'PENDING',
        className: `${baseClass} ${baseClass}--pending`,
        disabled: true,
      };
    case TERMINAL_ACCESS.ENTITLED:
      return {
        text: 'ENTITLED',
        className: `${baseClass} ${baseClass}--entitled`,
        disabled: false,
        dropdownText: 'Request Access For Others',
      };
    default:
      return {
        text: 'REQUEST ACCESS',
        className: baseClass,
        disabled: false,
      };
  }
};

const EntitlementButton = observer(() => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const buttonConfig = getButtonConfig(TERMINAL_ACCESS.ENTITLED);
  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleRequestForOthers = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div className="data-space__viewer__content__entitlement-button">
      <button
        className="data-space__viewer__content__access-button data-space__viewer__content__access-button--entitled" //clean this
        onClick={handleDropdownToggle}
      >
        {buttonConfig.text}
        <span>{isDropdownOpen ? '▲' : '▼'}</span>
      </button>

      {isDropdownOpen && (
        <button
          className={`${buttonConfig.className}--dropdown`}
          onClick={handleRequestForOthers}
        >
          {buttonConfig.dropdownText}
        </button>
      )}
    </div>
  );
});

export const RequestAccessButton = observer(
  (props: {
    children?: React.ReactNode;
    onAccessRequested?: (callback: () => void) => void;
    onOpenModal?: () => void;
    onModalSubmitted?: () => void;
    terminalProductViewerState: TerminalProductViewerState;
    buttonRef?:
      | React.RefObject<{ handleModalSubmitted: () => void } | null>
      | undefined;
  }) => {
    const { onAccessRequested, onOpenModal } = props;
    const [accessStatus, setAccessStatus] = React.useState(
      TERMINAL_ACCESS.REQUEST,
    );
    const [disabled, setDisabled] = React.useState(false);
    const buttonConfig = getButtonConfig(accessStatus);

    const handleClick = () => {
      if (accessStatus === TERMINAL_ACCESS.REQUEST) {
        if (onOpenModal) {
          onOpenModal();
        }
      } else if (accessStatus === TERMINAL_ACCESS.PENDING) {
        setAccessStatus(TERMINAL_ACCESS.ENTITLED);
      }
    };

    const handleModalSubmitted = () => {
      setAccessStatus(TERMINAL_ACCESS.PENDING);
      setDisabled(true);

      if (onAccessRequested) {
        onAccessRequested(() => {
          setAccessStatus(TERMINAL_ACCESS.ENTITLED);
          setDisabled(false);
        });
      }
    };

    React.useImperativeHandle(props.buttonRef, () => ({
      handleModalSubmitted,
    }));

    return (
      <>
        {accessStatus === TERMINAL_ACCESS.ENTITLED ? (
          <EntitlementButton />
        ) : (
          <button
            className={buttonConfig.className}
            onClick={handleClick}
            disabled={disabled}
          >
            {buttonConfig.text}
          </button>
        )}
      </>
    );
  },
);

interface TerminalAccessSectionProps {
  userImageUrl: string;
  userImageAlt?: string;
  onButtonClick?: () => void;
  buttonText?: string;
  className?: string;
}

export const TerminalAccessSection: React.FC<TerminalAccessSectionProps> = ({
  userImageUrl,
  userImageAlt = 'User',
  onButtonClick,
  buttonText = 'Change User',
}) => {
  return (
    <div className="data-space__viewer__content__access-section">
      <h1 className="data-space__viewer__content__access-section__header">
        Access
      </h1>
      <Divider className="data-space__divider" />

      <div className="data-space__viewer__content__access-section__container">
        <span className="data-space__viewer__content__access-section__span">
          Showing access for
        </span>

        <div className="data-space__viewer__content__access-section__image-container">
          <img
            src={
              'https://i.pinimg.com/736x/16/ab/50/16ab501640405bb0503463b634a72cae.jpg'
            }
            alt={userImageAlt}
            className="data-space__viewer__content__access-section__image"
          />
        </div>

        <span className="data-space__viewer__content__access-section__span">
          Last, First [Engineering]
        </span>

        <PencilEditIcon
          className="data-space__viewer__content__access-section__icon"
          onClick={onButtonClick}
        />
      </div>
    </div>
  );
};

const TerminalProductTable = observer(
  (props: {
    terminalProductViewerState: TerminalProductViewerState;
    onOpenModal?: () => void;
    buttonRef?: React.RefObject<{ handleModalSubmitted: () => void } | null>;
  }) => {
    const { terminalProductViewerState, onOpenModal, buttonRef } = props;
    const terminal = terminalProductViewerState.product;

    const getProductName = () => {
      return (
        terminal.productName ?? terminal.applicationName ?? 'Unknown Product'
      );
    };

    const getAnnualPrice = () => {
      const prices = [
        Number(terminal.price),
        Number(terminal.tieredPrice),
        Number(terminal.totalFirmPrice),
      ];
      const validPrice = prices.find((price) => price > 0);
      return Number(validPrice) || 0;
    };

    const formatPrice = (price: number) => {
      return `$${price.toFixed(2)}/year`;
    };

    return (
      <div className="data-space__viewer__content__">
        <table className="data-space__viewer__content__table">
          <thead>
            <tr className="data-space__viewer__content__table--row">
              <th className="data-space__viewer__content__table--header">
                Entity
              </th>
              <th className="data-space__viewer__content__table--header">
                Cost
              </th>
              <th className="data-space__viewer__content__table--header">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="data-space__viewer__content__table--row">
              <td className="data-space__viewer__content__table--cell data-space__viewer__content__table--cell--entity">
                {getProductName()}
              </td>
              <td className="data-space__viewer__content__table--cell data-space__viewer__content__table--cell--cost">
                {formatPrice(getAnnualPrice())}
              </td>
              <td className="data-space__viewer__content__table--cell data-space__viewer__content__table--cell--status">
                <RequestAccessButton
                  terminalProductViewerState={terminalProductViewerState}
                  onOpenModal={onOpenModal ?? (() => {})}
                  buttonRef={buttonRef}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  },
);

interface SupportLinkItem {
  id: string;
  name: string;
  url: string;
  icon: IconType;
}

interface SupportLinkProps {
  links: SupportLinkItem[];
  gridColumns?: number;
  className?: string;
}

const exampleLinks: SupportLinkItem[] = [
  {
    id: '1',
    name: 'GitHub',
    url: 'https://github.com',
    icon: FaGithub,
  },
  {
    id: '2',
    name: 'Keystone',
    url: 'https://keystone.site.gs.com/default/app',
    icon: KeyIcon,
  },
  {
    id: '3',
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: QuestionCircleIcon,
  },
  {
    id: '4',
    name: 'Supporting Documentation',
    url: 'https://github.com',
    icon: ReportIcon,
  },
  {
    id: '5',
    name: 'Bloomberg Website',
    url: 'https://github.com',
    icon: TiWorldOutline,
  },
];

export const TerminalSupportSection: React.FC<SupportLinkProps> = ({
  links,
}) => {
  return (
    <div className="data-space__viewer__content__support-section__container">
      <h1 className="data-space__viewer__content__support-section__heading">
        Support
      </h1>
      <Divider className="data-space__divider" />
      <div className="data-space__viewer__content__support-section__container__div">
        {links.map((link) => (
          <div
            key={link.id}
            className="data-space__viewer__content__support-section__link--item"
          >
            <div className="data-space__viewer__content__support-section__link--circle">
              <link.icon size={20} color="#FFFFFF" />
            </div>
            <a
              href={link.url}
              className="data-space__viewer__content__support-section__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.name}
              <span className="data-space__viewer__content__support-section__link">
                {' '}
                ↗
              </span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TerminalAccessModal = observer(
  (props: {
    terminalProductViewerState: TerminalProductViewerState;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { user: string; justification: string }) => void;
  }) => {
    const { terminalProductViewerState, isOpen, onClose, onSubmit } = props;
    const [user, setUser] = React.useState('');
    const [justification, setJustification] = React.useState('');
    const [errors, setErrors] = React.useState<{
      user?: string;
      justification?: string;
    }>({});

    const errorTimeouts = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

    const terminal = terminalProductViewerState.product;
    const productName =
      terminal.productName ?? terminal.applicationName ?? 'Unknown Product';

    const clearError = (field: 'user' | 'justification') => {
      setErrors((prev) => {
        const { [field]: removed, ...rest } = prev;
        return rest;
      });

      if (errorTimeouts.current[field]) {
        clearTimeout(errorTimeouts.current[field]);
        delete errorTimeouts.current[field];
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      let hasErrors = false;

      const setErrorWithTimeout = (
        field: 'user' | 'justification',
        message: string,
      ) => {
        setErrors((prev) => ({ ...prev, [field]: message }));
        if (errorTimeouts.current[field]) {
          clearTimeout(errorTimeouts.current[field]);
        }
        errorTimeouts.current[field] = setTimeout(() => {
          clearError(field);
        }, 2000);
      };

      if (!user.trim()) {
        setErrorWithTimeout('user', 'User field is required');
        hasErrors = true;
      }
      if (!justification.trim()) {
        setErrorWithTimeout('justification', 'Justification field is required');
      }
      if (hasErrors) {
        return;
      }
      setErrors({});
      onSubmit({ user, justification });
      setUser('');
      setJustification('');
    };

    const handleCancel = () => {
      setUser('');
      setJustification('');
      setErrors({});
      onClose();
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUser(e.target.value);
      if (errors.user && e.target.value.trim()) {
        clearError('user');
      }
    };

    const handleJustificationChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setJustification(e.target.value);
      if (errors.justification && e.target.value.trim()) {
        clearError('justification');
      }
    };

    React.useEffect(() => {
      const currentTimeouts = errorTimeouts.current;
      return () => {
        Object.values(currentTimeouts).forEach((timeout) => {
          clearTimeout(timeout);
        });
      };
    }, []);

    if (!isOpen) {
      return null;
    }

    return (
      <div className="data-space__viewer__content__modal">
        <div
          className="data-space__viewer__content__modal__overlay"
          onClick={handleCancel}
        />
        <div className="data-space__viewer__content__modal__container">
          <div className="data-space__viewer__content__modal__header">
            <h2 className="data-space__viewer__content__modal__header__title">
              Access Request
            </h2>
          </div>

          <div className="data-space__viewer__content__modal__description">
            <p>
              Submit access request for{' '}
              <span className="data-space__viewer__content__modal__description__terminal-name">
                {productName}
              </span>
            </p>
          </div>

          <div className="data-space__viewer__content__modal__user-button-section">
            <button
              type="button"
              className="data-space__viewer__content__modal__user-button"
            >
              <UserIcon />

              <span className="data-space__viewer__content__modal__user-button__text">
                User
              </span>
            </button>
          </div>

          <div className="data-space__viewer__content__modal__form">
            <form onSubmit={handleSubmit}>
              <div className="data-space__viewer__content__modal__form__field">
                <label
                  htmlFor="user"
                  className="data-space__viewer__content__modal__form__field--label"
                >
                  User
                </label>
                <input
                  id="user"
                  type="text"
                  className="data-space__viewer__content__modal__form__input"
                  value={user}
                  onChange={handleUserChange}
                  placeholder="Enter username"
                />
                {errors.user && (
                  <span className="data-space__viewer__content__modal__form__error">
                    {errors.user}
                  </span>
                )}
              </div>

              <div className="data-space__viewer__content__modal__form__field">
                <label
                  htmlFor="justification"
                  className="data-space__viewer__modal__form__field--label"
                >
                  Business Justification
                </label>
                <textarea
                  id="justification"
                  className="data-space__viewer__content__modal__form__textarea"
                  value={justification}
                  onChange={handleJustificationChange}
                  placeholder="Enter business justification"
                  rows={1}
                />
                {errors.justification && (
                  <span className="data-space__viewer__content__modal__form__error">
                    {errors.justification}
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className="data-space__viewer__content__modal__actions">
            <button
              type="button"
              className="data-space__viewer__content__modal__button data-space__viewer__content__modal__actions--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="data-space__viewer__content__modal__button data-space__viewer__content__modal__actions--submit"
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export const TerminalProductWiki = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const buttonRef = React.useRef<{ handleModalSubmitted: () => void } | null>(
      null,
    );

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    const handleModalSubmit = (data: {
      user: string;
      justification: string;
    }) => {
      setIsModalOpen(false);

      if (buttonRef.current) {
        buttonRef.current.handleModalSubmitted();
      }
    };

    useEffect(() => {
      if (
        terminalProductViewerState.layoutState.wikiPageNavigationCommand &&
        terminalProductViewerState.layoutState.isWikiPageFullyRendered
      ) {
        terminalProductViewerState.layoutState.navigateWikiPageAnchor();
      }
    }, [
      terminalProductViewerState,
      terminalProductViewerState.layoutState.wikiPageNavigationCommand,
      terminalProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    useEffect(() => {
      if (terminalProductViewerState.layoutState.isWikiPageFullyRendered) {
        terminalProductViewerState.layoutState.registerWikiPageScrollObserver();
      }
      return () =>
        terminalProductViewerState.layoutState.unregisterWikiPageScrollObserver();
    }, [
      terminalProductViewerState,
      terminalProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <div
          style={{
            display: isModalOpen ? 'none' : 'block',
            paddingBottom: '50px',
          }}
        >
          <Divider className="data-space__divider" />
          <TerminalProductPrice
            terminalProductViewerState={terminalProductViewerState}
          />

          <TerminalProductDescription
            terminalProductViewerState={terminalProductViewerState}
          />
        </div>

        <div style={{ display: isModalOpen ? 'none' : 'block' }}>
          <TerminalAccessSection
            userImageUrl="https://example.com/user-avatar.jpg"
            userImageAlt="Current User"
            buttonText="Change User"
          />

          <TerminalProductTable
            terminalProductViewerState={terminalProductViewerState}
            onOpenModal={handleOpenModal}
            buttonRef={buttonRef}
          />
        </div>

        {/* Modal */}
        <TerminalAccessModal
          terminalProductViewerState={terminalProductViewerState}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
        />

        <TerminalSupportSection links={exampleLinks} gridColumns={3} />
      </div>
    );
  },
);
