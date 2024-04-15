class Login extends Phaser.Scene {
    constructor() {
        super({ key: 'login'});
    }
    init() {
        //this.cameras.main.setBackgroundColor('#ffffff')
    }
    preload() {

    }
    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.add.sprite(centerX, centerY, 'menu');
        const login = this.add.dom(centerX, centerY).createFromHTML(`
            <form id="login">
                <div>
                    <input type="text" id="uname" placeholder="Username" name="username" class="forminput" required><br>
                </div>
                <div>
                    <input type="password" id="pswd" placeholder="Password" required><br>
                </div>
                <div>
                    <input type="submit" value="Login">
                </div>
            </form>
            <p style="color:white">Not a member? <a href="#" id="register">Sign up now</a></p>
        `);

        const register = login.getChildByID('register');
        register.addEventListener('click', this.loadRegister.bind(this));

        const loginForm = login.getChildByID('login')
        //REIKIA PACHEKINT AR YRA TOKS USERNAME SU PASSWORDU DATABASE. JEI TAIP - PALEIDZIA I MULTIPLAYERI.
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault()

            const username = document.getElementById('uname').value
            const password = document.getElementById('pswd').value

            if (username.trim() === '' || password.trim() === '') {
                alert('Please enter username and password')
                return;
            }

            this.sendData(username, password)

        })

    }
        

    
    update() {

    }

    loadRegister() {
        this.scene.start('register')
    }

    sendData(username, password) {
        const data = {username, password}
        socket.emit('login', data)
        socket.on('loginResponse', (response) => {
            if (response.success) {
                alert('Login successful');
                this.scene.start('Multiplayer');
            } else {
                alert('Login failed');
            }
        });
        // fetch('/login', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({username, password})
        // })
        // .then(response => {
        //     if (response.ok) {
        //         alert('Login successful')
        //         this.scene.start('Multiplayer')
        //     } else {
        //         alert('Login failed')
        //     }
        // })
        // .catch(error => {
        //     console.log('Error:', error)
        //     alert('An error occured')
        // })
    }

}

export default Login