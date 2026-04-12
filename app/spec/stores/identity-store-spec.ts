import { Utils, KeyManager } from 'mailspring-exports';
import { IdentityStore } from '../../src/flux/stores/identity-store';

const TEST_NYLAS_ID = 'icihsnqh4pwujyqihlrj70vh';

describe('IdentityStore', function identityStoreSpec() {
  beforeEach(() => {
    this.identityJSON = {
      firstName: 'Mailspring 050',
      lastName: 'Test',
      email: 'mailspring050test@evanmorikawa.com',
      id: TEST_NYLAS_ID,
      featureUsage: {
        feat: {
          quota: 10,
          usedInPeriod: 1,
        },
      },
      token: 'secret token',
    };
  });

  describe('saveIdentity', () => {
    beforeEach(() => {
      IdentityStore._identity = this.identityJSON;
      spyOn(KeyManager, 'deletePassword');
      spyOn(KeyManager, 'replacePassword');
      spyOn(IdentityStore, 'trigger');
      spyOn(AppEnv.config, 'set');
      spyOn(AppEnv.config, 'unset');
    });

    it('clears passwords if unsetting', async () => {
      await IdentityStore.saveIdentity(null);
      expect(KeyManager.deletePassword).not.toHaveBeenCalled();
      expect(KeyManager.replacePassword).not.toHaveBeenCalled();
      expect(AppEnv.config.set).toHaveBeenCalled();
      const ident = (AppEnv.config.set as jasmine.Spy).calls[0].args[1];
      expect(ident.id).toEqual('local-only-identity');
    });

    it('applies changes synchronously', async () => {
      const used = () => IdentityStore.identity().featureUsage.feat.usedInPeriod;
      expect(used()).toBe(1);

      const next = JSON.parse(JSON.stringify(this.identityJSON));
      next.featureUsage.feat.usedInPeriod += 1;
      await IdentityStore.saveIdentity(next);
      expect(used()).toBe(2);
    });
  });

  describe('returning the identity object', () => {
    beforeEach(() => {
      spyOn(IdentityStore, 'saveIdentity').andReturn(Promise.resolve());
    });
    it('returns the identity as null if it looks blank', () => {
      IdentityStore._identity = null;
      expect(IdentityStore.identity()).toBe(null);
      IdentityStore._identity = {} as any;
      expect(IdentityStore.identity()).toBe(null);
      IdentityStore._identity = { token: 'bad' } as any;
      expect(IdentityStore.identity()).toBe(null);
    });

    it('returns a proper clone of the identity', () => {
      IdentityStore._identity = { id: 'bar', deep: { obj: 'baz' } } as any;
      const ident = IdentityStore.identity() as any;
      (IdentityStore._identity as any).deep.obj = 'changed';
      expect(ident.deep.obj).toBe('baz');
    });
  });

  describe('fetchIdentity', () => {
    beforeEach(() => {
      IdentityStore._identity = this.identityJSON;
      spyOn(IdentityStore, 'saveIdentity');
      spyOn(AppEnv, 'reportError');
    });

    it('returns the local identity when already initialized', async () => {
      await IdentityStore.fetchIdentity();
      expect(IdentityStore.saveIdentity).not.toHaveBeenCalled();
      expect(AppEnv.reportError).not.toHaveBeenCalled();
    });

    it('initializes the local identity if it is missing', async () => {
      IdentityStore._identity = null;
      await IdentityStore.fetchIdentity();
      expect(IdentityStore.saveIdentity).toHaveBeenCalled();
      const newIdent = (IdentityStore.saveIdentity as jasmine.Spy).calls[0].args[0];
      expect(newIdent.id).toEqual('local-only-identity');
      expect(AppEnv.reportError).not.toHaveBeenCalled();
    });
  });
});
