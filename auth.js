const apiUrl = 'https://media2.edu.metropolia.fi/restaurant/api/v1';

const loginSection = document.querySelector('#login-section');
const registerSection = document.querySelector('#register-section');
const showLoginButton = document.querySelector('#show-login');
const showRegisterButton = document.querySelector('#show-register');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginStatus = document.querySelector('#login-status');
const registerStatus = document.querySelector('#register-status');

const requestData = async (url, options) => {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || result.error || 'The request failed.');
  }

  return result;
};

const showForm = (formName) => {
  const showLogin = formName === 'login';

  loginSection.hidden = !showLogin;
  registerSection.hidden = showLogin;
  showLoginButton.classList.toggle('active-button', showLogin);
  showRegisterButton.classList.toggle('active-button', !showLogin);
};

showLoginButton.addEventListener('click', () => showForm('login'));
showRegisterButton.addEventListener('click', () => showForm('register'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = 'Logging in...';

  const formData = new FormData(loginForm);
  const credentials = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  try {
    const result = await requestData(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(credentials),
    });

    if (!result.token) {
      throw new Error(result.message || 'Login failed. Check your information.');
    }

    localStorage.setItem('restaurantToken', result.token);
    window.location.href = 'profile.html';
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerStatus.replaceChildren('Creating your account...');

  const formData = new FormData(registerForm);
  const newUser = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  try {
    const result = await requestData(`${apiUrl}/users`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(newUser),
    });

    registerForm.reset();
    registerStatus.replaceChildren(result.message || 'Account created successfully.');

    if (result.activationUrl) {
      const activationLink = document.createElement('a');
      activationLink.href = result.activationUrl;
      activationLink.textContent = 'Activate your account';
      activationLink.target = '_blank';
      activationLink.rel = 'noopener';
      registerStatus.append(document.createElement('br'), activationLink);
    } else {
      registerStatus.append(' You can now log in.');
    }
  } catch (error) {
    registerStatus.replaceChildren(error.message);
  }
});
