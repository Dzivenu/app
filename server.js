// server/app.js
const express = require('express');
const path = require('path');

const app = express();

// Serve static assets
if (process.argv.indexOf('--dev') >= 0){
  console.log('Using dev version');
  app.use(express.static(path.resolve(__dirname+'/src')));
} else {
  console.log('Using prod version');
  app.use(express.static(path.resolve(__dirname+'/build')));
}

// Always return the main index.html, so react-router render the route in the client
app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/home', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/tools', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/publisher', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/url', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/:username', (req, res) => { res.sendFile(path.resolve(__dirname+'/build/index.html')); });
app.get('/*', (req, res) => { res.sendFile(path.resolve(__dirname+'/build')); });

app.listen(8080, () => {
  console.log(`App listening on port 8080!`);
});
