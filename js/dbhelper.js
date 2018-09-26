class ApiService {
	static fetchApiData(api, callback){

		// Check if online
		if(!navigator.onLine && (api.name === 'favorize' || api.name === 'addReview')) {
			DBHelper.sendDataWhenOnline(api);
			return;
    }

		const port = 1337;
		let api_url;
		let fetch_options;

		switch(api.name) {
			case 'restaurants':
				api_url = `http://localhost:${port}/restaurants`;
				fetch_options = {method: 'GET'};
				break;
			case 'restaurantById':
				api_url = `http://localhost:${port}/restaurants/${api.object_id}`;
				fetch_options = {method: 'GET'};
			case 'reviews':
				api_url = `http://localhost:${port}/reviews`;
				fetch_options = {method: 'GET'};
				break;
      		case 'reviewById':
				api_url = `http://localhost:${port}/reviews/?restaurant_id=${api.object_id}`;
				fetch_options = {method: 'GET'};
				break;
			case 'addReview':
				api_url = `http://localhost:${port}/reviews`;
				
				let review = {
					"name": api.data[0],
					"rating": parseInt(api.data[1]),
					"comments": api.data[2],
					"restaurant_id": parseInt(api.data[3])
				};

				fetch_options = {
					method: 'POST',
					body: JSON.stringify(review),
					headers: new Headers({
						'Content-Type': 'application/json'
					}) 
				};
				break;
			case 'favorize':
				api_url = `http://localhost:${port}/restaurants/${api.object_id}/?is_favorite=${api.data}`;
				fetch_options = {method: 'PUT'};
				break;
			default:
				break;
		}

		fetch(api_url,fetch_options).then( (response) => {			
      const contentType = response.headers.get('content-type');
			if(contentType && contentType.indexOf('application/json') !== -1 ) {
				return response.json();
			} else { 
				return 'API call successfull';
			}
		}).then( (data) => {
			callback(null, data);
		}).catch( error => callback(error, null));

	};

}

class DBHelper {

	// Creates or returns IndexedDB stores
	static setupIDBStores(store) {
		switch(store) {
			case 'restaurants':
				let restaurantDbPromise = idb.open('restaurants', 1, (upgradeDB) => {
          let restaurantStore = upgradeDB.createObjectStore('restaurants', {keyPath: 'id'}); // Value: Key
          //restaurantStore.createIndex('by-id', 'id');
				});
				return restaurantDbPromise;
			case 'reviews':
				let reviewDbPromise = idb.open('reviews', 1, (upgradeDB) => {
					let reviewStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
					reviewStore.createIndex('by-restaurantId', 'restaurant_id');
				});
				return reviewDbPromise;
		}
	}

	// Check for Data in IDB, serve, fetch and update
	static checkforIDBData(api, callback) {

		const dbPromise = DBHelper.setupIDBStores(api.object_type)
		
		dbPromise.then( db => {
			let tx = db.transaction(api.object_type);
			let store = tx.objectStore(api.object_type);
			return store.getAll();
		}).then( data => {
			// Data in IDB: Send to front-end, fetch from API, compare & update
			if(data.length > 0) {
				callback(null, data);

				let dataRefreshed = localStorage.getItem('dataRefreshed');

				if(!dataRefreshed || (dataRefreshed - new Date()) / 1000 > 300  ) {
					
					localStorage.setItem('dataRefreshed', new Date());

					ApiService.fetchApiData(api, (error, data) => {
						let worker = new Worker('js/worker.js');

						let workerData = {
							api: api.name,
							objects: data
						};

						worker.postMessage(workerData);
						worker.onmessage = (e) => console.log(e.data);
					});
				}
			
			// Data not in IDB: Fetch from API, send to front-end, store in IDB
			} else {
				console.log(`No ${api.name} found`);

				ApiService.fetchApiData(api, (error, data) => {
					localStorage.setItem('dataRefreshed', new Date());
					DBHelper.setupIDBStores(api.object_type).then( db => {
						let tx = db.transaction(api.object_type, 'readwrite');
						let store = tx.objectStore(api.object_type);
						data.forEach( object => {
							store.put(object);
						});
						return data;
					}).then( (data) => callback(null, data));
				});
			}
		});

	}

	// Update IDB with front-end user input data
	static updateIDBData(api, callback) {
		let dbPromise = DBHelper.setupIDBStores(api.object_type);
		dbPromise.then( db => {
			let tx = db.transaction(api.object_type);
			let store = tx.objectStore(api.object_type);
			return store.get(api.object_id);
		}).then( object => {
			object.is_favorite = api.data;
			dbPromise.then( db => {
				let tx = db.transaction(api.object_type, 'readwrite');
				let store = tx.objectStore(api.object_type);
				store.put(object);
				return;
			}).then( () => callback(null, `IDB: ${object.name} favorized!`));

		});

	}

	static sendDataWhenOnline(api) {
		localStorage.setItem('data', JSON.stringify(api.data));
		window.addEventListener('online', (event) => {
			let data = JSON.parse(localStorage.getItem('data'));
			if(data !== null) {
				ApiService.fetchApiData(api, (error, data) => {
					error ? console.log(error) : console.log(data);
				});
				localStorage.removeItem('data');
			}
		});
	}

	// === Getter FUNCTIONS ===
	static fetchRestaurantById(id, callback) {
		let api = {
			name: 'restaurantById',
			object_type: 'restaurants',
			object_id: id
		};
		DBHelper.checkforIDBData(api, (error, restaurants) => {
			if (error) { 
        callback(error, null);
      } else {
				const restaurant = restaurants.find( r => r.id == id);
				!restaurant ? callback('Restaurant does not exist', null): callback(null, restaurant);
			}
		});
	}

	static getRestaurantByCuisine(cuisine, callback) {
		let api = {
			name: 'restaurants',
			object_type: 'restaurants'
		};
		DBHelper.checkforIDBData(api, (error, restaurants) => {
			if(error){ 
        callback(error, null);
      } else {
				const cuisines = restaurants.filter(r => r.cuisine_type == cuisine);
				callback(null, cuisines);
			}
		});

	}

	static fetchNeighborhoods(neighborhood, callback) {
		let api = {
			name: 'restaurants',
			object_type: 'restaurants'
    };
  
		DBHelper.checkforIDBData(api, (error, restaurants) => {
   

			if(error) { 
        //callback(error, null);
        return error;
      } else {
        const neighborhoods = restaurants.filter(r => r.neighborhood == neighborhood);
        //callback(null, neighborhoods);
        return neighborhoods;
			}
		});
	}

	static fetchRestaurantByCuisineAndNeighborhood (cuisine, neighborhood, callback) {
		let api = {
			name: 'restaurants',
			object_type: 'restaurants'
		};
		DBHelper.checkforIDBData(api, (error, restaurants) =>{
			if(error){ 
        callback(error, null);
      } else {
				let filteredRestaurants = restaurants;
				if(cuisine !== 'all') {
					filteredRestaurants = filteredRestaurants.filter(r => r.cuisine_type === cuisine); 
				}
				if(neighborhood != 'all') {
					filteredRestaurants = filteredRestaurants.filter(r => r.neighborhood === neighborhood);
				}
				callback(null, filteredRestaurants);
			}
		});
	}

	static getNeighborhoods(callback) {
		let api = {
			name: 'restaurants',
			object_type: 'restaurants'
		};
		DBHelper.checkforIDBData(api, (error, restaurants) => {
			if(error) { 
        callback(error, null);
      } else {
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );

        callback(null, uniqueNeighborhoods);
			}
			
		});
	}

	static fetchCuisines(callback) {
		let api = {
			name: 'restaurants',
			object_type: 'restaurants'
		};
		DBHelper.checkforIDBData(api, (error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
				/* Remove duplicates from cuisines */
				const uniqueCuisines = cuisines.filter(
					(v, i) => cuisines.indexOf(v) == i
				);
				callback(null, uniqueCuisines);
			}
		});
	}

	static getReviewsByRestaurant(restaurantId, callback) {
		let api = {
			name: 'reviewById',
			object_type: 'reviews',
			object_id: restaurantId
		};
		DBHelper.checkforIDBData(api, (error, reviews) => {
			if(error) { 
        callback(null, error); 
      } else {
				const filteredReviews = reviews.filter( r => r.restaurant_id === restaurantId);
				callback(null, filteredReviews);
			}
		});
	}

	static urlForRestaurant(restaurant) {
		return `./restaurant.html?id=${restaurant.id}`;
	}

	static imageUrlForRestaurant(restaurant) {
		return `/img/${restaurant.photograph}.jpg`;
	}

	static mapMarkerForRestaurant(restaurant, map) {
		const marker = new google.maps.Marker({
			position: restaurant.latlng,
			title: restaurant.name,
			url: DBHelper.urlForRestaurant(restaurant),
			map: map,
			animation: google.maps.Animation.DROP
		});
		return marker;
	}

	static toggleFavorite(mode, restaurantId) {
		restaurantId = parseInt(restaurantId);
		let api = {
			name: 'favorize',
			object_type: 'restaurants',
			object_id: restaurantId,
			data: mode
		};

		DBHelper.updateIDBData(api, (error, data) => {
			if(error){
          		console.log(error);
      		} 
		});
		
		ApiService.fetchApiData(api, (error, data) => {
			error ? console.log(error): console.log(`API: ${data.name} updated`);
		});

	}

	static addReview(review) {
		let api = {
			name: 'addReview',
			data: review,
			object_type: 'review'
		};
		// Send to DBHelper for update
		ApiService.fetchApiData(api, (error, data) => {
			error ? console.log(error) : console.log(`Server: Review uploaded`);
		});
	}
}