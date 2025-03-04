// public/js/services/PiService.js
export class PiService {
  static piSDKAvailable = typeof Pi !== 'undefined' && Pi !== null;

  static authenticate() {
    return new Promise((resolve, reject) => {
      if (!this.piSDKAvailable) {
        reject('Pi SDK not available');
        return;
      }

      Pi.authenticate(['username', 'payments', 'wallet_address'], authResult => {
        if (authResult) resolve(authResult);
        else reject('Authentication cancelled');
      });
    });
  }
}
