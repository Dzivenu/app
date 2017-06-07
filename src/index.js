
//React ,router and history
import React from "react";
import ReactDOM from "react-dom";
import { Router, Route, IndexRoute, browserHistory } from "react-router";

//Views
import Layout from "./Layout";
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
  <Router history={browserHistory}>
    <Route path="/" name="home" component={Home}></Route>
    <Route path="/home" name="home" component={Home}></Route>
    <Route path="/tools" name="tools" component={Tools}></Route>
    <Route path="/publisher" name="publisher" component={Publisher}></Route>
    <Route path="/url" name="url" component={Url}></Route>
    <Route path="/:username/" component={Home}></Route>
    <Route path="/*" component={Error}></Route>
  </Router>,
document.getElementById('app'));
