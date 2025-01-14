class Marketplace extends Phaser.Scene {
  constructor() {
    super({ key: 'marketplace' });
    this.player = null;
    this.objects = null;
    this.popupText = null;
    this.purchaseText = null;
    this.map = null;
    this.interactionCooldown = false;
    this.currentObject = null;
    this.isInteracting = false;
    this.unlockedWeapons = [];
    this.unlockedGrenades = [];
  }

  init(data) {
    this.username = data.username;
  }

  preload() {
  }

  create() {
    this.fetchInfo();
    this.getUnlockedWeapons();
    this.setupScene();
    this.setupInputEvents();
    this.setupProgressBar();
  }

  setupScene() {
    this.centerX = this.cameras.main.width / 2;
    this.centerY = this.cameras.main.height / 2;

    const map1 = this.make.tilemap({ key: "map1", tileWidth: 32, tileHeight: 32 });
    const tileset4 = map1.addTilesetImage("TX Tileset Grass", "tiles4");
    const tileset1 = map1.addTilesetImage("TX Plant", "tiles1");
    const tileset3 = map1.addTilesetImage("TX Struct", "tiles3");
    const tileset5 = map1.addTilesetImage("TX Tileset Stone Ground", "tiles5");
    const tileset6 = map1.addTilesetImage("TX Tileset Wall", "tiles6");
    const tileset2 = map1.addTilesetImage("TX Props", "tiles2");
    const layer1 = map1.createLayer("Tile Layer 1", [tileset1, tileset2, tileset3, tileset4, tileset5, tileset6], 0, 0);

    this.player = this.physics.add.sprite(247, 517, 'idleDown').setScale(3);
    this.player.setCollideWorldBounds(true);

    this.gunObjects = this.physics.add.staticGroup();
    this.gun1Object = this.gunObjects.create(432, 400, 'Pistol');
    this.gun2Object = this.gunObjects.create(785, 400, 'Shotgun');
    this.gun3Object = this.gunObjects.create(1140, 400, 'AR');
    this.gun4Object = this.gunObjects.create(1460, 400, 'Sniper');

    this.gunObjects.getChildren().forEach(object => {
      object.setScale(1.5);
    });

    this.grenadeObjects = this.physics.add.staticGroup()
    this.grenade1Object = this.grenadeObjects.create(785, 650, 'smokeGrenade')
    this.grenade2Object = this.grenadeObjects.create(1110, 650, 'grenade')

    this.grenadeObjects.getChildren().forEach(object => {
      object.setScale(3);
    });

    this.popupText = this.add.text(100, 100, '', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' });
    this.popupText.setVisible(false);

    this.purchaseText = this.add.text(this.centerX, this.centerY, '', { fontFamily: 'Arial', fontSize: 64, color: '#ffffff', align: 'center' });
    this.purchaseText.setOrigin(0.5, 0.5);
    this.purchaseText.setVisible(false);

    this.physics.add.overlap(this.player, this.gunObjects, this.interactWithObject, null, this);

    this.physics.add.overlap(this.player, this.grenadeObjects, this.interactWithObject, null, this);

    this.coinsText = this.add.text(1500, 30, 'Coins: ', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' });

    this.exitButton = this.add.sprite(150, 80, 'exit').setScale(0.4)
        this.exitButton.setInteractive({ useHandCursor: true })
        this.exitButton.on('pointerdown', () => {
            const exitPromptContainer = document.getElementById('exit-prompt-container');
            const exitYesButton = document.getElementById('exitYesButton');
            const exitNoButton = document.getElementById('exitNoButton');

            const handleExitYes = () => {
                this.scene.start('mainMenu');
                this.scene.stop();
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
  }

  setupInputEvents() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    socket.on('purchaseConfirmed', (data) => {
      const { weaponId, grenadeId } = data;
      if (weaponId) {
        this.unlockedWeapons.push(weaponId);
      } else if (grenadeId) {
        this.unlockedGrenades.push(grenadeId);
      }
      this.showSuccessMessage();
    });
  }

  update() {
    this.updatePlayerMovement();
  }

  updatePlayerMovement() {
    if (!this.player) return;
    const player = this.player;
    let moving = false;
    let direction = '';

    if (this.w.isDown) {
      moving = true;
      direction += 'Up';
      player.y -= 2;
    } else if (this.s.isDown) {
      moving = true;
      direction += 'Down';
      player.y += 2;
    }

    if (this.a.isDown) {
      moving = true;
      direction += 'Left';
      player.x -= 2;
    } else if (this.d.isDown) {
      moving = true;
      direction += 'Right';
      player.x += 2;
    }

    if (moving) {
      const animationName = `Walk${direction}`;
      player.anims.play(animationName, true);
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
   }
  }

  interactWithObject(player, object) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y);
    if (distance < 50 && !this.interactionCooldown) {
      let requiredLevel = 0;
      let itemName = '';
      let cost = 0;
      let weaponId = 0;
      let grenadeId = 0;

      if (object.texture.key === 'Pistol') {
        weaponId = 1;
        requiredLevel = 1;
        itemName = 'Pistol';
        cost = 1000;
      } else if (object.texture.key === 'Shotgun') {
        weaponId = 2;
        requiredLevel = 2;
        itemName = 'Shotgun';
        cost = 2000;
      } else if (object.texture.key === 'AR') {
        weaponId = 3;
        requiredLevel = 3;
        itemName = 'AR';
        cost = 3000;
      } else if (object.texture.key === 'Sniper') {
        weaponId = 4;
        requiredLevel = 4;
        itemName = 'Sniper';
        cost = 4000;
      } else if (object.texture.key === 'smokeGrenade') {
        grenadeId = 5;
        requiredLevel = 1;
        itemName = 'Smoke Grenade';
        cost = 2500;
      } else if (object.texture.key === 'grenade') {
        grenadeId = 6;
        requiredLevel = 3;
        itemName = 'Explosive Grenade';
        cost = 4000;
      }

      this.currentObject = { weaponId, grenadeId, itemName, requiredLevel, cost };
      this.isInteracting = true;

      if (weaponId > 0 && this.unlockedWeapons.includes(weaponId)) {
        this.popupText.setText(`${itemName} is already unlocked.`);
      } else if (grenadeId > 0 && this.unlockedGrenades.includes(grenadeId)) {
        this.popupText.setText(`${itemName} is already unlocked.`);
      } else if (this.level >= requiredLevel) {
        this.popupText.setText(`Unlock ${itemName} for ${cost} coins? Press E to buy.`);
        if (this.eKey.isDown) {
          this.showPurchasePrompt();
        }
      } else {
        this.popupText.setText(`Level ${requiredLevel} required to unlock ${itemName}.`);
      }

      this.popupText.setPosition(player.x - 50, player.y - 50);
      this.popupText.setVisible(true);
    } else {
      this.popupText.setVisible(false);
      this.currentObject = null;
      this.isInteracting = false;
    }
  }


  showPurchasePrompt() {
    const promptContainer = document.getElementById('weapon-purchase-container');
    promptContainer.style.display = 'block';

    const yesButton = document.getElementById('purchaseYesButton');
    const noButton = document.getElementById('purchaseNoButton');

    const handleYesClick = () => {
      this.buyItem();
      promptContainer.style.display = 'none';
      yesButton.removeEventListener('click', handleYesClick);
      noButton.removeEventListener('click', handleNoClick);
    };

    const handleNoClick = () => {
      promptContainer.style.display = 'none';
      yesButton.removeEventListener('click', handleYesClick);
      noButton.removeEventListener('click', handleNoClick);
    };

    yesButton.addEventListener('click', handleYesClick);
    noButton.addEventListener('click', handleNoClick);
  }

  showSuccessMessage() {
    const successContainer = document.getElementById('purchase-success-container');
    successContainer.style.display = 'block';

    const closeButton = document.getElementById('successCloseButton');
    
    const handleCloseClick = () => {
      successContainer.style.display = 'none';
      closeButton.removeEventListener('click', handleCloseClick);
    };

    closeButton.addEventListener('click', handleCloseClick);

    this.time.addEvent({ delay: 2000, callback: () => {
      if (successContainer.style.display !== 'none') {
        successContainer.style.display = 'none';
        closeButton.removeEventListener('click', handleCloseClick);
      }
    } });
  }

  buyItem() {
    if (!this.isInteracting) return;
    const { weaponId, grenadeId, itemName, requiredLevel, cost } = this.currentObject;

    if (weaponId && this.unlockedWeapons.includes(weaponId)) {
      this.popupText.setText(`${itemName} is already unlocked.`);
      this.popupText.setVisible(true);
      this.time.addEvent({ delay: 2000, callback: () => this.popupText.setVisible(false) });
      return;
    }

    if (grenadeId && this.unlockedGrenades.includes(grenadeId)) {
      this.popupText.setText(`${itemName} is already unlocked.`);
      this.popupText.setVisible(true);
      this.time.addEvent({ delay: 2000, callback: () => this.popupText.setVisible(false) });
      return;
    }

    if (this.level < requiredLevel) {
      this.popupText.setText(`Level ${requiredLevel} required to unlock ${itemName}.`);
      this.popupText.setVisible(true);
      this.time.addEvent({ delay: 2000, callback: () => this.popupText.setVisible(false) });
      return;
    }

    if (this.coins >= cost) {
      this.coins -= cost;
      this.coinsText.setText(`Coins: ${this.coins}`);
      if (weaponId) {
        socket.emit('buyGun', { socket: socket.id, weaponId });
      } else if (grenadeId) {
        socket.emit('buyGrenade', { socket: socket.id, grenadeId });
      }
      this.showSuccessMessage();
    } else {
      this.purchaseText.setText(`Not enough coins to buy ${itemName}.`);
      this.purchaseText.setStyle({ fontSize: '64px', fill: '#ff0000', align: 'center' });
      this.purchaseText.setVisible(true);
      this.time.addEvent({ delay: 2000, callback: () => this.purchaseText.setVisible(false) });
    }

    this.currentObject = null;
    this.isInteracting = false;
  }


  setupProgressBar() {
    this.barWidth = 200;
    this.barHeight = 20;
    this.barX = 1500;
    this.barY = 70;

    this.progressBarBackground = this.add.graphics();
    this.progressBarBackground.fillStyle(0x000000, 1);
    this.progressBarBackground.fillRect(this.barX, this.barY, this.barWidth, this.barHeight);

    this.progressBar = this.add.graphics();

    this.currentLevelText = this.add.text(this.barX - 80, this.barY - 2, 'Level ', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    });

    this.nextLevelText = this.add.text(this.barX + this.barWidth + 10, this.barY - 2, 'Level ', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    });

    this.percentageText = this.add.text(this.barX + this.barWidth / 2, this.barY - 2, '0%', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.updateProgressBar(0, 1); //default
  }

  updateProgressBar(percentage, level) {
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff00, 1);
    this.progressBar.fillRect(this.barX, this.barY, this.barWidth * percentage, this.barHeight);

    this.currentLevelText.setText(`Level ${level}`);
    this.nextLevelText.setText(`Level ${level + 1}`);
    this.percentageText.setText(`${Math.round(percentage * 100)}%`);
  }

  fetchInfo() {
    fetch(`/get-info?username=${encodeURIComponent(this.username)}`)
      .then(response => response.json())
      .then(data => {
        this.coins = data.coins
        this.level = data.level
        this.coinsText.setText(`Coins: ${this.coins}`);
        
        const experiencePercentage = data.xp / (data.level * 100);
        this.updateProgressBar(experiencePercentage, this.level);
      })
      .catch(error => console.error('Error fetching info:', error));
  }

  getUnlockedWeapons() {
    fetch(`/get-weapons?username=${encodeURIComponent(this.username)}`)
      .then(response => response.json())
      .then(data => {
        this.unlockedWeapons = data.weapons;
        this.unlockedGrenades = data.grenades;
      })
      .catch(error => console.error('Error fetching available weapons:', error));
  }
}

export default Marketplace;
