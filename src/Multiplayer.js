/* global Phaser, socket */
import SettingsButtonWithPanel from './options.js'

class Multiplayer extends Phaser.Scene {
    frontendPlayers = {}
    frontendWeapons = {}
    frontendProjectiles = {}
    frontendGrenades = {}
    frontendSmoke = {}
    frontendExplosion = {}
    playerHealth = {}
    weaponDetails = {}
    playerUsername = {}
    darkOverlay = {}
    weapon = {}
    empty = false
    gameStop = false
    animationKeys = {
        1: { name: 'Pistol', startShoot: 0, endShoot: 11, startReload: 0, endReload: 22 },
        2: { name: 'Shotgun', startShoot: 0, endShoot: 13, startReload: 0, endReload: 13 },
        3: { name: 'AR', startShoot: 0, endShoot: 15, startReload: 0, endReload: 15 },
        4: { name: 'Sniper', startShoot: 0, endShoot: 43, startReload: 0, endReload: 27 },
    }
    grenades = {
        1: 'smokeGrenade',
        2: 'grenade'
    }
    explosions = {
        1: 'smoke',
        2: 'explosion'
    }
    playersAffected = {}
    fallingObjects = []

    constructor() {
        super({ key: 'Multiplayer' });
    }

    init(data) {
        this.cameras.main.setBackgroundColor('#000000');
        this.multiplayerId = data.multiplayerId
        this.mapSize = data.mapSize
    }

    preload() {
        this.graphics = this.add.graphics()
        for (let i = 3; i <= 21; i++) {
            this.load.image(`explosion_${i}`, `assets/Explosion/1_${i}.png`)
        }
    }

    create() {
        this.setupScene();
        this.setupInputEvents();
        this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
    }

    gunAnimation() {
        for (const weaponId in this.animationKeys) {
            const weaponData = this.animationKeys[weaponId];
            const weapon = weaponData.name;
            const startShoot = weaponData.startShoot;
            const endShoot = weaponData.endShoot;
            const startReload = weaponData.startReload;
            const endReload = weaponData.endReload;
    
            const reloadTime = this.weaponDetails.reload;
            const reloadFrames = endReload - startReload + 1;
            const reloadFrameRate = reloadFrames / (reloadTime / 1000);
    
            if (!this.anims.exists(`singleShot_${weapon}`)) {
                this.anims.create({
                    key: `singleShot_${weapon}`,
                    frames: this.anims.generateFrameNumbers(`shoot${weapon}`, { start: startShoot, end: endShoot }),
                    frameRate: 60,
                    repeat: 0
                });
            }
    
            if (!this.anims.exists(`reloads_${weapon}`)) {
                this.anims.create({
                    key: `reloads_${weapon}`,
                    frames: this.anims.generateFrameNumbers(`reload${weapon}`, { start: startReload, end: endReload }),
                    frameRate: reloadFrameRate,
                    repeat: 0
                });
            }
        }
    }
    

    setupScene() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.vaizdasImage = this.add.sprite(centerX, centerY, 'mapas');
        this.crosshair = this.physics.add.sprite(centerX, centerY, 'crosshair');
        this.fullscreenButton = this.add.sprite(1890, 30, 'fullscreen').setDepth().setScale(0.1)
        this.fullscreenButton.setPosition(this.cameras.main.width - 200, 200).setScrollFactor(0)
        this.fullscreenButton.setInteractive({ useHandCursor: true })
        this.fullscreenButton.on('pointerdown', () => {
            document.getElementById('phaser-example');
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        })
        this.graphics.lineStyle(10, 0xff0000);
        this.graphics.strokeRect(0, 0, this.cameras.main.width + this.mapSize, this.cameras.main.height + this.mapSize);

        if (!this.anims.exists('smokeExplode')) {
            const smoke = [
                { key: 'smoke', frame: 1, duration: 200 },
                { key: 'smoke', frame: 2, duration: 200 },
                { key: 'smoke', frame: 4, duration: 200 },
                { key: 'smoke', frame: 8, duration: 500 },
                { key: 'smoke', frame: 12, duration: 500 },
                { key: 'smoke', frame: 13, duration: 2000 },
                { key: 'smoke', frame: 14, duration: 2000 },
                { key: 'smoke', frame: 15, duration: 2000 },
                { key: 'smoke', frame: 16, duration: 3000 },
                { key: 'smoke', frame: 17, duration: 2000 },
                { key: 'smoke', frame: 18, duration: 1000 },
                { key: 'smoke', frame: 20, duration: 500 },
                { key: 'smoke', frame: 22, duration: 500 },
                { key: 'smoke', frame: 26, duration: 200 },
                { key: 'smoke', frame: 30, duration: 200 },
                { key: 'smoke', frame: 31, duration: 200 },
            ];

            const config = {
                key: 'smokeExplode',
                frames: smoke,
                frameRate: 20,
                repeat: 0,
            };
            this.anims.create(config);
        }

        if (!this.anims.exists('explosion_anim')) {
            const explosionFrames = [];
            for (let i = 3; i <= 21; i++) {
                explosionFrames.push({ key: `explosion_${i}` });
            }

            this.anims.create({
                key: 'explosion_anim',
                frames: explosionFrames,
                frameRate: 30,
                repeat: 0,
            });
        }

    }

    setupInputEvents() {

        this.input.on('pointermove', pointer => {
            if (this.input.mouse.locked) {
                this.crosshair.x += pointer.movementX;
                this.crosshair.y += pointer.movementY;
            }
        });

        let canShoot = true
        this.input.mouse.requestPointerLock();

        this.input.on('pointerdown', (pointer) => {
            this.input.mouse.requestPointerLock();
            if (!this.weaponDetails) return
            const firerate = this.weaponDetails.fire_rate
            if (pointer.leftButtonDown() && canShoot && this.ammo != 0) {
                this.startShooting(firerate);
                canShoot = false;
                setTimeout(() => {
                    canShoot = true;
                }, firerate);
            }
        });

        this.input.on('pointerup', this.stopShooting, this)

        let canReload = true

        this.input.keyboard.on('keydown-R', () => {
            if (!this.weaponDetails || !canReload) return;
            this.frontendWeapons[socket.id].anims.play(`reloads_${this.weapon[socket.id]}`, true);
            socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'reloads', weapon: this.weapon[socket.id]})
            canShoot = false;
            const reloadTime = this.weaponDetails.reload;
            canReload = false;
            socket.emit('reload', socket.id);
            setTimeout(() => {
                canReload = true;
                canShoot = true;
            }, reloadTime);
        });

        this.input.keyboard.on('keydown-G', () => {
            if (!this.frontendPlayers[socket.id] || !this.crosshair) return;
            socket.emit('throw', this.frontendPlayers[socket.id], this.crosshair, this.multiplayerId);
        })

        this.cursors = this.input.keyboard.createCursorKeys();
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        socket.on('playerAnimationUpdate', animData => {
            const { playerId, animation } = animData;
            if (this.frontendPlayers[playerId]) {
                this.frontendPlayers[playerId].anims.play(animation, true);
            }
        });

        socket.on('weaponStateUpdate', wsData => {
            const { playerId, x, y, rotation } = wsData;
            if (this.frontendPlayers[playerId] && this.frontendWeapons[playerId]) {
                this.frontendWeapons[playerId].setPosition(x, y).setRotation(rotation);
            }
        });

        socket.on('updatePlayers', backendPlayers => {
            const alivePlayers = {};
            for (const id in backendPlayers) {
                const backendPlayer = backendPlayers[id];
                if (this.multiplayerId !== backendPlayer.multiplayerId) return
                const playerId = backendPlayer.id
                if (!this.frontendPlayers[playerId]) {
                    this.setupPlayer(playerId, backendPlayer);
                } else {
                    this.updatePlayerPosition(playerId, backendPlayer);
                }
                alivePlayers[id] = true;
            }

            const alivePlayerCount = Object.keys(alivePlayers).length;
            if (alivePlayerCount === 1) {
                this.gameStop = true
                const id = Object.keys(alivePlayers)[0]
                this.gameWon(backendPlayers[id].username)
                this.playerAmmo.destroy()
                this.playerHealth[id].container.destroy()
                this.playerUsername[id].destroy()
                this.stopShooting()
                socket.off('updatePlayers')
            }

            for (const id in this.frontendPlayers) {
                if (!alivePlayers[id]) {
                    this.removePlayer(id);
                }
            }
        });

        socket.on('updateProjectiles', (backendProjectiles, backendGrenades) => {
            for (const id in backendProjectiles) {
                if (!this.frontendProjectiles[id]) {
                    this.setupProjectile(backendProjectiles[id].playerId, id);
                }
                else {
                    this.updateProjectilePosition(id, backendProjectiles[id]);
                }
            }
            for (const id in backendGrenades) {
                if (!this.frontendGrenades[id]) {
                    this.setupGrenade(backendGrenades[id].playerId, id, backendGrenades[id])
                }
                else {
                    this.updateGrenadePosition(id, backendGrenades[id])
                }
            }
            for (const id in this.frontendProjectiles) {
                if (!backendProjectiles[id]) {
                    this.removeProjectile(id);
                }
            }
            for (const id in this.frontendGrenades) {
                if (!backendGrenades[id]) {
                    this.removeGrenade(id)
                }
            }
        });

        socket.on('updateFallingObjects', (fallingObjects) => {
            for (const i in fallingObjects) {
                if (this.fallingObjects[i]) {
                    this.fallingObjects[i].setPosition(fallingObjects[i].x, fallingObjects[i].y);
                } else {
                    const object = this.physics.add.image(
                        fallingObjects[i].x,
                        fallingObjects[i].y,
                        'wall'
                    ).setScale(2);
                    this.fallingObjects[i] = object;
                }
            }
            for (const id in this.fallingObjects) {
                if (!fallingObjects.hasOwnProperty(id)) {
                    this.fallingObjects[id].destroy();
                    delete this.fallingObjects[id];
                }
            }
        })

        socket.on('updateGunAnimation', (playerId, animation, weapon) => {
            if (this.frontendWeapons[playerId]) {
                this.frontendWeapons[playerId].anims.play(`${animation}_${weapon}`, true);
                if (animation == 'singleShot') {
                    this.sound.play(weapon + 'Sound', { volume: 0.5 });
                }
            }
        }) 
    }

    startShooting(firerate) {
        if (!this.frontendPlayers[socket.id] || !this.crosshair) return;
        this.frontendWeapons[socket.id].anims.play(`singleShot_${this.weapon[socket.id]}`, true);
        this.sound.play(this.weapon[socket.id] + 'Sound', { volume: 0.5 })
        const direction = Math.atan((this.crosshair.x - this.frontendPlayers[socket.id].x) / (this.crosshair.y - this.frontendPlayers[socket.id].y))
        socket.emit('shoot', this.frontendPlayers[socket.id], this.crosshair, direction, this.multiplayerId);
        socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'singleShot', weapon: this.weapon[socket.id]})
        this.shootingInterval = setInterval(() => {
            if (this.ammo === 0) return
            if (!this.crosshair || !this.frontendPlayers[socket.id]) return
            const direction = Math.atan((this.crosshair.x - this.frontendPlayers[socket.id].x) / (this.crosshair.y - this.frontendPlayers[socket.id].y))
            this.sound.play(this.weapon[socket.id] + 'Sound', { volume: 0.5 })
            socket.emit('shoot', this.frontendPlayers[socket.id], this.crosshair, direction, this.multiplayerId);
            socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'singleShot', weapon: this.weapon[socket.id]})
            this.frontendWeapons[socket.id].anims.play(`singleShot_${this.weapon[socket.id]}`, true);
        }, firerate); // fire rate based on weapon

    }

    stopShooting() {
        clearInterval(this.shootingInterval)
    }

    setupPlayer(id, playerData) {
        // Cleanup existing player sprites if they exist
        if (this.frontendPlayers[id]) {
            this.frontendPlayers[id].destroy();
            this.frontendWeapons[id].destroy();
            this.playerHealth[id].container.destroy();
            this.playerUsername[id].destroy();
            if (id === socket.id) {
                this.playerAmmo.destroy();
            }
        }

        this.frontendPlayers[id] = this.physics.add.sprite(playerData.x, playerData.y, 'idleDown').setScale(5);
        this.playerUsername[id] = this.add.text(playerData.x, playerData.y - 50, playerData.username, { fontFamily: 'Arial', fontSize: 12, color: '#ffffff' });

        const healthBarWidth = 100;
        const healthBarHeight = 10;
        const healthBarBg = this.add.graphics().fillStyle(0xff0000).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarFg = this.add.graphics().fillStyle(0x00ff00).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarContainer = this.add.container(playerData.x - healthBarWidth / 2, playerData.y + 55, [healthBarBg, healthBarFg]);
        this.playerHealth[id] = { bg: healthBarBg, fg: healthBarFg, container: healthBarContainer };

        if (id === socket.id) {
            this.playerAmmo = this.add.text(playerData.x, playerData.y + 750, '', { fontFamily: 'Arial', fontSize: 12, color: '#ffffff' });
            this.weaponDetails = { fire_rate: playerData.firerate, ammo: playerData.bullets, reload: playerData.reload, radius: playerData.radius };
            this.ammoFixed = playerData.bullets
            this.gunAnimation()
        }

        this.weapon[id] = this.animationKeys[playerData.weaponId].name;
        this.frontendWeapons[id] = this.physics.add.sprite(playerData.x, playerData.y, '' + this.weapon[id]).setScale(2);
    }

    updatePlayerPosition(id, backendPlayer) {
        this.frontendPlayers[id].x = backendPlayer.x;
        this.frontendPlayers[id].y = backendPlayer.y;
        this.playerHealth[id].container.setPosition(backendPlayer.x - 50, backendPlayer.y + 55);
        const healthPercentage = backendPlayer.health / 100;
        this.playerHealth[id].fg.scaleX = healthPercentage;
        this.playerUsername[id].setPosition(backendPlayer.x, backendPlayer.y - 50);
        this.playerUsername[id].setText(`${backendPlayer.username}`);
        this.playerUsername[id].setOrigin(0.5).setScale(2);

        if (id === socket.id) {
            this.ammo = backendPlayer.bullets;
            this.playerAmmo.setPosition(backendPlayer.x, backendPlayer.y + 75).setText(`Ammo: ${this.ammo}/${this.ammoFixed}`).setOrigin(0.5).setScale(2);
        }
    }

    removePlayer(id) {
        if (id === socket.id && !this.gameStop) {
            socket.removeAllListeners()
            this.scene.stop('Multiplayer')
            this.scene.start('respawn', { multiplayerId: this.multiplayerId, mapSize: this.mapSize})
            this.playerAmmo.destroy()
            delete this.weaponDetails
        }
        if (id === socket.id) {
            this.playerAmmo.destroy()
        }
        this.frontendPlayers[id].anims.stop()
        this.frontendPlayers[id].destroy();
        this.frontendWeapons[id].destroy();
        this.playerHealth[id].container.destroy();
        this.playerUsername[id].destroy();
        delete this.frontendPlayers[id];
    }

    setupProjectile(playerId, id) {
        const weapon = this.frontendWeapons[playerId]
        const angle = weapon.rotation
        const bulletOffsetX = Math.cos(angle) * 40
        const bulletOffsetY = Math.sin(angle) * 40
        const bulletX = weapon.x + bulletOffsetX
        const bulletY = weapon.y + bulletOffsetY
        const projectile = this.physics.add.sprite(bulletX, bulletY, 'bullet').setScale(2);
        projectile.setRotation(angle);
        this.frontendProjectiles[id] = projectile;
    }

    updateProjectilePosition(id, backendProjectile) {
        const projectile = this.frontendProjectiles[id];
        projectile.x += backendProjectile.velocity.x
        projectile.y += backendProjectile.velocity.y
    }

    removeProjectile(id) {
        this.frontendProjectiles[id].destroy();
        delete this.frontendProjectiles[id];
    }

    setupGrenade(playerId, id, backendGrenade) {
        const grenadeName = this.grenades[backendGrenade.grenadeId]
        const grenade = this.physics.add.sprite(backendGrenade.x, backendGrenade.y, '' + grenadeName).setScale(4)
        const direction = Phaser.Math.Angle.Between(
            this.frontendPlayers[playerId].x,
            this.frontendPlayers[playerId].y,
            this.crosshair.x,
            this.crosshair.y
        );
        grenade.setRotation(direction)
        this.frontendGrenades[id] = grenade
    }

    updateGrenadePosition(id, backendGrenade) {
        const grenade = this.frontendGrenades[id]
        if (this.frontendGrenades[id].exploded) {
            return
        }
        grenade.x += backendGrenade.velocity.x
        grenade.y += backendGrenade.velocity.y
        const explosion = this.explosions[backendGrenade.grenadeId]
        if (backendGrenade.velocity.x === 0 && backendGrenade.velocity.y === 0) {
            this.grenadeExplode(grenade.x, grenade.y, id, explosion)
            this.frontendGrenades[id].exploded = true;
        }
    }

    removeGrenade(id) {
        this.frontendGrenades[id].destroy()
        delete this.frontendGrenades[id]
    }

    update() {
        this.updatePlayerMovement();
        this.updateCameraPosition();
        this.updateCrosshairPosition();
        this.isInSmoke();
        this.isInGrenade()
        this.onObject();
    }

    removeFallingObject(object) {
        console.log('asd')
        socket.emit('removeFallingOject', object)
        object.destroy();
        this.fallingObjects = this.fallingObjects.filter(obj => obj !== object);
    }

    updatePlayerMovement() {
        if (!this.frontendPlayers[socket.id]) return;
        const player = this.frontendPlayers[socket.id];
        const weapon = this.frontendWeapons[socket.id];
        let moving = false;
        let direction = '';

        if (this.w.isDown) {
            moving = true;
            direction += 'Up';
            player.y -= 2;
            socket.emit('playerMove', 'w');
        } else if (this.s.isDown) {
            moving = true;
            direction += 'Down';
            player.y += 2;
            socket.emit('playerMove', 's');
        }

        if (this.a.isDown) {
            moving = true;
            direction += 'Left';
            player.x -= 2;
            socket.emit('playerMove', 'a');
        } else if (this.d.isDown) {
            moving = true;
            direction += 'Right';
            player.x += 2;
            socket.emit('playerMove', 'd');
        }

        if (moving) {
            const animationName = `Walk${direction}`;
            player.anims.play(animationName, true);
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: animationName });
            this.lastDirection = direction;
        } else {
            let idleAnimationName;
            if (this.lastDirection) {
                if (this.lastDirection.includes('Up')) {
                    idleAnimationName = 'IdleUp';
                } else if (this.lastDirection.includes('Down')) {
                    idleAnimationName = 'IdleDown';
                } else if (this.lastDirection.includes('Left') || this.lastDirection.includes('Right')) {
                    idleAnimationName = this.lastDirection.includes('Left') ? 'IdleLeft' : 'IdleRight';
                } else {
                    idleAnimationName = 'IdleDown';
                }
            } else {
                idleAnimationName = 'IdleDown';
            }
            player.anims.play(idleAnimationName, true);
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: idleAnimationName });
        }

        if (player && weapon) {
            const angleToPointer = Phaser.Math.Angle.Between(player.x, player.y, this.crosshair.x, this.crosshair.y);
            weapon.setRotation(angleToPointer);
            let orbitDistance = 0
            switch (this.weapon[socket.id]) {
                case 'Pistol':
                    orbitDistance = 50;
                    break;
                case 'Shotgun':
                    orbitDistance = 110;
                    break;
                case 'AR':
                    orbitDistance = 110;
                    break;
                case 'Sniper':
                    orbitDistance = 110;
                    break;
            }
            const weaponX = player.x + Math.cos(angleToPointer) * orbitDistance;
            const weaponY = player.y + Math.sin(angleToPointer) * orbitDistance;
            weapon.setPosition(weaponX, weaponY);
            socket.emit('updateWeaponState', { playerId: socket.id, x: weaponX, y: weaponY, rotation: angleToPointer });
        }
    }

    updateCameraPosition() {
        if (!this.frontendPlayers[socket.id]) return;
        const avgX = (this.frontendPlayers[socket.id].x + this.crosshair.x) / 2 - 1920 / 2;
        const avgY = (this.frontendPlayers[socket.id].y + this.crosshair.y) / 2 - 1080 / 2;
        this.cameras.main.scrollX = avgX;
        this.cameras.main.scrollY = avgY;
    }

    updateCrosshairPosition() {
        if (!this.frontendPlayers[socket.id]) return;
        const crosshairRadius = this.weaponDetails.radius
        const player = this.frontendPlayers[socket.id];
        this.crosshair.body.velocity.x = player.body.velocity.x;
        this.crosshair.body.velocity.y = player.body.velocity.y;
        this.constrainReticle(this.crosshair, crosshairRadius);
    }

    constrainReticle(reticle, radius) {
        const distBetween = Phaser.Math.Distance.Between(this.frontendPlayers[socket.id].x, this.frontendPlayers[socket.id].y, reticle.x, reticle.y);
        if (distBetween > radius) {
            const scale = distBetween / radius;
            reticle.x = this.frontendPlayers[socket.id].x + (reticle.x - this.frontendPlayers[socket.id].x) / scale;
            reticle.y = this.frontendPlayers[socket.id].y + (reticle.y - this.frontendPlayers[socket.id].y) / scale;
        }
    }

    gameWon(username) {
        socket.removeAllListeners()
        this.cameras.main.centerOn(this.cameras.main.width / 2, this.cameras.main.height / 2);
        const winningText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `${username} has won the game!`,
            { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' }
        );

        winningText.setOrigin(0.5);

        socket.emit('gameWon', this.multiplayerId, username)

        this.time.delayedCall(5000, () => {
            for (const id in this.frontendPlayers) {
                this.removePlayer(id);
            }
            for (const id in this.frontendGrenades) {
                this.removeGrenade(id)
            }
            for (const id in this.frontendSmoke) {
                delete this.frontendSmoke[id]
            }
            for (const id in this.frontendProjectiles) {
                this.removeProjectile(id)
            }
            for (const id in this.darkOverlay) {
                delete this.darkOverlay[id]
            }
            socket.emit('leaveRoom', this.multiplayerId)
            this.scene.stop()
            this.scene.start('lobby');
        });
    }

    grenadeExplode(x, y, id, explosion) {
        if (explosion === 'smoke') {
            const smoke = this.add.sprite(x, y, 'smoke').setScale(14);
            this.frontendSmoke[id] = smoke

            // this.sound.play('smokeSound', {volume: 0.5})
            smoke.play('smokeExplode');
            //removint granatos sprite
            smoke.on('animationcomplete', () => {
                smoke.destroy();
                delete this.frontendSmoke[id]
            });
        } else if (explosion === 'explosion') {
            this.sound.play('grenadeSound', { volume: 1 })
            setTimeout(() => {
                const grenade = this.add.sprite(x - 30, y - 110, 'explosion_1').setScale(7);
                this.frontendExplosion[id] = grenade;
                grenade.play('explosion_anim');
                grenade.on('animationcomplete', () => {
                    grenade.destroy();
                    delete this.frontendExplosion[id];
                });
            }, 400);
        }
    }

    isLineBlockedBySmoke(x1, y1, x2, y2) {
        for (const smokeId in this.frontendSmoke) {
            const smoke = this.frontendSmoke[smokeId];
            if (!smoke) continue;
            const smokeBounds = smoke.getBounds();

            // Check intersection with each side of the smoke bounds
            if (Phaser.Geom.Intersects.LineToRectangle(new Phaser.Geom.Line(x1, y1, x2, y2), smokeBounds)) {
                return true;
            }
        }
        return false;
    }

    isPlayerInSmoke(player) {
        for (const smokeId in this.frontendSmoke) {
            const smoke = this.frontendSmoke[smokeId];
            if (!smoke) continue;
            const smokeBounds = smoke.getBounds();
            if (smokeBounds.contains(player.x, player.y)) {
                return true;
            }
        }
        return false;
    }

    isInSmoke() {
        const players = Object.keys(this.frontendPlayers);

        const visibilityState = {};
        players.forEach(playerId => {
            visibilityState[playerId] = {};
            players.forEach(otherPlayerId => {
                visibilityState[playerId][otherPlayerId] = true;
            });
        });

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = this.frontendPlayers[players[i]];
                const player2 = this.frontendPlayers[players[j]];

                if (!player1 || !player2) continue;

                const player1InSmoke = this.isPlayerInSmoke(player1);
                const player2InSmoke = this.isPlayerInSmoke(player2);

                if (player1InSmoke || player2InSmoke || this.isLineBlockedBySmoke(player1.x, player1.y, player2.x, player2.y)) {
                    visibilityState[players[i]][players[j]] = false;
                    visibilityState[players[j]][players[i]] = false;
                } else {
                    visibilityState[players[i]][players[j]] = true;
                    visibilityState[players[j]][players[i]] = true;
                }
            }
        }

        const currentPlayerId = socket.id;

        if (!this.frontendPlayers || !visibilityState) {
            return;
        }

        players.forEach(playerId => {
            const currentPlayer = this.frontendPlayers[playerId];
            if (!currentPlayer || !playerId) return;

            const playerVisibilityState = visibilityState[currentPlayerId];
            if (!playerVisibilityState) {
                return;
            }
            const isVisible = playerVisibilityState[playerId];
            currentPlayer.setVisible(isVisible);

            if (this.playerHealth[playerId]) {
                this.playerHealth[playerId].container.setVisible(isVisible);
            }

            if (this.playerUsername[playerId]) {
                this.playerUsername[playerId].setVisible(isVisible);
            }

            if (this.frontendWeapons[playerId]) {
                this.frontendWeapons[playerId].setVisible(isVisible);
            }
        });

    }

    isInGrenade() {
        for (const id in this.frontendPlayers) {
            const player = this.frontendPlayers[id]
            if (!player) continue
            for (const grenadeId in this.frontendExplosion) {
                const explosion = this.frontendExplosion[grenadeId]
                if (!explosion) continue
                const smallerBounds = new Phaser.Geom.Rectangle(
                    explosion.x - 90,
                    explosion.y,
                    100 * 2,
                    100 * 2
                )
                if (Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), smallerBounds)
                    && (!this.playersAffected[grenadeId] || !this.playersAffected[grenadeId][id])) {
                    console.log('granatoj')
                    socket.emit('explode', { playerId: id, grenadeId })
                    if (!this.playersAffected[grenadeId]) {
                        this.playersAffected[grenadeId] = {};
                    }
                    this.playersAffected[grenadeId][id] = true;
                    break;
                }
            }
        }
    }

    onObject() {
        if (this.fallingObjects && this.frontendPlayers[socket.id]) {
            this.fallingObjects.forEach(object => {
                if (this.physics.overlap(this.frontendPlayers[socket.id], object)) {
                    socket.emit('detect', this.multiplayerId, socket.id)
                }
            });
        }
    }

}

export default Multiplayer;
