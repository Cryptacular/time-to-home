const { app, Menu, Tray } = require("electron");
const config = require("./config");
const path = require("path");
const googleMapsClient = require("@google/maps").createClient({
  key: config.apiKey
});

const { origin, destination } = config;

let tray = null;

app.dock.hide();

app.on("ready", () => {
  tray = new Tray(path.join(__dirname, "/images/icon.png"));
  tray.setTitle("Loading...");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);

  fetchDirections();

  setTimeout(() => {
    fetchDirections();
  }, 5 * 60 * 1000);
});

function fetchDirections() {
  if (new Date().getHours() < 15) {
    tray.setTitle("");
    return;
  }

  googleMapsClient.directions(
    {
      origin,
      destination,
      departure_time: new Date(Date.now()),
      traffic_model: "best_guess"
    },
    (err, response) => {
      if (err) {
        return;
      }

      const duration = response.json.routes[0].legs[0].duration_in_traffic.text;
      const summary = response.json.routes[0].summary;
      tray.setTitle(`${duration} | ${summary}`);
    }
  );
}
