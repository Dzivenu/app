import React from 'react';
import {Link} from "react-router-dom";

import steem from 'steem';
import moment from 'moment';
import http from 'http';
import _ from 'lodash';
import until from 'async/until';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";

const languages = require('../languages.json');
const config = require('../config.json');

export default class GetURL extends React.Component {

    constructor() {
      super();
      function getParameter(paramName) {
        var searchString = window.location.hash.substring(3),
        i, val, params = searchString.split("&");

        for (i=0;i<params.length;i++) {
          val = params[i].split("=");
          if (val[0] == paramName) {
            return val[1].replace('%20', ' ');
          }
        }
        return null;
      }

      this.state = {
        loading: true,
        username: '',
        fb: '',
        title: '',
        linkedin: '',
        twitter: '',
        github: '',
        resteem: false,
        url: 'Username Required',
        strings: (Store.lang && Store.lang == 'es') ? languages.es : languages.en
      }
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });

      self.setState({loading: false});

    }

    generateUrl(username, title, fb, twitter, linkedin, github, resteem){
      var baseURL = 'Username Required';
      if (username.length > 0){
        baseURL = 'http://'+window.location.host+'/#/';
        baseURL += '?user='+username;
        if (title.length > 0){
          baseURL += '&title='+title;
        }
        if (fb.length > 0){
          baseURL += '&fb='+fb;
        }
        if (twitter.length > 0){
          baseURL += '&twitter='+twitter;
        }
        if (linkedin.length > 0){
          baseURL += '&linkedin='+linkedin;
        }
        if (github.length > 0){
          baseURL += '&github='+github;
        }
        if (resteem){
          baseURL += '&r=1';
        }
      }
      this.setState({url : baseURL});
    }

    changeLanguage(lang){
      Dispatcher.dispatch({
    		"type": "SET_LANGUAGE",
    		"lang": lang
    	});
    }

    render() {
      var self = this;

      const STRINGS = this.state.strings;

      const loader =
        <div class="container">
          <div class="row text-center">
            <div class="col-xs-3"/>
            <div class="col-xs-6 whiteBox">
              <Loader message={STRINGS.loading}/>
            </div>
          </div>
        </div>;

      const header =
        <div class="row whiteBox">
          <div class="col-xs-12 text-center">
            <h1><a href="/#/"><span class="fa fa-mail-reply pull-left"></span></a> SteemBlog URL </h1>
          </div>
        </div>;

      const values =
        <div class="row post whiteBox titlebox">
          <div class="col-xs-12 text-center">
            <h2>
              User Information
            </h2>
          </div>

          <div class="col-xs-12 text-center">
            <form class="form-inline">
              <div class="form-group">
                <label>Username</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.username}
                  onChange={(event) => {
                    self.setState({ username: event.target.value });
                    self.generateUrl(event.target.value, self.state.title, self.state.fb, self.state.twitter, self.state.linkedin, self.state.github, self.state.resteem);
                  }}
                  placeholder={'Username'}
                />
              </div>
              <div class="form-group">
                <label>Title</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.title}
                  onChange={(event) => {
                    self.setState({ title: event.target.value });
                    self.generateUrl(self.state.username, event.target.value, self.state.fb, self.state.twitter, self.state.linkedin, self.state.github, self.state.resteem);
                  }}
                  placeholder={'Title'}
                />
              </div>
              <div class="checkbox">
                <label>
                  <input
                    type="checkbox"
                    value={self.state.resteem}
                    onChange={(event) => {
                      self.setState({ resteem: event.target.checked });
                      self.generateUrl(self.state.username, self.state.title, self.state.fb, self.state.twitter, self.state.linkedin, self.state.github, event.target.checked);
                    }}
                  /> Show Resteem
                </label>
              </div>
            </form>
          </div>

          <div class="col-xs-12 text-center">
            <form class="form-inline">
              <div class="form-group">
                <label>Facebook</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.fb}
                  onChange={(event) => {
                    self.setState({ fb: event.target.value });
                    self.generateUrl(self.state.username, self.state.title, event.target.value, self.state.twitter, self.state.linkedin, self.state.github, self.state.resteem);
                  }}
                  placeholder={'Facebook URL'}
                />
              </div>
              <div class="form-group">
                <label>Twitter</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.twitter}
                  onChange={(event) => {
                    self.setState({ twitter: event.target.value });
                    self.generateUrl(self.state.username, self.state.title, self.state.fb, event.target.value, self.state.linkedin, self.state.github, self.state.resteem);
                  }}
                  placeholder={'Twitter URL'}
                />
              </div>
              <div class="form-group">
                <label>Github</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.github}
                  onChange={(event) => {
                    self.setState({ github: event.target.value });
                    self.generateUrl(self.state.username, self.state.title, self.state.fb, self.state.twitter, self.state.linkedin, event.target.value, self.state.resteem);
                  }}
                  placeholder={'Github URL'}
                />
              </div>
              <div class="form-group">
                <label>Linkedin</label>
                <input
                  type="text"
                  class="form-control"
                  value={self.state.linkedin}
                  onChange={(event) => {
                    self.setState({ linkedin: event.target.value });
                    self.generateUrl(self.state.username, self.state.title, self.state.fb, self.state.twitter, event.target.value, self.state.github);
                  }}
                  placeholder={'Linkedin URL'}
                />
              </div>
            </form>
          </div>
          <div class="col-xs-12 text-center">
            <div class="btn btn-default" onClick={() => self.setState({
              username: '',
              fb: '',
              title: '',
              linkedin: '',
              twitter: '',
              github: '',
              url: ''
              })}
            > Clear </div>
          </div>
        </div>;

        const url =
          <div class="row post whiteBox titlebox">
            <div class="col-xs-12 text-center">
              <h2>
                {self.state.url != 'Username Required' ?
                  <a href={self.state.url} target="_blank">{self.state.url}</a>
                : <div>Username Required</div>
                }
              </h2>
            </div>

          </div>;

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          :
            <div class="container">
              {header}
              {values}
              {url}
            </div>
            }
        </div>
      )
    }

}
