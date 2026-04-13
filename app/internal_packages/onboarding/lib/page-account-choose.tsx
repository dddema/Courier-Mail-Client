import React from 'react';
import PropTypes from 'prop-types';
import { localized } from 'mailspring-exports';
import { RetinaImg } from 'mailspring-component-kit';
import * as OnboardingActions from './onboarding-actions';
import AccountProviders from './account-providers';

export default class AccountChoosePage extends React.Component {
  static displayName = 'AccountChoosePage';

  static propTypes = {
    account: PropTypes.object,
  };

  _renderProviders() {
    return AccountProviders.map(({ icon, displayName, provider }) => (
      <button
        key={provider}
        type="button"
        className={`provider ${provider}`}
        aria-label={displayName}
        title={displayName}
        onClick={() => OnboardingActions.chooseAccountProvider(provider)}
      >
        <span className="provider-aura" aria-hidden="true" />
        <div className="icon-container">
          <RetinaImg name={icon} mode={RetinaImg.Mode.ContentPreserve} className="icon" />
        </div>
        <span className="provider-name">{displayName}</span>
      </button>
    ));
  }

  render() {
    return (
      <div className="page account-choose">
        <h2 className="account-choose-title">{localized('Connect an email account')}</h2>
        <div className="provider-list">{this._renderProviders()}</div>
      </div>
    );
  }
}
