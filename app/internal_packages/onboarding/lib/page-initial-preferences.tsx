import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import fs from 'fs';
import { RetinaImg, Flexbox, ConfigPropContainer } from 'mailspring-component-kit';
import { localized, AccountStore, Account } from 'mailspring-exports';
import * as OnboardingActions from './onboarding-actions';

// NOTE: Temporarily copied from preferences module
class AppearanceModeOption extends React.Component<{
  mode: string;
  active: boolean;
  onClick: (e: React.MouseEvent<any>) => void;
}> {
  static propTypes = {
    mode: PropTypes.string.isRequired,
    active: PropTypes.bool,
    onClick: PropTypes.func,
  };

  render() {
    let classname = 'appearance-mode';
    if (this.props.active) {
      classname += ' active';
    }

    const label = {
      list: localized('Reading Pane Off'),
      split: localized('Reading Pane On'),
    }[this.props.mode];

    return (
      <div className={classname} onClick={this.props.onClick}>
        <RetinaImg
          name={`appearance-mode-${this.props.mode}.png`}
          mode={RetinaImg.Mode.ContentIsMask}
        />
        <div>{label}</div>
      </div>
    );
  }
}

class InitialPreferencesOptions extends React.Component<
  { account: Account; config?: any },
  { templates: any[] }
> {
  static propTypes = { config: PropTypes.object };

  constructor(props: { account: Account; config?: any }) {
    super(props);
    this.state = { templates: [] };
    this._loadTemplates();
  }

  _loadTemplates = () => {
    const templatesDir = path.join(AppEnv.getLoadSettings().resourcePath, 'keymaps', 'templates');
    fs.readdir(templatesDir, (err, files) => {
      if (!files || !(files instanceof Array)) {
        return;
      }
      let templates = files.filter(
        filename => path.extname(filename) === '.cson' || path.extname(filename) === '.json'
      );
      templates = templates.map(filename => path.parse(filename).name);
      this.setState({ templates });
      this._setConfigDefaultsForAccount(templates);
    });
  };

  _setConfigDefaultsForAccount = (templates: string[]) => {
    if (!this.props.account) {
      return;
    }

    const templateWithBasename = (name: string) => templates.find(t => t.indexOf(name) === 0);

    if (this.props.account.provider === 'gmail') {
      this.props.config.set('core.workspace.mode', 'list');
      this.props.config.set('core.keymapTemplate', templateWithBasename('Gmail'));
    } else if (
      this.props.account.provider === 'eas' ||
      this.props.account.provider === 'office365' ||
      this.props.account.provider === 'outlook'
    ) {
      this.props.config.set('core.workspace.mode', 'split');
      this.props.config.set('core.keymapTemplate', templateWithBasename('Outlook'));
    } else {
      this.props.config.set('core.workspace.mode', 'split');
      if (process.platform === 'darwin') {
        this.props.config.set('core.keymapTemplate', templateWithBasename('Apple Mail'));
      } else {
        this.props.config.set('core.keymapTemplate', templateWithBasename('Outlook'));
      }
    }
  };

  render() {
    if (!this.props.config) {
      return false;
    }

    return (
      <div className="initial-preferences-content">
        <div className="initial-preferences-column">
          <p>
            {localized('Do you prefer a single panel layout (like Gmail) or a two panel layout?')}
          </p>
          <Flexbox direction="row" className="appearance-mode-row">
            {['list', 'split'].map(mode => (
              <AppearanceModeOption
                mode={mode}
                key={mode}
                active={this.props.config.get('core.workspace.mode') === mode}
                onClick={() => this.props.config.set('core.workspace.mode', mode)}
              />
            ))}
          </Flexbox>
        </div>
        <div key="divider" className="initial-preferences-divider" />
        <div className="initial-preferences-column">
          <p>
            {localized(
              `We've picked a set of keyboard shortcuts based on your email account and platform. You can also pick another set:`
            )}
          </p>
          <select
            className="initial-preferences-select"
            value={this.props.config.get('core.keymapTemplate')}
            onChange={event => this.props.config.set('core.keymapTemplate', event.target.value)}
          >
            {this.state.templates.map(template => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}

class InitialPreferencesPage extends React.Component<
  Record<string, unknown>,
  { account: Account }
> {
  static displayName = 'InitialPreferencesPage';

  _unlisten?: () => void;

  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = { account: AccountStore.accounts()[0] };
  }

  componentDidMount() {
    this._unlisten = AccountStore.listen(this._onAccountStoreChange);
  }

  componentWillUnmount() {
    if (this._unlisten) {
      this._unlisten();
    }
  }

  _onAccountStoreChange = () => {
    this.setState({ account: AccountStore.accounts()[0] });
  };

  render() {
    if (!this.state.account) {
      return <div />;
    }
    return (
      <div className="page opaque initial-preferences">
        <h1 className="initial-preferences-title">{localized(`Welcome to Courier`)}</h1>
        <h4 className="initial-preferences-subtitle">
          {localized(`Let's set things up to your liking.`)}
        </h4>
        <ConfigPropContainer>
          <InitialPreferencesOptions account={this.state.account} />
        </ConfigPropContainer>
        <button className="btn btn-large initial-preferences-cta" onClick={this._onFinished}>
          {localized(`Looks Good!`)}
        </button>
      </div>
    );
  }

  _onFinished = () => {
    require('electron').ipcRenderer.send('account-setup-successful');
  };
}

export default InitialPreferencesPage;
