let restaurants,
  neighborhoods,
  cuisines;
let mapLoaded = false;  
let map;
var markers = [];
let observer;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
	let api = {
		name: 'restaurants',
		object_type: 'restaurants'
	};

	// Attach EventHandlers
	// Initialize Google Map on click or change filter
	document.getElementById('map').addEventListener('click', initMap);
	document.getElementById('cuisines-select').addEventListener('change', (e) => {
		if(!mapLoaded) initMap();
	});
	document.getElementById('neighborhoods-select').addEventListener('change', (e) => {
		if(!mapLoaded) initMap();
	});

	// Start loading data
	DBHelper.checkforIDBData(api, (error, data) => {
		console.log('Initial Load finished!');
		fetchNeighborhoods();
		fetchCuisines();
		updateRestaurants();
	});
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
  mapLoaded = true;
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  //addMarkersToMap();
  if(mapLoaded) addMarkersToMap();
	lazyLoadingObserver();
}

/**
 * Create restaurant HTML.
 */


createRestaurantHTML = (restaurant) => {
  const placeholder_img = 'data:image/png;base64,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';
	const li = document.createElement('li');

	const image = document.createElement('img');
	image.className = 'restaurant-img';
	image.setAttribute('src', placeholder_img);

	// Check if image exists
	const imageUrl = DBHelper.imageUrlForRestaurant(restaurant);
	const regex = /undefined/;

	if(!regex.test(imageUrl)) {
		image.setAttribute('data-src', imageUrl);
	} else {
		image.setAttribute('data-src', '/img/No_Image_Available.jpg');
	}
	
	image.setAttribute('alt', `Restaurant ${restaurant.name}`);
	li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', 'View Details for ' + restaurant.name + ' Restaurant');
  li.append(more)

  // Toggle favorize icon
  const favorize = document.createElement('img');
  favorize.setAttribute('alt', 'Heart');
  favorize.classList.add('favorize');
  favorize.id = restaurant.id;

  if(restaurant.is_favorite === true || restaurant.is_favorite === 'true'){
    favorize.setAttribute('src', '/img/favorized.svg');
    favorize.classList.add('favorized');
  } else {
    favorize.setAttribute('src', '/img/favorite.svg');
  }

  favorize.onclick = function toggleFavorite() {
    
    if(this.classList.contains('favorized')) {
      this.src = '/img/favorite.svg';
      this.classList.remove('favorized');
      DBHelper.toggleFavorite(false, this.id);
    } else {
      this.src = '/img/favorized.svg';
      this.classList.add('favorized');
      DBHelper.toggleFavorite(true, this.id);
    }
    };
  li.append(favorize);
  return li;
}

lazyLoadingObserver = () => {
	const restaurantImages = document.querySelectorAll('.restaurant-img');
	const observerConfig = {
		rootMargin: '50px 0px',
		threshold: 0.01
	};
	observer = new IntersectionObserver(onIntersection, observerConfig);
	restaurantImages.forEach( image => observer.observe(image));
};

// Lazy load images once rest of the page has fully loaded
function onIntersection(entries) {

	entries.forEach(entry => {
	  	if (entry.intersectionRatio > 0) {

			observer.unobserve(entry.target);

			if(entry.target.getAttribute('data-src')) {
				entry.target.setAttribute('src', entry.target.getAttribute('data-src'));
			}
		}
	});
  }

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
