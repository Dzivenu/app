
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router, Route, Switch } from "react-router-dom";

// Config file
const config = require('./config.json');

//Views
import Index from "./views/Index";
import Home from "./views/Home";
import Tools from "./views/Tools";
import Publisher from "./views/Publisher";
import Error from "./views/Error";

// CSS Styles
require('../node_modules/bootstrap/dist/css/bootstrap.css');
require('../node_modules/font-awesome/css/font-awesome.css');
require('./css/all.css');

if (window.location.pathname.toString().match(/\B@[a-z0-9_-]+/g) && window.location.pathname.toString().match(/\B@[a-z0-9_-]+/g).length > 0){
  ReactDOM.render( <Home></Home> , document.getElementById('app'));
} else {
  switch (window.location.pathname) {
    case '/':
      ReactDOM.render( <Index></Index> , document.getElementById('app'));
    break;
    case '/publisher':
      ReactDOM.render( <Publisher></Publisher> , document.getElementById('app'));
    break;
    case '/tools':
      ReactDOM.render( <Tools></Tools> , document.getElementById('app'));
    break;
    default:
      ReactDOM.render( <Error></Error> , document.getElementById('app'));
  }
}
