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
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.add.sprite(this.centerX, this.centerY, 'background');
        const login = this.add.dom(this.centerX, this.centerY).createFromHTML(`
        <style>
            #login {
                background-color: rgba(255, 255, 255, 0.5);
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);
                text-align: center;
            }
            #login input[type="text"],
            #login input[type="password"] {
                width: 80%;
                padding: 10px;
                margin: 10px auto;
                border-radius: 5px;
                border: 1px solid #ccc;
                display: block;
            }
        </style>

        <form id="login">
            <div>
                <input type="text" id="uname" placeholder="Username" name="username" class="forminput" required>
            </div>
            <div>
                <input type="password" id="pswd" placeholder="Password" required>
            </div>
            <div>
                <input type="submit" value="Login" style="width: 80%; padding: 10px; border-radius: 5px; border: none; color: white; background-color: #5C6BC0;">
            </div>
        </form>
        <p style="color:white">Not a member? <a href="#" id="register">Sign up now</a></p>
        <p style="color:white">Forgot your password? <a href="#" id="forgotPassword">Reset it here</a></p>
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
                this.removeInputs()
                return;
            }

            this.sendData(username, password)

        })

        const resetPassword = login.getChildByID('forgotPassword')
        resetPassword.addEventListener('click', () => {
            login.setVisible(false)
            const resetPassword = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <style>
            #reset {
                background-color: rgba(255, 255, 255, 0.5);
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);
                text-align: center;
            }
            #reset input[type="text"],
            #reset input[type="password"] {
                width: 80%;
                padding: 10px;
                margin: 10px auto;
                border-radius: 5px;
                border: 1px solid #ccc;
                display: block;
            }
        </style>

            <form id="reset">
                <div>
                    <input type="text" id="email" placeholder="Email address" required>
                </div>
                <div>
                    <input type="submit" value="Submit Email Address" style="width: 80%; padding: 10px; border-radius: 5px; border: none; color: white; background-color: #5C6BC0;">
                </div>
            </form>
        `);
        const emailPattern = /\S+@\S+\.\S+/
        
        const resetForm = resetPassword.getChildByID('reset')
        resetForm.addEventListener('submit', (event) => {
            event.preventDefault()
            const email = document.getElementById('email').value
            if (!emailPattern.test(email) || email.trim() === '') {
                alert('Please enter a valid email address');
                document.getElementById('email').value = ''
                return;
            } else {
                this.sendVerificationEmail(email)
                resetPassword.setVisible(false)
            }
        })
        
        });

    }
        
    sendVerificationEmail(email) {
        socket.emit('sendVerificationEmail', email)

        const verificationForm = this.add.dom(this.centerX, this.centerY).createFromHTML(`
            <style>
                #verification {
                    background-color: rgba(255, 255, 255, 0.5);
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0px 0px 10px 0px rgba(0,0,0,0.1);
                    text-align: center;
                }
                #verification input[type="text"] {
                    width: 80%;
                    padding: 10px;
                    margin: 10px auto;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                    display: block;
                }
                #verification input[type="password"] {
                    width: 80%;
                    padding: 10px;
                    margin: 10px auto;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                    display: block;
                }
            </style>

            <form id="verification">
                <div>
                    <input type="text" id="verificationCode" placeholder="Verification Code" required><br>
                </div>
                <div>
                    <input type="password" id="newPassword" placeholder="New Password" required><br>
                </div>
                <div>
                    <input type="password" id="repeatNewPassword" placeholder="Repeat New Password" required><br>
                </div>
                <div>
                    <input type="submit" value="Reset Password" style="width: 80%; padding: 10px; border-radius: 5px; border: none; color: white; background-color: #5C6BC0;">
                </div>
            </form>
        `);

        const verify = verificationForm.getChildByID('verification')
        verify.addEventListener('submit', (event) => {
            event.preventDefault()
            const code = document.getElementById('verificationCode').value
            const newPassword = document.getElementById('newPassword').value;
            const repeatNewPassword = document.getElementById('repeatNewPassword').value;
            if (code.trim() === '') {
                alert('Please enter code')
                document.getElementById('verificationCode').value = ''
                document.getElementById('newPassword').value = ''
                document.getElementById('repeatNewPassword').value = ''
            } 
            if (newPassword !== repeatNewPassword) {
                alert('Passwords do not match');
                document.getElementById('verificationCode').value = ''
                document.getElementById('newPassword').value = ''
                document.getElementById('repeatNewPassword').value = ''
                return;
            }
            const data = { email, code, newPassword }
            socket.emit('resetPassword', (data))
            socket.on('resetResponse', (response) => {
                console.log('responsas', response)
                if (response.success) {
                    alert('Password changed successfully')
                    this.scene.restart('login')
                } else {
                    alert('Password reset failed: ' + response.error)
                    document.getElementById('verificationCode').value = ''
                    document.getElementById('newPassword').value = ''
                    document.getElementById('repeatNewPassword').value = ''
                }
            })
        })

    }
    
    update() {

    }

    removeInputs() {
        document.getElementById('uname').value = '';
        document.getElementById('pswd').value = '';
    }

    loadRegister() {
        this.scene.start('register')
        this.scene.stop()
    }

    sendData(username, password) {
        const data = {username, password}
        socket.emit('login', data)
        socket.once('loginResponse', (response) => {
            if (response.success) {
                console.log(response.success)
                if (response.firstLogin) {
                    alert('Login successful');
                    this.scene.start('tutorial')
                    this.scene.stop()
                } else {
                    alert('Login successful');
                    this.scene.start('mainMenu');
                    this.scene.stop()
                }
            } else {
                alert('Login failed: ' + response.error);
            }
        });
    }

}

export default Login
