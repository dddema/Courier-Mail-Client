import React from 'react';
import { localized, Utils, DOMUtils, Actions, Account, AccountStore } from 'mailspring-exports';
import { OutlineView, ScrollRegion, Flexbox } from 'mailspring-component-kit';
import AccountSwitcher from './account-switcher';
import SidebarStore from '../sidebar-store';
import { ISidebarSection } from '../types';

interface AccountSidebarState {
  accounts: Account[];
  sidebarAccountIds: string[];
  userSections: ISidebarSection[];
  standardSection: ISidebarSection;
}

export default class AccountSidebar extends React.Component<
  Record<string, unknown>,
  AccountSidebarState
> {
  static displayName = 'AccountSidebar';

  static containerRequired = false;
  static containerStyles = {
    minWidth: DOMUtils.getWorkspaceCssNumberProperty('account-sidebar-min-width', 165),
    maxWidth: DOMUtils.getWorkspaceCssNumberProperty('account-sidebar-max-width', 250),
  };

  unsubscribers = [];

  constructor(props) {
    super(props);

    this.state = this._getStateFromStores();
  }

  componentDidMount() {
    this.unsubscribers.push(SidebarStore.listen(this._onStoreChange));
    return this.unsubscribers.push(AccountStore.listen(this._onStoreChange));
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !Utils.isEqualReact(nextProps, this.props) || !Utils.isEqualReact(nextState, this.state);
  }

  componentWillUnmount() {
    return this.unsubscribers.map(unsubscribe => unsubscribe());
  }

  _onStoreChange = () => {
    return this.setState(this._getStateFromStores());
  };

  _getStateFromStores = () => {
    return {
      accounts: AccountStore.accounts(),
      sidebarAccountIds: SidebarStore.sidebarAccountIds(),
      userSections: SidebarStore.userSections(),
      standardSection: SidebarStore.standardSection(),
    };
  };

  _renderUserSections(sections) {
    return sections.map(section => <OutlineView key={section.title} {...section} />);
  }

  _onCompose = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const legacyCompose = document.querySelector(
      '.sheet-toolbar .item-compose'
    ) as HTMLButtonElement | null;

    if (legacyCompose) {
      legacyCompose.click();
      return;
    }

    Actions.composeNewBlankDraft();
  };

  render() {
    const { accounts, sidebarAccountIds, userSections, standardSection } = this.state;

    return (
      <Flexbox direction="column" style={{ order: 0, flexShrink: 1, flex: 1 }}>
        <ScrollRegion className="account-sidebar" style={{ order: 2 }}>
          <AccountSwitcher accounts={accounts} sidebarAccountIds={sidebarAccountIds} />
          <div className="sidebar-compose-wrap">
            <button
              className="btn sidebar-compose-button"
              title={localized('Compose new message')}
              aria-label={localized('Compose new message')}
              onMouseDown={this._onCompose}
              type="button"
            >
              <span className="sidebar-compose-glyph" aria-hidden="true">
                ✎
              </span>
              <span>{localized('Compose')}</span>
            </button>
          </div>
          <nav className="account-sidebar-sections" aria-label={localized('Mailboxes')}>
            <OutlineView {...standardSection} />
            {this._renderUserSections(userSections)}
          </nav>
        </ScrollRegion>
      </Flexbox>
    );
  }
}
