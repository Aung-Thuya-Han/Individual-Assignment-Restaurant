const apiUrl = 'https://media2.edu.metropolia.fi/restaurant/api/v1';
const uploadUrl = 'https://media2.edu.metropolia.fi/restaurant/uploads';

const profileForm = document.querySelector('#profile-form');
const avatarForm = document.querySelector('#avatar-form');
const profileStatus = document.querySelector('#profile-status');
const avatarStatus = document.querySelector('#avatar-status');
const profileSummaryText = document.querySelector('#profile-summary-text');
const usernameInput = document.querySelector('#profile-username');
const emailInput = document.querySelector('#profile-email');
const passwordInput = document.querySelector('#profile-password');
const avatarImage = document.querySelector('#avatar-image');
const avatarPlaceholder = document.querySelector('#avatar-placeholder');
const logoutButton = document.querySelector('#logout-button');

const token = localStorage.getItem('restaurantToken');

if (!token) {
  window.location.href = 'login.html';
}

const authorizedRequest = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {...options, headers});
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || result.error || 'The request failed.');
  }

  return result;
};

const getUserObject = (result) => result.data || result.user || result;

const showAvatar = (avatar) => {
  if (!avatar) {
    avatarImage.hidden = true;
    avatarPlaceholder.hidden = false;
    return;
  }

  avatarImage.src = avatar.startsWith('http') ? avatar : `${uploadUrl}/${avatar}`;
  avatarImage.hidden = false;
  avatarPlaceholder.hidden = true;
};

const showUser = (user) => {
  usernameInput.value = user.username || '';
  emailInput.value = user.email || '';
  profileSummaryText.textContent = `${user.username} - ${user.email}`;
  showAvatar(user.avatar);
};

const loadProfile = async () => {
  try {
    const result = await authorizedRequest(`${apiUrl}/users/token`);
    showUser(getUserObject(result));
  } catch (error) {
    localStorage.removeItem('restaurantToken');
    window.location.href = 'login.html';
  }
};

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileStatus.textContent = 'Saving changes...';

  const updatedUser = {
    username: usernameInput.value,
    email: emailInput.value,
  };

  if (passwordInput.value) {
    updatedUser.password = passwordInput.value;
  }

  try {
    const result = await authorizedRequest(`${apiUrl}/users`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updatedUser),
    });

    showUser(getUserObject(result));
    passwordInput.value = '';
    profileStatus.textContent = result.message || 'Profile updated.';
  } catch (error) {
    profileStatus.textContent = error.message;
  }
});

avatarForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  avatarStatus.textContent = 'Uploading picture...';

  const formData = new FormData(avatarForm);

  try {
    const result = await authorizedRequest(`${apiUrl}/users/avatar`, {
      method: 'POST',
      body: formData,
    });

    showAvatar(getUserObject(result).avatar);
    avatarForm.reset();
    avatarStatus.textContent = result.message || 'Profile picture uploaded.';
  } catch (error) {
    avatarStatus.textContent = error.message;
  }
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('restaurantToken');
  window.location.href = 'login.html';
});

loadProfile();
