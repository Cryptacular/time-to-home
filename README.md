# Time to Home

This is a Mac menu bar app that shows time until you get home, based on Google Maps!

## Development

To run this, follow these instructions:

1.  `npm install`
2.  Create `config.json` that looks like the following:

```
{
  "apiKey": "<API key from Google Cloud>",
  "destination": [<Latitude>, <Longitude>],
  "origin": [<Latitude>, <Longitude>]
}
```

3.  `npm start`

## Build

1.  Follow steps 1 and 2 from the section above
2.  `npm run build:mac`
3.  Move the `Time To Home.app` file from `bin/Time To Home-darwin-x64` to your Applications folder
4.  Optional: Add the app to your dock, right click and select `Open at login`, then remove from dock

## To Do

- [x] Add "Quit" menu option
- [ ] Animate loading icon
- [ ] Show different icon depending on heavy traffic
- [ ] Allow pausing
  - [ ] Show transparent icon
