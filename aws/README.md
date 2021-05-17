# Kloaka - AWS Backend

Backend section of Kloaka.

All the `GET` endpoints are exposed publicly.
We have two type of API Gateway endpoints:
* API REST
  * `/device/{id}` -> Return informations about a single device
  * `/device/scan` -> Return informations about all devices
  * `/problem/{id}` -> Return informations about a single problem
  * `/problem/scan` -> Return informations about all problems
* WEBSOCKET API
  * `$connect` -> Connect to WebSocket API
  * `$disconnect`-> Disconnect from WebSocket API

At the moment there aren't `POST`, `REMOVE` or `PUT` endpoints, so there is no type of protection on the API endpoints

- WEBSOCKET ENDPOINT: `wss://0o7o4txyea.execute-api.us-east-1.amazonaws.com/dev
`
- API REST ENDPOINT: `https://mo6thqx9bj.execute-api.us-east-1.amazonaws.com`