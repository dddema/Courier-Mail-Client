import { shell } from 'electron';
import React from 'react';
import { localized, localizedReactFragment, PropTypes, Account } from 'mailspring-exports';
import { RetinaImg } from 'mailspring-component-kit';
import http from 'http';
import url from 'url';

import FormErrorMessage from './form-error-message';
import { LOCAL_SERVER_PORT } from './onboarding-constants';
import AccountProviders from './account-providers';

interface OAuthSignInPageProps {
  providerAuthPageUrl: string;
  buildAccountFromAuthResponse: (rep: any) => Account | Promise<Account>;
  onSuccess: (account: Account) => void;
  onTryAgain: () => void;
  providerConfig: typeof AccountProviders[0];
  serviceName: string;
}

interface OAuthSignInPageState {
  authStage: string;
  showAlternative: boolean;
  errorMessage?: string;
  pressed?: boolean;
}

export default class OAuthSignInPage extends React.Component<
  OAuthSignInPageProps,
  OAuthSignInPageState
> {
  static displayName = 'OAuthSignInPage';

  static propTypes = {
    /**
     * Step 1: Open a webpage in the user's browser letting them login on
     * the native provider's website. We pass along a key and a redirect
     * url to a Mailspring-owned server
     */
    providerAuthPageUrl: PropTypes.string,
    buildAccountFromAuthResponse: PropTypes.func,
    onSuccess: PropTypes.func,
    onTryAgain: PropTypes.func,
    iconName: PropTypes.string,
    serviceName: PropTypes.string,
  };

  _server?: http.Server;
  _startTimer: NodeJS.Timeout;
  _warnTimer: NodeJS.Timeout;
  _mounted = false;

  _renderAuthResultPage(title: string, message: string, accentHex: string) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Inter", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #2f3a48;
        background: #f2f3f5;
        padding: 18px;
      }
      .card {
        width: 100%;
        max-width: 560px;
        border-radius: 12px;
        padding: 24px 24px 20px;
        background: #f7f8fa;
        border: 1px solid #d8dde4;
        box-shadow: 0 2px 10px rgba(26, 34, 44, 0.08);
      }
      .eyebrow {
        width: 100%;
        height: 4px;
        border-radius: 999px;
        margin-bottom: 12px;
        background: ${accentHex};
      }
      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.12;
        letter-spacing: -0.02em;
        font-weight: 520;
        color: #2f3a48;
      }
      p {
        margin: 12px 0 0;
        font-size: 16px;
        line-height: 1.52;
        color: rgba(47, 58, 72, 0.82);
      }
      @media (max-width: 640px) {
        .card {
          padding: 18px 16px;
          border-radius: 10px;
        }
        h1 {
          font-size: 26px;
        }
        p {
          font-size: 15px;
        }
      }
    </style>
  </head>
  <body>
    <main class="card" role="main" aria-live="polite">
      <div class="eyebrow" aria-hidden="true"></div>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;
  }

  state: OAuthSignInPageState = {
    authStage: 'initial',
    showAlternative: false,
  };

  componentDidMount() {
    // Show the "Sign in to ..." prompt for a moment before bouncing
    // to URL. (400msec animation + 200msec to read)
    this._mounted = true;
    this._startTimer = setTimeout(() => {
      if (!this._mounted) return;
      shell.openExternal(this.props.providerAuthPageUrl);
    }, 600);
    this._warnTimer = setTimeout(() => {
      if (!this._mounted) return;
      this.setState({ showAlternative: true });
    }, 1500);

    // launch a web server
    this._server = http.createServer((request, response) => {
      if (!this._mounted) {
        response.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(
          'This authentication session has expired. Return to Courier and try again.'
        );
        return;
      }

      const { query } = url.parse(request.url, true);

      const rawCode = query.code;
      const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

      if (query.error) {
        const rawErr = Array.isArray(query.error) ? query.error[0] : query.error;
        const rawDesc = Array.isArray(query.error_description)
          ? query.error_description[0]
          : query.error_description;
        const errMessage = rawDesc || rawErr || 'Authentication was cancelled.';
        this._onError(new Error(errMessage));
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(
          this._renderAuthResultPage(
            'Authentication was cancelled.',
            'You can close this tab and return to Courier.',
            '#d85f52'
          )
        );
      } else if (code) {
        this._onReceivedCode(code);
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(
          this._renderAuthResultPage(
            'Authentication complete.',
            'You can close this tab and return to Courier.',
            '#2b87f7'
          )
        );
      } else {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Unknown Request');
      }
    });
    this._server.once('error', err => {
      AppEnv.showErrorDialog({
        title: localized('Unable to Start Local Server'),
        message: localized(
          `To listen for the Gmail Oauth response, Courier needs to start a webserver on port ${LOCAL_SERVER_PORT}. Please go back and try linking your account again. If this error persists, use the IMAP/SMTP option with a Gmail App Password.\n\n%@`,
          err
        ),
      });
    });

    // Bind explicitly to the same host used by redirect_uri to avoid IPv4/IPv6 mismatch.
    this._server.listen(LOCAL_SERVER_PORT, '127.0.0.1');
  }

  componentWillUnmount() {
    this._mounted = false;
    if (this._startTimer) clearTimeout(this._startTimer);
    if (this._warnTimer) clearTimeout(this._warnTimer);
    if (this._server) this._server.close();
  }

  _onError(err) {
    const isNetworkError = err.message?.includes('Failed to fetch');
    this.setState({
      authStage: 'error',
      errorMessage: isNetworkError
        ? localized(
            'A network error occurred. Please check your internet connection and try again.'
          )
        : err.message,
    });
    if (!isNetworkError) {
      AppEnv.reportError(err);
    }
  }

  async _onReceivedCode(code) {
    if (!this._mounted) return;
    AppEnv.focus();
    this.setState({ authStage: 'buildingAccount' });
    let account = null;
    try {
      account = await this.props.buildAccountFromAuthResponse(code);
    } catch (err) {
      if (!this._mounted) return;
      this._onError(err);
      return;
    }
    if (!this._mounted) return;
    this.setState({ authStage: 'accountSuccess' });
    setTimeout(() => {
      if (!this._mounted) return;
      this.props.onSuccess(account);
    }, 400);
  }

  _renderHeader() {
    const authStage = this.state.authStage;
    if (authStage === 'initial') {
      return (
        <h2>
          {localizedReactFragment(
            'Sign in with %@ in %@ your browser.',
            this.props.serviceName,
            <br />
          )}
        </h2>
      );
    }
    if (authStage === 'buildingAccount') {
      return <h2>{localized('Connecting to %@…', this.props.serviceName)}</h2>;
    }
    if (authStage === 'accountSuccess') {
      return (
        <div>
          <h2>{localized('Successfully connected to %@!', this.props.serviceName)}</h2>
          <h3>{localized('Adding your account to Courier…')}</h3>
        </div>
      );
    }

    // Error
    return (
      <div>
        <h2>{localized('Sorry, we had trouble logging you in')}</h2>
        <div className="error-region">
          <FormErrorMessage message={this.state.errorMessage} />
          <div className="btn" style={{ marginTop: 20 }} onClick={this.props.onTryAgain}>
            {localized('Try Again')}
          </div>
        </div>
      </div>
    );
  }

  _renderAlternative() {
    let classnames = 'input hidden';
    if (this.state.showAlternative) {
      classnames += ' fadein';
    }

    return (
      <div className="alternative-auth">
        <div className={classnames}>
          <div style={{ marginTop: 40 }}>
            {localized(`Page didn't open? Paste this URL into your browser:`)}
          </div>
          <input
            type="url"
            className="url-copy-target"
            value={this.props.providerAuthPageUrl}
            readOnly
          />
          <div
            className="copy-to-clipboard"
            onClick={() =>
              navigator.clipboard
                .writeText(this.props.providerAuthPageUrl)
                .catch(err => console.error('Failed to copy to clipboard:', err))
            }
            onMouseDown={() => this.setState({ pressed: true })}
            onMouseUp={() => this.setState({ pressed: false })}
          >
            <RetinaImg name="icon-copytoclipboard.png" mode={RetinaImg.Mode.ContentIsMask} />
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className={`page account-setup oauth-signin ${this.props.serviceName.toLowerCase()}`}>
        <div className="logo-container">
          <RetinaImg
            name={this.props.providerConfig.headerIcon}
            style={{ backgroundColor: this.props.providerConfig.color, borderRadius: 44 }}
            mode={RetinaImg.Mode.ContentPreserve}
            className="logo"
          />
        </div>
        {this._renderHeader()}
        {this._renderAlternative()}
      </div>
    );
  }
}
