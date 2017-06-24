import React from 'react';
import {Link} from "react-router";

import steem from 'steem';
import moment from 'moment';
import http from 'http';
import _ from 'lodash';
import until from 'async/until';

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";
import Message from "../components/Message";
import ReactSocial from "react-social";
import ReactModal from "react-modal";

const languages = require('../languages.json');
let config = require('../config.json');

export default class Home extends React.Component {

    constructor() {
      super();
      console.log('Config:',config);
      this.state = {
        loading: true,
        voteModal: false,
        blogs: [],
        strings: (Store.lang && Store.lang == 'es') ? languages.es : languages.en
      }

      // Set default background color on body
      document.getElementsByTagName('body')[0].style.backgroundColor = "#666";
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });
      console.log('Getting configs from:',config.usernameDirectory, config.permlinkDirectory);

      self.loadBlogs().then(function(blogs){
        self.setState({blogs: blogs, loading: false});
      });
    }

    loadBlogs(){
      var self = this;
      return new Promise(function(resolve, reject){
        steem.api.getContentReplies(config.usernameDirectory, config.permlinkDirectory, function(err, blogs) {
          if (err)
            console.error(err);
          else
            console.log('Configs:',blogs);
            blogs = _.filter(blogs, function(c, i){
              try {
                var metadata = JSON.parse(c.json_metadata);
                blogs[i].config = JSON.parse(c.body);
                return true;
              } catch (e) {
                return false;
              }
            });
            blogs = _.uniqBy(blogs.reverse(),'author');
            blogs = _.orderBy(blogs, ['net_votes'], ['desc'])
            console.log('Blogs:',blogs);
            resolve(blogs);
        });
      });
    }

    votePost(){
      var self = this;
      self.setState({loading: true});
      steem.broadcast.vote(
        self.state.signerPostKey,
        self.state.signerUsername,
        self.state.targetAuthor,
        self.state.targetPermlink,
        parseInt(self.state.voteWeight),
        function(err, result) {
          self.loadBlogs().then(function(blogs){
            self.setState({loading: false,blogs: blogs, voteModal: false});
            if (err && err.payload.error.message.indexOf('You have already voted in a similar way.') > 0)
              self._message.open('error', 'Vote already done', false);
            else if (err && err.payload.error.data.stack[0].format)
              self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
            else if (err)
              self._message.open('error', err.toString(), false);
            else
              self._message.open('success', 'Vote submitted', false);
          });
        }
      );
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

      const modalVote =
        <ReactModal
          isOpen={this.state.voteModal}
          style={{
            content : {
              top                   : '40%',
              left                  : '50%',
              right                 : 'auto',
              bottom                : 'auto',
              marginRight           : '-50%',
              transform             : 'translate(-50%, -50%)'
            }
          }}
        >
          <span class="fa fa-2x fa-times pull-right" onClick={() => this.setState({voteModal: false})}></span>
          <h3>Vote</h3>
          <div class="form-group">
            <label>Signer Post Key</label>
            <input
              type="password"
              class="form-control"
              value={self.state.signerPostKey}
              onChange={(event) => {
                self.setState({ signerPostKey: event.target.value });
              }}
              placeholder='Your Post Key'
            />
          </div>
          <div class="form-group">
            <label>Signer Username</label>
            <input
              type="text"
              class="form-control"
              value={self.state.signerUsername}
              onChange={(event) => {
                self.setState({ signerUsername: event.target.value });
              }}
              placeholder='Your Username'
            />
          </div>
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
        </ReactModal>

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
        <div class="row post whiteBox titlebox">
          <h1>
            SteemBlog Directory
          </h1>
        </div>;

      const sidebar =
        <div class="hidden-xs col-sm-3 sidebar">
          <div class="whiteBox margin-top text-center">
            <h3><a href="/publisher">Publisher</a></h3>
            <h3><a href="/tools">Tools</a></h3>
          </div>
        </div>;

      const blogs =
        <div>
          {self.state.blogs.map(function(blog,i){
            return (
              <div class="row post whiteBox">
                <h2>
                  <a class="titleLink" href={'/@'+blog.author}>{blog.config.blogName} </a>
                  <span>
                    { blog.net_votes}
                    <a onClick={() => self.setState({voteModal: true, targetAuthor: blog.author, targetPermlink: blog.permlink, voteWeight: 10000})} class="fa fa-arrow-up titleLink"></a>
                  </span>
                  { blog.config.facebookLink ? <a href={blog.config.facebookLink} target="_blank" class="fa fa-facebook iconTitle pull-right"></a> : <a/>}
                  { blog.config.twitterLink ? <a href={blog.config.twitterLink} target="_blank" class="fa fa-twitter iconTitle pull-right"></a> : <a/>}
                  { blog.config.linkedinLink ? <a href={blog.config.linkedinLink} target="_blank" class="fa fa-linkedin iconTitle pull-right"></a> : <a/>}
                  { blog.config.githubLink ? <a href={blog.config.githubLink} target="_blank" class="fa fa-github iconTitle pull-right"></a> : <a/>}
                </h2>
                <h4 style={{margin: '10px 0px'}}>{blog.config.blogDescription}</h4>
              </div>
            );
          })}
        </div>;

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          :
            <div class="container">
              {modalVote}
              <div class="row">
                <div class="col-xs-12 col-sm-9">
                  {header}
                  <Message ref={(c) => self._message = c}/>
                  {blogs}
                </div>
                {sidebar}
              </div>
            </div>
            }
        </div>
      )
    }

}
