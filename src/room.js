class Room extends Phaser.Scene {
    frontendPlayers = {};
    readyPlayers = {}
    playerUsername = {}
    chatHistory = []
    readyPlayersCount = 0
    countdownTime = 0
    weaponId
    grenadeId
    weapons = {
        1: 'Pistol',
        2: 'Shotgun',
        3: 'AR',
        4: 'Sniper'
    }
    grenades = {
        1: 'smokeGrenade',
        2: 'grenade'
    }
    availableWeapons = []
    availableGrenades = []
    constructor() {
        super({ key: 'room'});
    }
    init(data) {
        this.roomId = data.roomId
        this.mapSize = data.mapSize
    }
    preload() {
        this.graphics = this.add.graphics()
        
    }
    create() {
        this.setupScene()
        this.setupInputEvents()
        this.add.text(1920 / 2, (1080 / 2) - 500, 'ROOM CODE: ' + this.roomId, {
            fontFamily: 'Berlin Sans FB Demi',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5).setScale(2);
    }

    setupInputEvents() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        socket.emit('joinRoom', this.roomId)

        socket.on('roomJoinFailed', errorMessage => {
            alert(errorMessage)
            this.scene.start('lobby')
            this.scene.stop()
        })

        socket.on('updateRoomPlayers', roomPlayers => {
            for (const playerIndex in roomPlayers) {
                const playerData = roomPlayers[playerIndex];
                const roomId = playerData.roomId
                if (this.roomId !== roomId) return;
                const id = playerData.id
                if (!this.frontendPlayers[id]) {
                    this.setupPlayer(id, playerData)
                    this.readyPlayers[id] = false
                } else {
                    this.updatePlayerPosition(id, playerData)
                }
            }

            for (const playerId in this.frontendPlayers) {
                //goes through players, get their id, and if returns undefined, then the player does not exist
                if (!roomPlayers.find(player => player.id === playerId)) { 
                    this.frontendPlayers[playerId].anims.stop();
                    this.frontendPlayers[playerId].destroy();
                    delete this.frontendPlayers[playerId];
                }
            }

        });

        socket.on('countdownEnd', () => {
            this.scene.start('Multiplayer', {multiplayerId: this.roomId, mapSize: this.mapSize})
            this.scene.stop()
            
            for (const id in this.frontendPlayers) {
                this.frontendPlayers[id].anims.stop()
                this.frontendPlayers[id].destroy();
                delete this.frontendPlayers[id];
            }
            this.chatHistory = []
            socket.off('updateRoomPlayers')
        })

        socket.on('playerAnimationUpdate', animData => {
            const { playerId, animation } = animData;
            if (this.frontendPlayers[playerId]) {
                this.frontendPlayers[playerId].anims.play(animation, true);
            }
        });

        socket.on('updateReadyPlayers', (readyCount) => {
            this.readyPlayersCount = readyCount
            if (this.readyPlayersText) {
                this.readyPlayersText.setText(`READY PLAYERS: ${this.readyPlayersCount}`);
            }
            this.checkAllPlayersReady();

            if (this.readyPlayers[socket.id]) {
                const username = this.playerUsername[socket.id]
                const message = `${username} is ready!`
                socket.emit('sendMessage', {roomId: this.roomId, message})
            }
        })

        socket.on('updateCountdown', (countdownTime) => {
            this.countdownTime = countdownTime
            if (this.countdownText) {
                this.countdownText.setText(`Game starts in: ${this.countdownTime}`);
            }
        })

        socket.on('receiveMessage', (message) => {
            this.chatHistory.push(message);
            this.chatDisplay.setText(this.chatHistory.slice(-15).join('\n'));
        })

        socket.on('availableWeapons', (availableWeapons, availableGrenades) => {
            this.availableWeapons = availableWeapons
            this.availableGrenades = availableGrenades
        })

    }

    setupScene() {
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        const map = this.make.tilemap({ key: "map", tileWidth: 32, tileHeight: 32});
        const tileset = map.addTilesetImage("asd", "tiles");
        const layer = map.createLayer("Tile Layer 1", tileset, 0, 0);
        this.add.sprite(430, 430, 'wasd').setScale(0.2)
        this.add.text(375, 350, 'Movement').setScale(1.5)
        this.add.image(450, 520, 'R').setScale(1.5)
        this.add.text(385, 480, 'Reload').setScale(1.5)
        this.add.image(450, 590, 'G').setScale(1.5)
        this.add.text(350, 540, 'Smoke grenade').setScale(1.5)
        this.add.image(420, 680, 'left-click').setScale(0.2)
        this.add.text(385, 610, 'Shoot').setScale(1.5)
        this.fullscreenButton = this.add.sprite(1890, 30, 'fullscreen').setDepth().setScale(0.1)
        this.fullscreenButton.setInteractive({ useHandCursor: true })
        this.fullscreenButton.on('pointerdown', () => {
            document.getElementById('phaser-example');
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        })

        this.exitButton = this.add.sprite(150, 80, 'exit').setScale(0.4)
        this.exitButton.setInteractive({ useHandCursor: true })
        this.exitButton.on('pointerdown', () => {
            const exitPromptContainer = document.getElementById('exit-prompt-container');
            const exitYesButton = document.getElementById('exitYesButton');
            const exitNoButton = document.getElementById('exitNoButton');

            const handleExitYes = () => {
                socket.emit('leaveRoom', this.roomId);
                socket.removeAllListeners();
                this.scene.start('lobby');
                this.scene.stop();
                if (this.frontendPlayers[socket.id]) {
                    this.frontendPlayers[socket.id].anims.stop()
                    this.frontendPlayers[socket.id].destroy();
                    delete this.frontendPlayers[socket.id];
                }
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const handleExitNo = () => {
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const cleanupEventListeners = () => {
                exitYesButton.removeEventListener('click', handleExitYes);
                exitNoButton.removeEventListener('click', handleExitNo);
            };
            const hideExitPrompt = () => {
                overlay.style.display = 'none';
                exitPromptContainer.style.display = 'none';
            };
            exitPromptContainer.style.display = 'block';
            exitYesButton.addEventListener('click', handleExitYes);
            exitNoButton.addEventListener('click', handleExitNo);
        })

        this.readyButton = this.add.sprite(1920 / 2, (1080 / 2) - 300, 'ready')
        this.readyButton.setInteractive({useHandCursor: true})
        this.readyButton.on('pointerover', () => this.readyButton.setTint(0xf1c40f)); // Change color on mouse over
        this.readyButton.on('pointerout', () => this.readyButton.clearTint()); // Reset color when mouse leaves
        this.readyButton.on('pointerdown', () => {
            let isReady = !this.readyPlayers[socket.id];
            this.readyPlayers[socket.id] = isReady
            socket.emit('updateReadyState', { playerId: socket.id, isReady, roomId: this.roomId });
        });

        this.readyPlayersText = this.add.text((1920 / 2), (1080 / 2) - 400, `READY PLAYERS: 0`, {fontFamily: 'Berlin Sans FB Demi', fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5).setScale(2);

        if (this.frontendPlayers[socket.id]) {
            const invisibleWalls = [
                { x: 336, y: 959, width: 1250, height: 10 }, // Wall 1
                { x: 326, y: 315, width: 10, height: 650 }, // Wall 2
                { x: 1580, y: 315, width: 10, height: 650 }, // Wall 3
                { x: 326, y: 315, width: 1250, height: 10 }, // Wall 4
            ];

            invisibleWalls.forEach(wall => {
                const invisibleWall = this.physics.add.sprite(wall.x + wall.width / 2, wall.y + wall.height / 2, 'invisible-wall').setVisible(false).setSize(wall.width, wall.height);
                this.physics.add.collider(this.frontendPlayers[socket.id], invisibleWall);
            });
        }

        const chatButton = this.add.image(100, 150, 'chat').setInteractive({ useHandCursor: true }).setScale(0.1)

        chatButton.on('pointerdown', () => {
            this.chatDisplay.visible = !this.chatDisplay.visible;
            closeButton.visible = !closeButton.visible;
            chatInputElement.style.display = chatInputElement.style.display === 'none' ? 'block' : 'none';
        });

        const closeButton = this.add.text(1300, 450, 'X', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 10 },
        }).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            this.chatDisplay.visible = false;
            closeButton.visible = false;
            chatInputElement.style.display = 'none';
        });

        this.chatDisplay = this.add.text(1300, 500, '', { 
            fontSize: '20px', 
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 10 },
            wordWrap: { width: 380, useAdvancedWrap: true }
        }).setInteractive().setDepth(1);
        this.chatDisplay.setFixedSize(600, 500);
        
        const chatInputHTML = `
            <div style="position: fixed; bottom: 10px; left: 10px;">
                <input type="text" id="chatInput" style="width: 300px; padding: 10px; font-size: 16px;" placeholder="Type your message...">
            </div>
        `;

        this.add.dom(1300, 1000).createFromHTML(chatInputHTML);
        const chatInputElement = document.getElementById('chatInput')
        chatInputElement.addEventListener('keydown', (event) => {
            if (chatInputElement.contains(document.activeElement)) {
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.E);
                this.input.keyboard.enabled = false
            }
            chatInputElement.addEventListener('keypress', function(event) {
                if(chatInputElement.value.length >= 30) {
                    event.preventDefault();
                }
            });
            if (event.key === 'Enter') {
                event.preventDefault()
                const text = chatInputElement.value.trim()
                if (text === '' || text.length > 30) return
                const username = this.playerUsername[socket.id]
                const message = `${username}: ${text}`
                chatInputElement.value = ''
                socket.emit('sendMessage', {roomId: this.roomId, message})
            } else if (event.key === 'Escape') {
                this.input.keyboard.enabled = true
                chatInputElement.value = '';
                chatInputElement.blur();
            } else if (event.key === ' ') {
                if(chatInputElement.value.length < 30) {
                    chatInputElement.value += ' '
                }
            }

        })

        this.nextButtonWeapon = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButtonWeapon.setPosition(this.centerX - 250, 1000).setScrollFactor(0).setDepth(1)
        this.nextButtonWeapon.setInteractive({useHandCursor: true})
        this.nextButtonWeapon.on('pointerdown', () => {
            this.weaponId++;
            if (this.weaponId > 4) {
                this.weaponId = 1
            }
            this.setupWeapon(this.weaponId)
            socket.emit('changeWeapon', this.weaponId)
        });

        this.add.text(this.centerX - 660, 900, 'Choose loadout:', { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' });

        this.previousButtonWeapon = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButtonWeapon.setPosition(this.centerX - 750, 1000).setScrollFactor(0).setDepth(1)
        this.previousButtonWeapon.setInteractive({useHandCursor: true})
        this.previousButtonWeapon.on('pointerdown', () => {
            this.weaponId--;
            if (this.weaponId < 1) {
                this.weaponId = 4
            }
            this.setupWeapon(this.weaponId)
            socket.emit('changeWeapon', this.weaponId)
        });

        this.nextButtonGrenade = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButtonGrenade.setPosition(this.centerX + 200, 1000).setScrollFactor(0).setDepth(1)
        this.nextButtonGrenade.setInteractive({useHandCursor: true})
        this.nextButtonGrenade.on('pointerdown', () => {
            this.grenadeId++;
            if (this.grenadeId > 2) {
                this.grenadeId = 1
            }
            this.setupGrenade(this.grenadeId)
            socket.emit('changeGrenade', this.grenadeId)
        });

        this.previousButtonGrenade = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButtonGrenade.setPosition(this.centerX, 1000).setScrollFactor(0).setDepth(1)
        this.previousButtonGrenade.setInteractive({useHandCursor: true})
        this.previousButtonGrenade.on('pointerdown', () => {
            this.grenadeId--;
            if (this.grenadeId < 1) {
                this.grenadeId = 2
            }
            this.setupGrenade(this.grenadeId)
            socket.emit('changeGrenade', this.grenadeId)
        });

    }

    setupPlayer(id, playerData) {
        // Cleanup existing player sprites if they exist
        // if (this.frontendPlayers[id]) {
        //     this.frontendPlayers[id].destroy();
        // }
        // Setup the respawned player
        //CIA ERRORAI KAI STARTINAM MULTIPLAYER GAME
        this.frontendPlayers[id] = this.physics.add.sprite(playerData.x, playerData.y, 'idle').setScale(4);
        this.playerUsername[id] = playerData.username
        if (id === socket.id) {
            this.weaponId = playerData.weaponId
            this.grenadeId = playerData.grenadeId
            this.setupWeapon(this.weaponId)
            this.setupGrenade(this.grenadeId)
        }
    
        // Setup other players
        for (const playerId in this.frontendPlayers) {
            if (playerId !== id) {
                const otherPlayerData = this.frontendPlayers[playerId];
                if (otherPlayerData) {
                    otherPlayerData.destroy()
                    this.frontendPlayers[playerId] = this.physics.add.sprite(otherPlayerData.x, otherPlayerData.y, 'idle').setScale(4);
                }
            }
        }
    }

    setupWeapon(weaponId) {
        if (this.displayWeapon) {
            this.displayWeapon.destroy()
        }
        if (this.lockedWeaponText) {
            this.lockedWeaponText.destroy()
        }

        if (weaponId === 3) {
            this.displayWeapon = this.add.sprite(0, 0, '' + this.weapons[weaponId]).setScale(3)
            this.displayWeapon.setPosition(this.centerX - 430, 1000).setScrollFactor(0).setDepth(1)
        } else {
            this.displayWeapon = this.add.sprite(0, 0, '' + this.weapons[weaponId]).setScale(3)
            this.displayWeapon.setPosition(this.centerX - 500, 1000).setScrollFactor(0).setDepth(1)
        }

        if (!this.availableWeapons.length) return
        if (!this.availableWeapons.includes(weaponId)) {
            this.lockedWeaponText = this.add.text(this.centerX - 550, 1000, 'LOCKED', {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: {
                    x: 5,
                    y: 2
                }
            });
            this.lockedWeaponText.setScrollFactor(0).setDepth(1);
        }
    }

    setupGrenade(grenadeId) {
        if (this.displayGrenade) {
            this.displayGrenade.destroy()
        }
        if (this.lockedGrenadeText) {
            this.lockedGrenadeText.destroy()
        }

        this.displayGrenade = this.add.sprite(0, 0, '' + this.grenades[grenadeId]).setScale(3)
        this.displayGrenade.setPosition(this.centerX + 100, 1000).setScrollFactor(0).setDepth(1)

        if (!this.availableGrenades.length) return
        if (!this.availableGrenades.includes(grenadeId)) {
            this.lockedGrenadeText = this.add.text(this.displayGrenade.x - 50, this.displayGrenade.y, 'LOCKED', {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: {
                    x: 5,
                    y: 2
                }
            });
            this.lockedGrenadeText.setScrollFactor(0).setDepth(1);
        }
    }
    
    update() {
        this.updatePlayerMovement();
    }

    updatePlayerMovement() {
        if (!this.frontendPlayers[socket.id] || !this.roomId) return;
        const player = this.frontendPlayers[socket.id];
        let moving = false;
        let direction = '';

        if (this.w.isDown) {
            moving = true;
            direction += 'Up';
            player.y -= 2;
            socket.emit('roomPlayerMove', { data: 'w', roomId: this.roomId });
        } else if (this.s.isDown) {
            moving = true;
            direction += 'Down';
            player.y += 2;
            socket.emit('roomPlayerMove', { data: 's', roomId: this.roomId });
        }

        if (this.a.isDown) {
            moving = true;
            direction += 'Left';
            player.x -= 2;
            socket.emit('roomPlayerMove', { data: 'a', roomId: this.roomId });
        } else if (this.d.isDown) {
            moving = true;
            direction += 'Right';
            player.x += 2;
            socket.emit('roomPlayerMove', { data: 'd', roomId: this.roomId });
        }

        if (moving) {
            if (player && player.anims) {
                const animationName = `Walk${direction}`;
                player.anims.play(animationName, true);
                socket.emit('playerAnimationChange', { playerId: socket.id, animation: animationName });
            }
        } else {
            if (player && player.anims) {
            player.anims.stop();
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: 'idle' });
            }
        }
    }

    updatePlayerPosition(id, roomPlayer) {
        this.frontendPlayers[id].x = roomPlayer.x;
        this.frontendPlayers[id].y = roomPlayer.y;
    }

    checkAllPlayersReady() {
        let count = 0
        for (const playerId in this.readyPlayers) {
           count++
        }
        if (count === this.readyPlayersCount && count >= 1) {
            this.readyButton.destroy()
            console.log('VISI PLAYERIAI READY')
            this.countdownText = this.add.text(800, 200, '', { fontSize: '64px', fill: '#fff' });
            this.countdownText.setOrigin(0.5);
            this.mapSize = count * 250
            socket.emit('startCountdown', this.roomId)
        }
    }

}

export default Room
