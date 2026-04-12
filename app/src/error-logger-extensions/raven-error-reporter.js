/* eslint global-require: 0 */
const { getMac } = require('getmac');
const crypto = require('crypto');

module.exports = class RavenErrorReporter {
  constructor({ inSpecMode, inDevMode, resourcePath }) {
    this.inSpecMode = inSpecMode;
    this.inDevMode = inDevMode;
    this.resourcePath = resourcePath;
    this.deviceHash = 'Unknown Device Hash';

    if (!this.inSpecMode) {
      try {
        getMac((err, macAddress) => {
          if (!err && macAddress) {
            this.deviceHash = crypto
              .createHash('sha256')
              .update(macAddress)
              .digest('hex');
          }
          this._setupSentry();
        });
      } catch (err) {
        console.error(err);
        this._setupSentry();
      }
    }
  }

  getVersion() {
    return process.type === 'renderer' ? AppEnv.getVersion() : require('electron').app.getVersion();
  }

  reportError(err, extra) {
    return;
  }

  _setupSentry() {
    return;
  }
};
