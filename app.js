const apiUrl = 'https://media2.edu.metropolia.fi/restaurant/api/v1';

const restaurantList = document.querySelector('#restaurant-list');
const restaurantStatus = document.querySelector('#restaurant-status');
const areaSelect = document.querySelector('#area-select');
const currentAreaText = document.querySelector('#current-area');
const menuTitle = document.querySelector('#menu-title');
const restaurantAddress = document.querySelector('#restaurant-address');
const menuTypeTitle = document.querySelector('#menu-type-title');
const menuStatus = document.querySelector('#menu-status');
const menuContent = document.querySelector('#menu-content');
const dailyButton = document.querySelector('#daily-button');
const weeklyButton = document.querySelector('#weekly-button');
const accountLink = document.querySelector('#account-link');

let selectedRestaurant = null;
let selectedMenuType = 'daily';
let menuRequestNumber = 0;
let allRestaurants = [];
let userCoordinates = null;

if (localStorage.getItem('restaurantToken')) {
  accountLink.textContent = 'Profile';
  accountLink.href = 'profile.html';
}

// Fetch JSON data and stop if the server returns an error.
const fetchData = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

// Calculate the distance between two coordinate points in kilometres.
const calculateDistance = (restaurant) => {
  if (!userCoordinates || !restaurant.location?.coordinates) {
    return null;
  }

  const [restaurantLongitude, restaurantLatitude] = restaurant.location.coordinates;
  const {latitude: userLatitude, longitude: userLongitude} = userCoordinates;
  const earthRadius = 6371;
  const latitudeDifference = toRadians(restaurantLatitude - userLatitude);
  const longitudeDifference = toRadians(restaurantLongitude - userLongitude);

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(userLatitude)) *
      Math.cos(toRadians(restaurantLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
};

// Create one course row for either a daily or weekly menu.
const createCourseItem = (course) => {
  const item = document.createElement('li');
  const information = document.createElement('div');
  const name = document.createElement('h4');
  const diets = document.createElement('p');
  const price = document.createElement('strong');

  name.textContent = course.name || 'Course name not available';
  diets.textContent = course.diets
    ? `Diets: ${course.diets}`
    : 'Diet information not available';
  price.textContent = course.price || 'Price not available';

  information.append(name, diets);
  item.append(information, price);

  return item;
};

const createCourseList = (courses) => {
  const list = document.createElement('ul');
  list.className = 'course-list';

  courses.forEach((course) => {
    list.append(createCourseItem(course));
  });

  return list;
};

const showDailyMenu = (menu) => {
  if (!menu.courses || menu.courses.length === 0) {
    menuStatus.textContent = 'No daily menu is available.';
    return;
  }

  menuContent.append(createCourseList(menu.courses));
  menuStatus.textContent = `${menu.courses.length} courses found.`;
};

const showWeeklyMenu = (menu) => {
  if (!menu.days || menu.days.length === 0) {
    menuStatus.textContent = 'No weekly menu is available.';
    return;
  }

  menu.days.forEach((day) => {
    const daySection = document.createElement('section');
    daySection.className = 'menu-day';

    const date = document.createElement('h4');
    date.textContent = day.date || 'Date not available';
    daySection.append(date);

    if (day.courses && day.courses.length > 0) {
      daySection.append(createCourseList(day.courses));
    } else {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No courses are available for this day.';
      daySection.append(emptyMessage);
    }

    menuContent.append(daySection);
  });

  menuStatus.textContent = `${menu.days.length} days found.`;
};

const loadMenu = async () => {
  if (!selectedRestaurant) {
    return;
  }

  menuContent.replaceChildren();
  menuStatus.textContent = 'Loading menu...';
  menuRequestNumber += 1;
  const currentRequestNumber = menuRequestNumber;
  menuTypeTitle.textContent = selectedMenuType === 'daily'
    ? 'Daily menu'
    : 'Weekly menu';

  try {
    const menuUrl = `${apiUrl}/restaurants/${selectedMenuType}/${selectedRestaurant._id}/en`;
    const menu = await fetchData(menuUrl);

    // Ignore an old response if the user selected something else while it loaded.
    if (currentRequestNumber !== menuRequestNumber) {
      return;
    }

    if (selectedMenuType === 'daily') {
      showDailyMenu(menu);
    } else {
      showWeeklyMenu(menu);
    }
  } catch (error) {
    console.error(error);

    if (currentRequestNumber === menuRequestNumber) {
      menuStatus.textContent = 'The menu could not be loaded. Please try again.';
    }
  }
};

const updateSelectedCard = (restaurantId) => {
  const cards = document.querySelectorAll('.restaurant-card');

  cards.forEach((card) => {
    card.classList.toggle('selected-card', card.dataset.id === restaurantId);
  });
};

const selectRestaurant = (restaurant) => {
  selectedRestaurant = restaurant;
  menuTitle.textContent = restaurant.name;
  restaurantAddress.textContent = `${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
  updateSelectedCard(restaurant._id);
  loadMenu();
};

const createRestaurantCard = (restaurant, index) => {
  const card = document.createElement('article');
  const name = document.createElement('h3');
  const address = document.createElement('address');
  const company = document.createElement('p');
  const button = document.createElement('button');
  const distance = calculateDistance(restaurant);

  card.className = 'restaurant-card';
  card.dataset.id = restaurant._id;
  name.textContent = restaurant.name;
  address.textContent = `${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`;
  company.textContent = restaurant.company || 'Service provider not available';
  button.className = 'restaurant-button';
  button.type = 'button';
  button.textContent = 'View menu';

  button.addEventListener('click', () => {
    selectRestaurant(restaurant);
    document.querySelector('#menu-preview').scrollIntoView();
  });

  card.append(name, address, company, button);

  if (distance !== null) {
    const distanceText = document.createElement('p');
    distanceText.className = 'distance';
    distanceText.textContent = index === 0
      ? `Nearest - ${distance.toFixed(1)} km away`
      : `${distance.toFixed(1)} km away`;
    card.insertBefore(distanceText, button);
  }

  return card;
};

const showRestaurantsInArea = (area) => {
  const restaurantsInArea = allRestaurants
    .filter((restaurant) => restaurant.city === area)
    .sort((first, second) => {
      if (userCoordinates) {
        return calculateDistance(first) - calculateDistance(second);
      }

      return first.name.localeCompare(second.name);
    });

  restaurantList.replaceChildren();

  restaurantsInArea.forEach((restaurant, index) => {
    restaurantList.append(createRestaurantCard(restaurant, index));
  });

  if (restaurantsInArea.length === 0) {
    restaurantStatus.textContent = `No restaurants were found in ${area}.`;
    return;
  }

  restaurantStatus.textContent = userCoordinates
    ? `${restaurantsInArea.length} restaurants in ${area}, closest first.`
    : `${restaurantsInArea.length} restaurants in ${area}, sorted by name.`;

  selectRestaurant(restaurantsInArea[0]);
};

const fillAreaSelect = () => {
  const areas = [...new Set(allRestaurants.map((restaurant) => restaurant.city))]
    .sort((first, second) => first.localeCompare(second));

  areaSelect.replaceChildren();

  const promptOption = document.createElement('option');
  promptOption.value = '';
  promptOption.textContent = 'Choose an area';
  areaSelect.append(promptOption);

  areas.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    areaSelect.append(option);
  });

  areaSelect.disabled = false;
};

const useCurrentLocation = (position) => {
  userCoordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  const closestRestaurant = [...allRestaurants]
    .filter((restaurant) => restaurant.location?.coordinates)
    .sort((first, second) => calculateDistance(first) - calculateDistance(second))[0];

  if (!closestRestaurant) {
    currentAreaText.textContent = 'Your current location could not be determined.';
    restaurantStatus.textContent = 'Restaurant locations are not available. Choose an area.';
    return;
  }

  currentAreaText.textContent = `Your current location is in ${closestRestaurant.city}.`;
  areaSelect.value = closestRestaurant.city;
  showRestaurantsInArea(closestRestaurant.city);
};

const handleLocationError = (error) => {
  console.warn('Location could not be used:', error.message);
  currentAreaText.textContent = 'Your current location is unavailable.';
  restaurantStatus.textContent = 'Location is unavailable. Please choose an area.';
};

const loadRestaurants = async () => {
  try {
    allRestaurants = await fetchData(`${apiUrl}/restaurants`);

    if (allRestaurants.length === 0) {
      restaurantStatus.textContent = 'No restaurants were found.';
      return;
    }

    fillAreaSelect();
    restaurantStatus.textContent = 'Checking your location...';

    if (!navigator.geolocation) {
      currentAreaText.textContent = 'Your current location is unavailable.';
      restaurantStatus.textContent = 'Location is not supported. Please choose an area.';
      return;
    }

    navigator.geolocation.getCurrentPosition(useCurrentLocation, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  } catch (error) {
    console.error(error);
    currentAreaText.textContent = 'Your current location could not be determined.';
    restaurantStatus.textContent = 'Restaurants could not be loaded. Please try again.';
  }
};

const chooseMenuType = (menuType) => {
  selectedMenuType = menuType;
  const dailyIsSelected = menuType === 'daily';

  dailyButton.classList.toggle('active-button', dailyIsSelected);
  weeklyButton.classList.toggle('active-button', !dailyIsSelected);
  dailyButton.setAttribute('aria-pressed', dailyIsSelected);
  weeklyButton.setAttribute('aria-pressed', !dailyIsSelected);

  loadMenu();
};

dailyButton.addEventListener('click', () => chooseMenuType('daily'));
weeklyButton.addEventListener('click', () => chooseMenuType('weekly'));
areaSelect.addEventListener('change', () => {
  if (areaSelect.value) {
    showRestaurantsInArea(areaSelect.value);
  }
});

loadRestaurants();
