const { app, Menu, Tray, Notification } = require('electron');
const config = require('./config');
const path = require('path');
const googleMapsClient = require('@google/maps').createClient({
  key: config.apiKey
});

const { destinations } = config;

const icon = {
  default: 'Icon',
  paused: 'IconPaused',
  heavy: 'IconHeavy'
};

let state = {
  isPaused: true,
  isHeavyTraffic: false,
  currentOrigin: 1,
  currentDestination: 0,
  info: null,
  error: null
};

let tray = null;

app.dock.hide();

app.on('ready', () => {
  tray = new Tray(
    path.join(
      __dirname,
      `/images/${state.isPaused ? icon.paused : icon.default}.png`
    )
  );

  drawContextMenu();

  fetchDirections();

  setInterval(() => {
    fetchDirections();
  }, 5 * 60 * 1000);
});

function getAllOrigins() {
  const current = destinations[state.currentOrigin].name;
  return [
    {
      label: `From (${current})`,
      submenu: destinations.map(d => {
        return {
          label: d.name,
          type: 'radio',
          checked: state.currentOrigin === d.id,
          click: () => changeOrigin(d.id)
        };
      })
    }
  ];
}

function getAllDestinations() {
  const current = destinations[state.currentDestination].name;
  return [
    {
      label: `To (${current})`,
      submenu: destinations.map(d => {
        return {
          label: d.name,
          type: 'radio',
          checked: state.currentDestination === d.id,
          click: () => changeDestination(d.id)
        };
      })
    }
  ];
}

function getInfo() {
  const messages = [];
  const { error, info } = state;

  if (error) {
    messages.push({
      label: error,
      enabled: false
    });
  }

  if (info) {
    messages.push({
      label: info,
      enabled: false
    });
  }

  return messages.length > 0 ? [...messages, getSeparator()] : messages;
}

function getSeparator() {
  return { type: 'separator' };
}

function drawContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    ...getInfo(),
    ...getAllOrigins(),
    getSeparator(),
    ...getAllDestinations(),
    getSeparator(),
    { label: 'Swap', click: () => swapOriginAndDestination() },
    { label: 'Refresh', click: () => fetchDirections() },
    {
      label: state.isPaused ? 'Paused' : 'Pause',
      type: 'checkbox',
      checked: state.isPaused,
      click: () => togglePause()
    },
    getSeparator(),
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

function getOrigin() {
  return destinations[state.currentOrigin].location;
}

function getDestination() {
  return destinations[state.currentDestination].location;
}

function changeOrigin(id) {
  state.currentOrigin = id;
  drawContextMenu();
  fetchDirections();
}

function changeDestination(id) {
  state.currentDestination = id;
  drawContextMenu();
  fetchDirections();
}

function swapOriginAndDestination() {
  const { currentOrigin, currentDestination } = state;

  state.currentOrigin = currentDestination;
  state.currentDestination = currentOrigin;

  drawContextMenu();
  fetchDirections();
}

function togglePause() {
  state.isPaused = !state.isPaused;

  const newIcon = state.isPaused ? icon.paused : icon.default;
  setIcon(newIcon);

  fetchDirections();
}

function fetchDirections() {
  if (state.isPaused) {
    checkForAutomaticUnpause();
    checkForAutomaticPause();
    tray.setTitle('');
    drawContextMenu();
    return;
  }

  state.error = null;
  state.info = `Fetching... (${new Date()})`;
  tray.setTitle('Loading...');

  googleMapsClient.directions(
    {
      origin: getOrigin(),
      destination: getDestination(),
      departure_time: new Date(Date.now()),
      traffic_model: 'best_guess'
    },
    (err, response) => {
      if (err) {
        state.info = null;
        state.error = err && err.code;
        tray.setTitle('Error...');
        drawContextMenu();
        return;
      }

      state.info = `Updated: ${formatDate(new Date())}`;

      const route = response.json.routes[0];

      const duration = route.legs[0].duration_in_traffic.text;
      const summary = route.summary;
      const warnings = route.warnings;

      const durationWithoutTraffic = route.legs[0].duration.value;
      const durationWithTraffic = route.legs[0].duration_in_traffic.value;

      if (isHeavyTraffic(durationWithoutTraffic, durationWithTraffic)) {
        setIcon(icon.heavy);

        if (!state.isHeavyTraffic) {
          new Notification({
            title: 'Traffic is getting heavy!',
            body: "Perhaps it's time to head off?"
          }).show();
          state.isHeavyTraffic = true;
        }
      } else {
        setIcon(icon.default);
        state.isHeavyTraffic = false;
      }

      tray.setTitle(
        `${duration} | ${summary}${
          warnings && warnings.length > 0 ? `| ${warnings}` : ''
        }`
      );

      drawContextMenu();
    }
  );
}

function checkForAutomaticUnpause() {
  const isAutomaticUnpauseEnabled =
    config && config.automaticUnpause && config.automaticUnpause.enabled;

  if (!isAutomaticUnpauseEnabled) {
    return;
  }

  const settings = config.automaticUnpause;
  const currentDate = new Date();
  const thresholdTime = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    settings.hour,
    settings.minutes,
    0,
    0
  );

  if (
    currentDate >= thresholdTime &&
    currentDate <= thresholdTime.setMinutes(settings.minutes + 6)
  ) {
    const notification = new Notification({
      title: `It's past ${formatDate(thresholdTime)}...`,
      body: 'Would you like to start tracking?',
      actions: [
        {
          text: 'Yes please!',
          type: 'button'
        }
      ]
    });

    notification.show();
    notification.on('action', () => togglePause());
  }
}

function checkForAutomaticPause() {
  const isAutomaticPauseEnabled =
    config && config.automaticPause && config.automaticPause.enabled;

  if (!isAutomaticPauseEnabled) {
    return;
  }

  const settings = config.automaticPause;
  const currentDate = new Date();
  const thresholdTime = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    settings.hour,
    settings.minutes,
    0,
    0
  );

  if (currentDate >= thresholdTime) {
    !state.isPaused && togglePause();
  }
}

function isHeavyTraffic(durationWithoutTraffic, durationWithTraffic) {
  return durationWithTraffic > durationWithoutTraffic * 1.4;
}

function setIcon(iconType) {
  tray.setImage(path.join(__dirname, `/images/${iconType}.png`));
}

function formatDate(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const isAfternoon = hours >= 12;
  const hoursDisplay = isAfternoon ? hours - 12 : hours;
  const minutesDisplay = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${hoursDisplay}:${minutesDisplay}${isAfternoon ? 'PM' : 'AM'}`;
}
