
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router, Route, Switch } from "react-router-dom";

//Views
import Home from "./views/Home";
import Tools from "./views/Tools";
import Publisher from "./views/Publisher";
import Url from "./views/Url";
import Error from "./views/Error";

//CSS
require('../node_modules/bootstrap/dist/css/bootstrap.css');
require('../node_modules/font-awesome/css/font-awesome.css');
require('./css/all.css');

const ON_SERVER = true;

//Set router
if (ON_SERVER){

  if (window.location.pathname.toString().match(/\B@[a-z0-9_-]+/g) && window.location.pathname.toString().match(/\B@[a-z0-9_-]+/g).length > 0){
    ReactDOM.render( <Home></Home> , document.getElementById('app'));
  } else {
    switch (window.location.pathname) {
      case '/':
        ReactDOM.render( <Home></Home> , document.getElementById('app'));
      break;
      case '/publisher':
        ReactDOM.render( <Publisher></Publisher> , document.getElementById('app'));
      break;
      case '/url':
        ReactDOM.render( <Url></Url> , document.getElementById('app'));
      break;
      case '/tools':
        ReactDOM.render( <Tools></Tools> , document.getElementById('app'));
      break;
      default:
        ReactDOM.render( <Error></Error> , document.getElementById('app'));
    }
  }

} else {

  ReactDOM.render(
    <Router>
      <Switch>
        <Route exact path="/" name="home" component={Home}></Route>
        <Route exact path="/tools" name="tools" component={Tools}></Route>
        <Route exact path="/publisher" name="publisher" component={Publisher}></Route>
        <Route exact path="/url" name="url" component={Url}></Route>
        <Route name="home" component={Error}></Route>
      </Switch>
    </Router>,
  document.getElementById('app'));

}
