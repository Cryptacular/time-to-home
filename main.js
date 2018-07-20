const { app, Menu, Tray } = require("electron");
const config = require("./config");
const path = require("path");
const googleMapsClient = require("@google/maps").createClient({
  key: config.apiKey
});

const { destinations } = config;

let state = {
  currentOrigin: 1,
  currentDestination: 0,
  info: null,
  error: null
};

let tray = null;

app.dock.hide();

app.on("ready", () => {
  tray = new Tray(path.join(__dirname, "/images/icon.png"));

  drawContextMenu();

  fetchDirections();

  setTimeout(() => {
    fetchDirections();
  }, 5 * 60 * 1000);
});

function getAllOrigins() {
  return destinations.map(d => {
    return {
      label: d.name,
      type: "radio",
      checked: state.currentOrigin === d.id,
      enabled: state.currentDestination !== d.id,
      click: () => changeOrigin(d.id)
    };
  });
}

function getAllDestinations() {
  return destinations.map(d => {
    return {
      label: d.name,
      type: "radio",
      checked: state.currentDestination === d.id,
      enabled: state.currentOrigin !== d.id,
      click: () => changeDestination(d.id)
    };
  });
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
  return { type: "separator" };
}

function drawContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    ...getInfo(),
    ...getAllOrigins(),
    getSeparator(),
    ...getAllDestinations(),
    getSeparator(),
    { label: "Swap", click: () => swapOriginAndDestination() },
    { label: "Refresh", click: () => fetchDirections() },
    { label: "Quit", click: () => app.quit() }
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

function fetchDirections() {
  state.error = null;
  state.info = `Fetching... (${new Date()})`;
  tray.setTitle("Loading...");

  googleMapsClient.directions(
    {
      origin: getOrigin(),
      destination: getDestination(),
      departure_time: new Date(Date.now()),
      traffic_model: "best_guess"
    },
    (err, response) => {
      if (err) {
        state.info = null;
        state.error = err && err.code;
        tray.setTitle("Error...");
        drawContextMenu();
        return;
      }

      state.info = `Last updated at ${formatDate(new Date())}`;

      const duration = response.json.routes[0].legs[0].duration_in_traffic.text;
      const summary = response.json.routes[0].summary;
      tray.setTitle(`${duration} | ${summary}`);
      drawContextMenu();
    }
  );
}

function formatDate(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${hours}:${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}
