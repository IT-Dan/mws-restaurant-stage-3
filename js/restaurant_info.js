let restaurant;
let map;
let focusedElementBeforeModal;
let modal;
/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {;  
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

fetchReviews = () => {
	DBHelper.getReviewsByRestaurant(self.restaurant.id, (error, reviews) => {
		self.restaurant.reviews = reviews;
		fillReviewsHTML();
	});
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
	const name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	const address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;
	const image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
	image.setAttribute('alt', `Restaurant ${restaurant.name}`);

	// Check if image exists
	const imageUrl = DBHelper.imageUrlForRestaurant(restaurant);
	const regex = /undefined/;

	if(!regex.test(imageUrl)) {
		image.src = imageUrl;
	} else {
		image.src = '/img/No_Image_Available.jpg';
		console.log('Image undefined!');
	}

	const cuisine = document.getElementById('restaurant-cuisine');
	cuisine.innerHTML = restaurant.cuisine_type;

	// fill operating hours
	if (restaurant.operating_hours) {
		fillRestaurantHoursHTML();
	}
	// fill reviews
	fetchReviews();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  modal = document.getElementById('add-review-modal');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

	if(!document.getElementById('review-title')){
		const title = document.createElement('h3');
		title.id = 'review-title';
		title.innerHTML = 'Reviews';
		container.appendChild(title);
	}

	// Create add review modal
	if(!document.getElementById('toggle-review-modal') ){
		const addReviewButton = document.createElement('button');
		addReviewButton.id = 'toggle-review-modal';
		addReviewButton.innerHTML = 'Add Review';
		addReviewButton.onclick = () => {
		modal.style.display = 'block';
		makeModalAccessible();
		};
		container.appendChild(addReviewButton);
	}

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
	const container = document.createElement('div');
	const header = document.createElement('div');
	const body = document.createElement('div');
	const name = document.createElement('div');
	container.setAttribute('class', 'review');
	header.setAttribute('class', 'review-header');
	body.setAttribute('class', 'review-body');
	name.innerHTML = review.name;
	name.setAttribute('class', 'reviewer-name');
	container.appendChild(header);
	container.appendChild(body);
	header.appendChild(name);

	const date = document.createElement('div');

	formatTime = (timestamp) => {
		const createdAt = new Date(timestamp);
		const createdAtDate = createdAt.getDate();
		const createdAtMonth = createdAt.getMonth()+1;
		const createdAtYear = createdAt.getFullYear();
    const time = formatAMPM(createdAt);
		return `${createdAtMonth}/${createdAtDate}/${createdAtYear} (${time})`;
	}

	date.innerHTML = formatTime(review.createdAt);

	date.setAttribute('class', 'review-date');
	header.appendChild(date);

	const rating = document.createElement('div');
	rating.innerHTML = `Rating: ${review.rating}`;
	rating.setAttribute('class', 'review-rating');
	body.appendChild(rating);

	const comments = document.createElement('div');
	comments.innerHTML = review.comments;
	body.appendChild(comments);

	return container;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

formatAMPM = (date) => {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  let strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Form validation & submission
addReview = () => {
	
	event.preventDefault();

	// Getting the data from the form
	let restaurantId = getParameterByName('id');
	let name = document.getElementById('review-author').value;
	let rating;
	let comments = document.getElementById('review-comments').value;

	let errors = [];
	let errorContainer = document.getElementById('form-error');

	// Basic Form Validation
	if(name.length < 3 || name.length > 50) errors.push('<p>Please enter a name with 3-50 characters.</p>');
	
	if(document.querySelector('input[name="rating"]:checked')) {
		rating = document.querySelector('input[name="rating"]:checked').value;
	} else {
		errors.push('<p>Please choose a rating.</p>');
	}
	if(comments.length > 250 || comments.length < 10) errors.push('<p>Please write comments with between 10-250 characters in length. </p>');
	
	if(errors.length > 0) {
		errorContainer.innerHTML = errors.join('');
		errorContainer.style.padding = '10px';
	} else {
		errorContainer.innerHTML = '';
		const review = [name, rating, comments, restaurantId];

		// Send review to backend
		DBHelper.addReview(review);

		// Add data to DOM
		const frontEndReview = {
			restaurant_id: parseInt(review[3]),
			rating: parseInt(review[1]),
			name: review[0],
			comments: review[2],
			createdAt: new Date(),
			updatedAt: new Date()
		};

		addReviewHTML(frontEndReview);
		
		document.getElementById('review-form').reset();
		modal.style.display = 'none';
	}
}

addReviewHTML = (review) => {
	const ListContainer = document.getElementById('reviews-list');

	ListContainer.prepend(createReviewHTML(review));
};

makeModalAccessible = () => {

	let modalToggle = document.getElementById('toggle-review-modal');
	let closeBtn = document.getElementsByClassName('close')[0];

	// Trapping focus in the modal while it's open
	focusedElementBeforeModal = document.activeElement;
	let focusableElementsString = 'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"], [contenteditable]';
	let focusableElements = modal.querySelectorAll(focusableElementsString);
	focusableElements = Array.prototype.slice.call(focusableElements); // Convert NodeList to Arra<
	let firstTabStop = focusableElements[0];
	let lastTabStop = focusableElements[focusableElements.length -1];
	modal.addEventListener('keydown', trapTabKey);
	firstTabStop.focus();

	// Closing Mechanisms
	function closeModal() {
		modal.style.display = 'none';
		focusedElementBeforeModal.focus();
	}

	function trapTabKey (e) {

		// if TAB key pressed
		if(e.keyCode === 9) {

			// if SHIFT + TAB
			if(e.shiftKey) {

				if(document.activeElement === firstTabStop) {
					e.preventDefault();
					lastTabStop.focus();
				}

			// TAB				
			} else {

				if(document.activeElement === lastTabStop) {
					e.preventDefault();
					firstTabStop.focus();
				}

			}
		}

		// Close on pressing ESC
		if(e.keyCode === 27) closeModal();

	};

	// Closing Mechanisms
	closeBtn.onclick = () => closeModal();

	// Close on clicking outside modal
	window.onclick = (event) => {
		if(event.target == modal) {
			modal.style.display = 'none';
		}
	}
};