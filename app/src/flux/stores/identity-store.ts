import MailspringStore from 'mailspring-store';

import url from 'url';

import * as Utils from '../models/utils';
import * as Actions from '../actions';

export interface IIdentity {
  id: string;
  token: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  stripePlan: string;
  stripePlanEffective: string;
  featureUsage: {
    [featureKey: string]: {
      featureLimitName: 'pro';
      usedInPeriod: number;
      quota: number;
      period: 'weekly' | 'monthly';
    };
  };
}

export type IdentityAuthResponse = IIdentity | { skipped: true };

export const EMPTY_FEATURE_USAGE = {
  featureLimitName: 'pro',
  period: 'monthly',
  usedInPeriod: 0,
  quota: 0,
};

const LOCAL_ONLY_IDENTITY: IIdentity = {
  id: 'local-only-identity',
  token: 'local-only-token',
  createdAt: '1970-01-01T00:00:00.000Z',
  firstName: 'Local',
  lastName: 'User',
  emailAddress: 'local@localhost',
  stripePlan: 'Basic',
  stripePlanEffective: 'Basic',
  featureUsage: {},
};

class _IdentityStore extends MailspringStore {
  _identity: IIdentity | null = null;

  constructor() {
    super();

    if (AppEnv.isEmptyWindow()) {
      /*
      Hot windows don't receive any action-bridge-messages, which include DB updates.
      Since the hot window loads first, it may have a stale verison of the Identity.
      */
      AppEnv.onWindowPropsReceived(() => {
        this._onIdentityChanged();
      });
      return;
    }

    AppEnv.config.onDidChange('identity', this._onIdentityChanged);
    this._ensureLocalIdentityConfig();
    this._onIdentityChanged();

    this.listenTo(Actions.logoutMailspringIdentity, this._onLogoutMailspringIdentity);
  }

  deactivate() {
    this.stopListeningToAll();
  }

  identity() {
    if (!this._identity || !this._identity.id) return null;
    return Utils.deepClone(this._identity);
  }

  isValid() {
    return true;
  }

  identityId() {
    if (!this._identity) {
      return null;
    }
    return this._identity.id;
  }

  hasProFeatures() {
    return this._identity && this._identity.stripePlanEffective !== 'Basic';
  }

  _normalizeIdentity(identity: Partial<IIdentity> | null): IIdentity {
    const createdAt =
      identity && typeof identity.createdAt === 'string' && identity.createdAt.length > 0
        ? identity.createdAt
        : LOCAL_ONLY_IDENTITY.createdAt;

    return {
      ...LOCAL_ONLY_IDENTITY,
      ...(identity || {}),
      createdAt,
      token: LOCAL_ONLY_IDENTITY.token,
      featureUsage: (identity && identity.featureUsage) || {},
    };
  }

  _ensureLocalIdentityConfig() {
    const value = AppEnv.config.get('identity');
    const normalized = this._normalizeIdentity(value);
    const { token, ...rest } = normalized;
    AppEnv.config.set('identity', rest);
  }

  async saveIdentity(identity: IIdentity | null) {
    this._identity = this._normalizeIdentity(identity);
    const { token, ...rest } = this._identity;
    AppEnv.config.set('identity', rest);

    // Setting AppEnv.config will trigger our onDidChange handler,
    // no need to trigger here.
  }

  /**
   * When the identity changes in the database, update our local store
   * cache and set the token from the keychain.
   */
  _onIdentityChanged = async () => {
    const value = AppEnv.config.get('identity');
    this._identity = this._normalizeIdentity(value);

    this.trigger();
  };

  _onLogoutMailspringIdentity = async () => {
    await this.saveIdentity(LOCAL_ONLY_IDENTITY);
  };

  /**
   * This passes utm_source, utm_campaign, and utm_content params to the
   * Mailspring billing site. Please reference:
   * https://paper.dropbox.com/doc/Analytics-ID-Unification-oVDTkakFsiBBbk9aeuiA3
   * for the full list of utm_ labels.
   */
  async fetchSingleSignOnURL(
    path: string,
    { source, campaign, content }: { source?: string; campaign?: string; content?: string } = {}
  ) {
    const pathWithQuery = url.format(url.parse(path, true));
    if (!pathWithQuery.startsWith('/')) {
      throw new Error('fetchSingleSignOnURL: path must start with a leading slash.');
    }

    return `about:blank${pathWithQuery}`;
  }

  async fetchIdentity() {
    if (!this._identity) {
      await this.saveIdentity(LOCAL_ONLY_IDENTITY);
    }
    return this._identity;
  }
}

export const IdentityStore = new _IdentityStore();
