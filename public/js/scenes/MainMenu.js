import { GameState } from '../GameState.js';
import { PiService } from '../services/PiService.js';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
        this.gameState = new GameState();
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 100, 'Main Menu', 
            { fontSize: '30px', fill: '#fff' }).setOrigin(0.5);

        this.createButton(centerX, centerY - 50, 'Start Game', () => {
            this.gameState.reset();
            this.scene.start('PlayGame');
        });

        this.createButton(centerX, centerY + 50, 'Market', 
            () => this.scene.start('Market'));

        this.createPiLoginButton(centerX, centerY + 150);
    }

    createButton(x, y, text, callback) {
        return this.add.text(x, y, text, { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);
    }

    createPiLoginButton(x, y) {
        const button = this.add.text(x, y, 'Sign In with Pi', 
            { fontSize: '20px', fill: '#00f' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', async () => {
                try {
                    await PiService.initialize();
                    const auth = await PiService.authenticate();
                    this.gameState.piUser = auth.user;
                    console.log('Pi User:', auth.user.username);
                } catch (error) {
                    console.error('Login failed:', error.message);
                }
            });
        return button;
    }
}
