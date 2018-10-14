/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    /*static get DATABASE_URL() {
      const port = 8000 // Change this to your server port
      return `http://localhost:${port}/data/restaurants.json`;
    }*/
  
    static openDatabase() {
      console.log('IN OPEN DATABASE');
      if (!('indexedDB' in window)) { //in case indexedDB is not supported we skip it
        console.log('No browser support for IndexedDB');
        return;
      }
  
      return idb.open("restaurants", 2, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:
            upgradeDB.createObjectStore("restaurants", {keyPath: "id"});
          case 1:
            {
              const reviewsStore = upgradeDB.createObjectStore("reviews", {keyPath: "id"});
              reviewsStore.createIndex("restaurant_id", "restaurant_id");
            }
        }
      });
    }
  
    /**
     * Create idexedDB and add the restaurants from the server
     */
    static addIndexedDb(type, items) {
      //Add the restaurants
      DBHelper.openDatabase().then(function(db) {
        let tx = db.transaction(type, 'readwrite');
        let store = tx.objectStore(type);
  
        return Promise.all(items.map(function(item) {
          store.add(item);
        })
        ).catch(function(error) {
          tx.abort();
          console.log(error);
        }).then(function() {
          console.log('All items added successfully');
        });
      });
  
    }
  
  
   /**
     * Fetch all restaurants.
     */
    static addRestaurants() {
      return fetch('http://ec2-18-220-2-111.us-east-2.compute.amazonaws.com:1337/restaurants/')
        .then(response => {
          if (response.status === 200) { // Got a success response from server!
            response.json().then(data => {
              const restaurants = data;
              this.addIndexedDb('restaurants', restaurants);
            });
          } else { // Got an error from server.
            const error = (`Request failed. Returned status of ${response.status}`);
            console.log(error);
          }
        })
        .catch(err => {
          console.log('Fetch Error:', err)
        });
    }
  
    /**
     * Update the favorite restaurants.
     */
    static updateFavorite(restaurantId, isFav) {
  
      fetch(`http://ec2-18-220-2-111.us-east-2.compute.amazonaws.com:1337/restaurants/${restaurantId}/?is_favorite=${isFav}`, {
        method: 'PUT'
      })
      .then(() => {
        console.log('favorite changed');
        this.openDatabase()
          .then(db => {
            const tx = db.transaction('restaurants', 'readwrite');
            const store = tx.objectStore('restaurants');
            store.get(restaurantId)
              .then(restaurant => {
                restaurant.is_favorite = isFav;
                store.put(restaurant);
              })
          })
      });
    }
  
    /**
     * Fetch all reviews.
     */
    static addReview(review) {
      let offlineObj = {
        name: 'addReview',
        data: review,
      }
  
      if (!navigator.onLine && offlineObj.name === 'addReview') {
        DBHelper.waitForNetwork(offlineObj);
        return;
      }
      let sendReview = {
        "restaurant_id": parseInt(review.restaurant_id),
        "name": review.name,
        "createdAt": new Date(),
        "updatedAt": new Date(),
        "rating": parseInt(review.rating),
        "comments": review.comments,
      };
      console.log('Sending review: ', sendReview);
      fetch(`http://ec2-18-220-2-111.us-east-2.compute.amazonaws.com:1337/reviews/`, {
        method: 'POST',
        body: JSON.stringify(sendReview),
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }).then(response => {
        if (response.headers.get('content-type').indexOf('application/json') > -1) {
          return response.json();
        }
        else {
          return 'API call succeeded';
        }
      })
      .then(data => {
        console.log('All good');
      })
      .catch(err => {
        console.log('Error: ', err);
      });
    }
  
    static waitForNetwork(offlineObj) {
      localStorage.setItem('data', JSON.stringify(offlineObj.data));
      window.addEventListener('online', (event) => {
        console.log('Browser back online', event);
        let data = JSON.parse(localStorage.getItem('data'));
        if (data) {
          console.log(data);
          if (offlineObj.name === 'addReview') {
            DBHelper.addReview(offlineObj.data);
          }
          localStorage.removeItem('data');
        }
      })
    }
  
    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
      return (`./restaurant.html?id=${restaurant.id}`);
    }
  
    /**
     * Restaurant image URL.
     */
  
    /* I created three different functions so depending
     the screen-width I will be calling them respectively*/
    static imageUrlForRestaurantSmall(restaurant) {
      return (`/img/${restaurant.id}-400_small.webp`);
    }
  
    static imageUrlForRestaurantMedium(restaurant) {
      return (`/img/${restaurant.id}-800_medium.webp`);
    }
  
    static imageUrlForRestaurantLarge(restaurant) {
      return (`/img/${restaurant.id}-1600_large.webp`);
    }
  
    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP}
      );
      return marker;
    }
  
    static fetchReviewsById(id) {
      return fetch(`http://ec2-18-220-2-111.us-east-2.compute.amazonaws.com:1337/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(reviews => {
          this.openDatabase()
            .then(db => {
              if (!db) return;
              let tx = db.transaction('reviews', 'readwrite');
              const store = tx.objectStore('reviews');
              if (Array.isArray(reviews)) {
                reviews.forEach(function(review) {
                  store.put(review);
                });
              } else {
                store.put(reviews);
              }
            });
          return Promise.resolve(reviews);
        })
        .catch(error => {
          console.log('Error return reviews', error);
  
          return DBHelper.openDatabase()
            .then(db => {
              if (!db) {
                return;
              }
              const store = db.transaction('reviews').objectStore('reviews');
              const index = store.index('restaurant_id');
              return index.getAll(id);
            })
            .then(reviews => {
              return Promise.resolve(reviews);
            });
        });
    }
  
  }
  window.DBHelper = DBHelper;