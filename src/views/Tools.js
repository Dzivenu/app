import React from 'react';

import steem from 'steem';
import moment from 'moment';
import http from 'http';
import _ from 'lodash';
import until from 'async/until';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";
import Message from "../components/Message";

const languages = require('../languages.json');
const config = require('../config.json');

export default class Tools extends React.Component {

    constructor() {
      super();
      function getParameter(paramName) {
        var searchString = window.location.hash.substring(8),
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
        signer: '',
        signerPostKey: '',
        author: getParameter('author') || '',
        permlink: getParameter('permlink') || '',
        voteWeight: 1000,
        username: '',
        password: '',
        keys: {},
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

    async generateKeys(){
      var self = this;
      self.setState({loading: true});
      var keys = steem.auth.getPrivateKeys(self.state.username.toLowerCase(), self.state.password, ['owner', 'active', 'posting', 'memo'])
      keys.available = (await steem.api.getAccounts([self.state.username.toLowerCase()])).length == 0;
      self.setState({keys: keys, loading: false});
      self._message.open('warning', 'Is not safe to use this keys unless you have a very strong password.', false);
    }

    registerNewUser(){
      // var self = this;
      // self.setState({loading: true});
      // steem.broadcast.accountCreate(wif, fee, creator, self.state.username.toLowerCase(), owner, active, posting, memoKey, jsonMetadata, function(err, result) {
      //   self.setState({loading: false});
      //   console.log(err);
      //   if (err && err.payload.error.data.stack[0].format)
      //     self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
      //   else if (err)
      //     self._message.open('error', err.toString(), false);
      //   else
      //     self._message.open('success', 'Account created', true);
      // });
    }

    votePost(){
      var self = this;
      self.setState({loading: true});
      steem.broadcast.vote(self.state.signerPostKey, self.state.signer, self.state.author, self.state.permlink, parseInt(self.state.voteWeight), function(err, result) {
        self.setState({loading: false});
        console.log(err);
        if (err && err.payload.error.message.indexOf('You have already voted in a similar way.') > 0)
          self._message.open('error', 'Vote already done', false);
        else if (err && err.payload.error.data.stack[0].format)
          self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
        else if (err)
          self._message.open('error', err.toString(), false);
        else
          self._message.open('success', 'Vote submitted', true);
      });
    }

    commentPost(){
      var self = this;
      self.setState({loading: true});
      steem.broadcast.comment(
        self.state.signerPostKey,
        self.state.author,
        self.state.permlink,
        self.state.username,
        self.state.permlink+"-"+moment().toISOString().replace(/[-:.]/g,"").toLowerCase(),
        "",
        self.state.comment,
        JSON.stringify({"app":"steemblog/0.6","format":"markdown+html","tags":[]}),
        function(err, result) {
          self.setState({loading: false});
          console.log(err);
          if (err && err.payload.error.data.stack[0].format)
            self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
          else if (err)
            self._message.open('error', err.toString(), false);
          else
            self._message.open('success', 'Comment submitted', true);;
      });
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
            <div class="col-xs-3"></div>
            <div class="col-xs-6 whiteBox">
              <Loader message={STRINGS.loading}/>
            </div>
          </div>
        </div>;

      const header =
        <div class="row whiteBox">
          <div class="col-xs-12 text-center">
            <h1><a href="/#/"><span class="fa fa-mail-reply pull-left"></span></a> SteemBlog Tools </h1>
          </div>
        </div>;

      const generator =
        <div class="row whiteBox">
          <div class="col-xs-12 text-center">
            <h2>
              Generate Keys
            </h2>
          </div>
          <div class="col-xs-6">
            <div class="form-group">
              <label>Username</label>
              <input
                type="text"
                class="form-control"
                value={self.state.username}
                onChange={(event) => {
                  self.setState({ username: event.target.value.toLowerCase() });
                }}
                placeholder='Username'
              />
            </div>
          </div>
          <div class="col-xs-6">
            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                class="form-control"
                value={self.state.password}
                onChange={(event) => {
                  self.setState({ password: event.target.value });
                }}
                placeholder='Password'
              />
            </div>
          </div>
          <div class="col-xs-12 text-center">
            <div class="btn btn-default" onClick={() => self.generateKeys()}> Generate </div>
          </div>
          {self.state.keys.owner ?
            <div class="col-xs-12 text-center">
              <h5><strong>Owner Private Key</strong> {self.state.keys.owner}</h5>
              <h5><strong>Owner Public Key</strong> {self.state.keys.ownerPubkey}</h5>
              <h5><strong>Posting Private Key</strong> {self.state.keys.posting}</h5>
              <h5><strong>Posting Public Key</strong> {self.state.keys.postingPubkey}</h5>
              <h5><strong>Active Private Key</strong> {self.state.keys.active}</h5>
              <h5><strong>Active Public Key</strong> {self.state.keys.activePubkey}</h5>
              <h5><strong>Memo Private Key</strong> {self.state.keys.memo}</h5>
              <h5><strong>Memo Public Key</strong> {self.state.keys.memoPubkey}</h5>
              { self.state.keys.available ?
                <h5><strong>Username available</strong></h5>
              : <h5><strong>Username already registered</strong></h5>
              }
              <div class="btn btn-default" onClick={() => self.setState({keys: {}})}> Close </div>
              <br></br>
              { self.state.keys.available ?
                <div class="btn btn-default" onClick={() => self.registerNewUser()}> Register Username </div>
              : <div></div>
              }
            </div>
          : <div></div>
          }
        </div>;

      const signer =
        <div class="row">
          <div class="col-xs-12 text-center">
            <h2>
              Signer Information
            </h2>
          </div>
          <div class="col-xs-4">
            <div class="form-group">
              <label>Signer Username</label>
              <input
                type="text"
                class="form-control"
                value={self.state.signer}
                onChange={(event) => {
                  self.setState({ signer: event.target.value });
                }}
                placeholder='Signer Username'
              />
            </div>
          </div>
          <div class="col-xs-8">
            <div class="form-group">
              <label>Signer Post Key</label>
              <input
                type="password"
                class="form-control"
                value={self.state.signerPostKey}
                onChange={(event) => {
                  self.setState({ signerPostKey: event.target.value });
                }}
                placeholder='Signer Post Key'
              />
            </div>
          </div>
        </div>;

      const post =
        <div class="row">
          <div class="col-xs-12 text-center">
            <h2> Post </h2>
          </div>
          <div class="col-xs-4">
            <div class="form-group">
              <label>Author</label>
              <input
                type="text"
                class="form-control"
                value={self.state.author}
                onChange={(event) => {
                  self.setState({ author: event.target.value });
                }}
                placeholder='Author'
              />
            </div>
          </div>
          <div class="col-xs-8">
            <div class="form-group">
              <label>Permlink</label>
              <input
                type="text"
                class="form-control"
                value={self.state.permlink}
                onChange={(event) => {
                  self.setState({ permlink: event.target.value });
                }}
                placeholder='Permlink'
              />
            </div>
          </div>
        </div>;

      const actions =
        <div class="row">
          <div class="col-xs-3">
            <h2> Vote </h2>
            <div class="form-group">
              <label>Vote Power</label>
              <input
                type="number"
                min="-10000"
                max="10000"
                step="1000"
                class="form-control"
                value={self.state.voteWeight}
                onChange={(event) => {
                  self.setState({ voteWeight: event.target.value });
                }}
              />
            </div>
            <div class="col-xs-12 text-center">
              <div class="btn btn-default" onClick={() => self.votePost()}> Vote </div>
            </div>
          </div>
          <div class="col-xs-9">
            <h2> Comment </h2>
            <div class="form-group">
              <label>Comment</label>
              <textarea
                type="text"
                class="form-control"
                value={self.state.comment}
                onChange={(event) => {
                  self.setState({ comment: event.target.value });
                }}
                style={{ resize: "none" }}
                placeholder='Comment'
              />
            </div>
            <div class="col-xs-12 text-center">
              <div class="btn btn-default" onClick={() => self.commentPost()}> Comment </div>
            </div>
          </div>
        </div>;

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          :
            <div class="container">
              {header}
              <Message ref={(c) => self._message = c}/>
              {generator}
              <div class="whiteBox">
                {signer}
                {post}
                {actions}
              </div>
            </div>
            }
        </div>
      )
    }

}
