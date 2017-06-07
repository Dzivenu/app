
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


//Set router
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
