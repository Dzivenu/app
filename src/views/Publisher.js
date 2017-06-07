import React from 'react';

import steem from 'steem';
import moment from 'moment';
import http from 'http';
import _ from 'lodash';
import until from 'async/until';
import ReactModal from "react-modal";

import Dispatcher from "../Dispatcher";
import Store from "../Store";
import Loader from "../components/Loader";
import Message from "../components/Message";

const languages = require('../languages.json');
const config = require('../config.json');

var showdown  = require('showdown');
var Countable  = require('countable');
showdown.setFlavor('github');
showdown.setOption('parseImgDimensions', true);
showdown.setOption('simplifiedAutoLink', true);
showdown.setOption('tables', true);
showdown.setOption('tasklists', true);
showdown.setOption('ghMentionsLink', 'https://steemit.com/@{u}');
showdown.setOption('openLinksInNewWindow', true);

require('showdown-youtube');
var converter = new showdown.Converter({
  extensions: [
    'youtube',
    {
      type: 'lang',
      regex: /([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))/ig,
      replace: '<div class="row row-image text-center"><img src="$1" width="100%" height="auto"/></div>'
    },
    {
      type: 'lang',
      regex: /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g,
      replace: '<div class="row text-center"><iframe width="420" height="345" src="//player.vimeo.com/video/$1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div>'
    },
    {
      type: 'lang',
      regex: /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g,
      replace: '<div class="row text-center"><iframe width="420" height="345" src="http://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>'
    }
  ]
});

export default class Publisher extends React.Component {

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
        signerUsername: '',
        signerPostKey: '',
        title: '',
        tags: '',
        body: '',
        words: 0,
        minutesRead: 0,
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

    publishPost(){
      var self = this;
      self.setState({loading: true});

      var images = self.state.body.match(/([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))/ig) || [];
      var links = self.state.body.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/ig) || [];
      console.log(
        self.state.signerPostKey,
        "",
        (self.state.tags.split(" ").length > 0) ? self.state.tags.split(" ")[0] : self.state.tags,
        self.state.signerUsername,
        self.state.title.replace(/\W+/g,"-").toLowerCase(),
        self.state.title,
        self.state.body,
        JSON.stringify({
          "tags": (self.state.tags.split(" ").length > 0) ? self.state.tags.split(" ").splice(0,5) : [self.state.tags],
          "users": [self.state.signerUsername],
          "image": images,
          "links": links,
          "app":"steemblog/0.1",
          "format":"markdown"
        }))
      steem.broadcast.comment(
        self.state.signerPostKey,
        "",
        (self.state.tags.split(" ").length > 0) ? self.state.tags.split(" ")[0] : self.state.tags,
        self.state.signerUsername,
        self.state.title.replace(/\W+/g,"-").toLowerCase(),
        self.state.title,
        self.state.body,
        JSON.stringify({
          "tags": (self.state.tags.split(" ").length > 0) ? self.state.tags.split(" ").splice(0,5) : [self.state.tags],
          "users": [self.state.signerUsername],
          "image": images,
          "links": links,
          "app":"steemblog/0.1",
          "format":"markdown"
        }),
        function(err, result) {
          self.setState({loading: false, publishModal: false});
          console.log(err);
          if (err && err.payload.error.data.stack[0].format)
            self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
          else if (err)
            self._message.open('error', err.toString(), false);
          else
            self._message.open('success', 'Post published', true);;
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

      const publishModal =
        <ReactModal
          isOpen={this.state.publishModal}
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
          <span class="fa fa-2x fa-times pull-right" onClick={() => this.setState({publishModal: false})}></span>
          <h3>Publish Post</h3>
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
          <div class="col-xs-12 text-center">
            <div class="btn btn-default" onClick={() => self.publishPost()}> Publish </div>
          </div>
        </ReactModal>

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
        <div class="row">
          <div class="col-xs-3"></div>
          <div class="col-xs-6 text-center whiteBox">
            <h1><a href="/#/"><span class="fa fa-mail-reply pull-left"></span></a> SteemBlog Publisher </h1>
          </div>
        </div>;

      const post =
        <div class="row">
          <div class="col-xs-6">
            <div class="form-group">
              <label>Title</label>
              <input
                type="text"
                class="form-control"
                value={self.state.title}
                onChange={(event) => {
                  self.setState({ title: event.target.value });
                }}
                placeholder='Title'
              />
            </div>
            <div class="form-group">
              <label>Tags</label>
              <input
                type="text"
                class="form-control"
                value={self.state.tags}
                onChange={(event) => {
                  self.setState({ tags: event.target.value });
                }}
                placeholder='Tags, separated by spaces on lowecase'
              />
            </div>
            <div class="form-group">
              <label>Body</label>
              <textarea
                type="text"
                class="form-control"
                value={self.state.body}
                onChange={(event) => {
                  var s = event.target.value;
                	s = s.replace(/(^\s*)|(\s*$)/gi,"");
                	s = s.replace(/[ ]{2,}/gi," ");
                	s = s.replace(/\n /,"\n");
                  self.setState({body: event.target.value, words: s.split(' ').length, minutesRead: Math.round(s.split(' ').length/200)})
                }}
                style={{ resize: "none", width: "100%", height: "500px" }}
                placeholder='Body'
              />
            </div>
            <div class="col-xs-12 text-center">
              <div class="btn btn-default" onClick={() => self.setState({publishModal: true})}> Publish Post </div>
            </div>
          </div>
          <div class="col-xs-6 preview">
            <div class="row">
              <h2>{self.state.title}</h2>
            </div>
            <div class="row">
              <div class="col-xs-12">
                <h4>
                  {self.state.tags.split(' ').splice(0,5).map(function(tag, i){
                    return <span><span class="badge" key={i+"tag"}>{tag}</span><span> </span></span>;
                  })}
                  <span class="pull-right"> {self.state.words} Words - {self.state.minutesRead} Minutes Read </span>
                </h4>
              </div>
            </div>
            <hr></hr>
            <div id='post-preview' class="row preview" dangerouslySetInnerHTML={{"__html": converter.makeHtml(self.state.body)}}></div>
          </div>
        </div>;

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          :
            <div class="container-fluid">
              {publishModal}
              {header}
              <Message ref={(c) => self._message = c}/>
              <div class="whiteBox">
                {post}
              </div>
            </div>
            }
        </div>
      )
    }

}
