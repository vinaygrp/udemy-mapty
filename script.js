'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//
//.//.//.//.//.//.APPLICATION.//.//.//.//.//.//.//.//.//.//
//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//
/*

ADDITIONAL CHALLENGS:

👉 Ability to edit a workout;
👉 Ability to delete a workout;
👉 Ability to delete All workouts;
👉 Ability to sort workouts by a certain fields (e.g. distance.)
👉 Re-build Running and Cycling objects coming from Local Storage;
👉 More relaistic error and confirmation message;

Very hard:
👉 Ability to position the map to show all workouts;
    Need to deep-dive in Leaflet library. So, that once a user clicks on all items they are grouped together
👉 Ability to draw lines and shpaes intead of just points;

Only after Asynchronous JavaScript section:
👉 Geocode location from coordinates ("Run in Faro, Portugal");
👉 Display weather data for workout time and place.

*/

//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//

// PARENT CLASS WORKING
class Workouts {
  // Class fields
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lang]
    this.distance = distance; // in KM
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// CHILD CLASS RUNNING
class Running extends Workouts {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/Km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// CHILD CLASS CYCLING
class Cycling extends Workouts {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // Km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cyc1 = new Cycling([39, -12], 27, 295, 523);
// console.log(run1);
// console.log(cyc1);

//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//
//.//.//.//.//.//.APPLICATION ARCHITECTUE.//.//.//.//.//.//
//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//.//
class App {
  // Private Instance property
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get Users Position
    this._getPosition();

    // Get data from local store.
    this._getLocalStorage();

    // Event Listener for Key Press "ENTER"
    // The "this" keyword of the DOM element onto which it is attached.
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Toggle between Elevation and Cadance. When the elevation changes.
    inputType.addEventListener('change', this._toggleElevationField);

    // Move the map to the workout location
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //* Load Page
  _getPosition() {
    if (navigator.geolocation) {
      // .bind() will return a new function()
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  //* Load the Map
  _loadMap(position) {
    // console.log('this:', this);
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}z`);

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //   console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Click on the Map EventListener
    this.#map.on('click', this._showForm.bind(this));

    // Load markers on the map
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  //* Show the form for inputting
  _showForm(mapE) {
    // console.log('mapE', mapE);
    this.#mapEvent = mapE;

    // Show the form
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //* Hide Form
  _hideForm() {
    // Clear the fieds
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //* Toggle between Elevation and Cadance.
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //* Submit the Form
  _newWorkout(e) {
    // Helper functions
    // Check the valid is input.
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // prevent refresh.
    e.preventDefault();

    // Get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If running workout, create running object
    if (type == 'running') {
      // Check if data is valid
      const cadence = +inputCadence.value;

      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be positive');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If cycling workout, create cycling object
    if (type == 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInput(distance, duration, elevationGain) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be positive');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields.
    this._hideForm();

    // Set local storage to all workouts - save to local storage
    this._setLocalStorage();
  }

  //* Rendering marker on Maps
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃🏼‍♂️ ' : '🚴🏻 '}${workout.description}`
      )
      .openPopup();
  }
  // Rendering marker on List
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃🏼‍♂️' : '🚴🏻'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
           </div>
          </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  //* Move Map
  _moveToPopup(e) {
    // closest will target the parent element (a level up)
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    // Guard clause
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // using the public interface.
    // Disabled coz, when getting reteriving the data from Local Storage the structure is no longer available thus this piece of code won't work unless the structure is restored by looping through all elements in object.
    // workout.click();
    // console.log(workout);
  }

  //* Save to local storage
  _setLocalStorage() {
    // This is a blocking call.
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  //* Get data from local storage.
  _getLocalStorage() {
    // This is a blocking call.
    const data = localStorage.getItem('workouts');
    // console.log(JSON.parse(data));

    if (!data) return;

    this.#workouts = JSON.parse(data);
    // console.log('this.#workouts', this.#workouts);

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
