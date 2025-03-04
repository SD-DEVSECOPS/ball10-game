export class PiService {
    static initMessageHandler() {
        window.addEventListener('message', (event) => {
            // Validate origin first
            if (event.origin !== 'https://sandbox.minepi.com') return;
            
            // Handle Pi SDK messages
            if (event.data.type === 'pi-sdk-request') {
                this.handlePiMessage(event.data);
            }
        });
    }

    static handlePiMessage(message) {
        switch(message.action) {
            case 'auth-request':
                this.handleAuthRequest(message.data);
                break;
            case 'payment-request':
                this.handlePaymentRequest(message.data);
                break;
            default:
                console.warn('Unknown Pi message:', message);
        }
    }

    static postToPi(message) {
        window.parent.postMessage({
            type: 'pi-sdk-response',
            ...message
        }, 'https://sandbox.minepi.com');
    }
}

// Initialize on load
PiService.initMessageHandler();
