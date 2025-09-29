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
import { useState } from 'react';
import {
  CloseIcon,
  ErrorWarnIcon,
  RefreshIcon,
  SendIcon,
  SimpleCalendarIcon,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';

interface DemoFormData {
  name: string;
  division: string;
  reason: string;
}

export const DemoModal = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const showDemoForm = legendMarketplaceBaseStore.showDemoModal;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<DemoFormData>>({});
  const [formData, setFormData] = useState<DemoFormData>({
    name: '',
    division: '',
    reason: '',
  });

  const closeDemoForm = () => {
    legendMarketplaceBaseStore.setDemoModal(false);
    setFormData({ name: '', division: '', reason: '' });
    setFormErrors({});
    setSubmitError(null);
  };

  const handleInputChange = (field: keyof DemoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear submit error when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<DemoFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.division.trim()) {
      errors.division = 'Division/Team name is required';
    }

    if (!formData.reason.trim()) {
      errors.reason = 'Please provide a reason/use case';
    } else if (formData.reason.trim().length < 10) {
      errors.reason = 'Please provide more details (minimum 10 characters)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitDemo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    legendMarketplaceBaseStore.applicationStore.telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.SCHEDULE_DEMO,
      {
        name: formData.name,
        division: formData.division,
      },
    );
  };

  if (!showDemoForm) {
    return null;
  }

  return (
    <div className="demo-form-overlay">
      <div className="demo-form-modal">
        <button className="close-btn" onClick={closeDemoForm}>
          <CloseIcon className="demo-form-modal__close" />
        </button>

        <div className="form-header">
          <div className="form-icon">
            <SimpleCalendarIcon className="demo-form-modal__icon" />
          </div>
          <h3 className="form-title">Schedule a Demo</h3>
          <p className="form-subtitle">
            Get a personalized demonstration of our vendor data management
            platform
          </p>
        </div>

        <form onSubmit={handleSubmitDemo} className="demo-form">
          {/* Show API error if exists */}
          {submitError && (
            <div className="api-error-message">
              <ErrorWarnIcon />
              <span>{submitError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            {formErrors.name && (
              <span className="error-message">{formErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="division" className="form-label">
              Division / Team Name *
            </label>
            <input
              type="text"
              id="division"
              className={`form-input ${formErrors.division ? 'error' : ''}`}
              placeholder="e.g., Investment Banking, Risk Management, Trading"
              value={formData.division}
              onChange={(e) => handleInputChange('division', e.target.value)}
            />
            {formErrors.division && (
              <span className="error-message">{formErrors.division}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reason" className="form-label">
              Reason / Use Case *
            </label>
            <textarea
              id="reason"
              className={`form-textarea ${formErrors.reason ? 'error' : ''}`}
              placeholder="Tell us about your specific use case, what challenges you're facing with vendor data management, and what you'd like to see in the demo..."
              rows={4}
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
            />
            {formErrors.reason && (
              <span className="error-message">{formErrors.reason}</span>
            )}
            <div className="character-count">
              {formData.reason.length} characters
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={closeDemoForm}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshIcon />
                  Submitting...
                </>
              ) : (
                <>
                  <SendIcon />
                  Schedule Demo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
