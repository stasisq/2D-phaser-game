class Lobby extends Phaser.Scene {
    constructor() {
        super({ key: 'lobby'});
    }
    createdSprites = {}
    init() {

    }
    preload() {
        this.load.image('menu', 'assets/menuPhoto.jpg');
        this.load.image('create', 'assets/create.png')
        this.load.image('join', 'assets/join.png')
    }
    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.add.sprite(centerX, centerY, 'menu');
        this.createButton = this.add.sprite(1920 / 2, (1080 / 2) - 200, 'create');
        this.createButton.setInteractive({ useHandCursor: true })
        this.createButton.on('pointerdown', () => this.createRoom())
        this.distance = 0
        this.setupInputEvents()
        this.createdSprites = {}
    }

    setupInputEvents() {
        socket.on('updateRooms', (rooms) => {
            for (const roomId in rooms) {
                if (this.createdSprites[roomId]) return        
                const roomSprite = this.add.sprite(1920 / 2, (1080 / 2) + this.distance, 'join').setInteractive({ useHandCursor: true });
                this.distance += 200
                this.createdSprites[roomId] = roomSprite
                roomSprite.on('pointerdown', () => this.joinRoom(roomId));
            }
        });
    }
    
    update() {
        
    }

   createRoom() {
    const roomName = window.prompt('Enter the name of the room:');
    socket.emit('createRoom', roomName);

    // Listen for the 'roomCreated' event from the server
    socket.once('roomCreated', (roomId) => {
        // Start the 'room' scene with the specified roomId
        this.scene.start('room', {roomId: roomId });
        this.scene.stop()
    });
}

    joinRoom(roomId) {
        socket.off('roomJoined');
        socket.off('roomJoinFailed');
        console.log('joinina')
        //const roomName = window.prompt('Enter the name of the room to join:');
        //SITOJ VIETOJ GALBUT REIKETU PATIKRINTI AR FULL ROOM AR NE, TAI CIA REIKTU SOCKET.EMIT JOIN ROOM 
        socket.emit('checkRoom', roomId)

        socket.on('roomJoined', roomId => {
            this.scene.start('room', {roomId: roomId });
            this.scene.stop()
        })
        socket.on('roomJoinFailed', errorMessage => {
            alert(errorMessage)
        })
    }

}

export default Lobby