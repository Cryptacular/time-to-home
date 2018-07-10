# Time to Home

This is a Mac menu bar app that shows time until you get home, based on Google Maps!

To run this, follow these instructions:

1.  `npm install`
2.  Create `config.json` that looks like the following:

```json
{
  "apiKey": "<API key from Google Cloud>",
  "destination": [<Latitude>, <Longitude>],
  "origin": [<Latitude>, <Longitude>]
}
```

3.  `npm start`

## To Do

- [ ] Animate loading icon
- [ ] Show different icon depending on heavy traffic
- [ ] Only show time & summary from 3.30pm onwards
  - [ ] Show transparent icon
