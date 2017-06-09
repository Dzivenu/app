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

import SteemActions from "../actions/Steem"

var TwitterButton = ReactSocial.TwitterButton;
var FacebookButton = ReactSocial.FacebookButton;

const languages = require('../languages.json');
let config = require('../config.json');

const ON_SERVER = true;

var searchParams = {};

var showdown  = require('showdown');
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
    },
    {
      type: 'lang',
      regex: /\!\[][(][)]/g,
      replace: ''
    }
  ]
});

export default class Home extends React.Component {

    constructor() {
      super();
      function getParameter(paramName) {
        var searchString = ON_SERVER ? window.location.search.replace('#','').substring(1) : window.location.hash.substring(3),
        i, val, params = searchString.split("&");

        for (i = 0; i < params.length; i ++) {
          val = params[i].split("=");
          if (val[0] == paramName) {
            return val[1].replace(/%20/g, ' ');
          }
        }
        return null;
      }

      function getSearchParams() {
        var searchString = ON_SERVER ? window.location.search.replace('#','').substring(1) : window.location.hash.substring(3),
        i, val, params = searchString.split("&");
        var toReturn = {};
        for (i = 0; i < params.length; i ++) {
          val = params[i].split("=");
          if (val[1])
            toReturn[val[0]] = val[1].replace(/%20/g, ' ');
        }
        return toReturn;
      }

      searchParams = getSearchParams();
      console.log('Serach parameters',searchParams);

      if (ON_SERVER){

        config = {
          "blogTitle": "",
          "facebookLink": "",
          "twitterLink": "",
          "linkedinLink": "",
          "githubLink": "",
          "showResteem": false,
          "steem": {
            "username": ""
          }
        }

        if (window.location.pathname.indexOf('@') == 1)
          config.steem.username = window.location.pathname.substring(2);

        config.blogTitle = searchParams.title || '@'+config.steem.username+' SteemBlog';
        config.facebookLink = searchParams.fb || '';
        config.twitterLink = searchParams.twitter || '';
        config.linkedinLink = searchParams.linkedin || '';
        config.githubLink = searchParams.github || '';
        config.showResteem = (searchParams.r) ? true : false;

      }
      console.log('Config:',config);

      this.state = {
        loading: true,
        postID: getParameter('id') || '',
        page: getParameter('page') || 1,
        category: getParameter('cat') || 'all',
        month: getParameter('month') || 'all',
        info: {},
        posts: [],
        allPosts: [],
        months: [],
        categories: [],
        nodeInfo: {},
        profile: {},
        error: false,
        voteModal: false,
        signerPostKey: "",
        signerUsername: "",
        targetAuthor: "",
        targetPermlink: "",
        comment: "",
        voteWeight: 10000,
        follow: {follower_count: 0, following_count: 0},
        strings: (Store.lang && Store.lang == 'es') ? languages.es : languages.en
      }
    }

    componentWillMount(){
      var self = this;

      Store.on("languageChanged", function(){
        self.setState({strings: languages[Store.lang]});
      });

      if (config.steem.username == '')
        self.setState({loading: false, error: true});
      else
        self.loadData().then(function([profile, follow, history]){
          self.setState({allPosts: history.posts, months: history.months, categories: history.categories, profile: profile, follow: follow});
          if (self.state.postID.length > 0)
            self.loadPost(self.state.postID);
          else
            self.loadPosts(self.state.page, self.state.category, self.state.month);
        });

    }

    buildSearchParams(params){
      console.log(window.location)
      const keys = Object.keys(params);
      let search = '';
      if (keys.length > 0){
        if (params[keys[0]])
          search += '?'+keys[0]+'='+params[keys[0]];
        for (var i = 1; i < keys.length; i++) {
          if ((params[keys[i]]) && (search.length == 0))
            search += '?'+keys[i]+'='+params[keys[i]];
          else if (params[keys[i]])
            search += '&'+keys[i]+'='+params[keys[i]];
        }
      }
      console.log(params);
      if (ON_SERVER){
        window.location.search = search;
      } else {
        window.location.hash = search;

        if (params.id){
          this.loadPost(params.id);
        } else {
          this.loadPosts(params.page || 1, params.cat || 'all', params.month || 'all');
        }
      }
    }

    loadData(){
      var self = this;
      var postsPermLinks = [];
      var posts = [];
      var categories = [];

      function getHistory(username){
        console.log('Getting posts of',username);
        return new Promise(function(resolve, reject){
          var history = [];
          var fromPost = -1;
          until( function() {
            return (fromPost == 0);
          }, function(callback){
            steem.api.getAccountHistory(config.steem.username, fromPost, (fromPost < 10000 && fromPost > 0) ? fromPost : 10000, function(err, toAdd) {
              if (err)
                callback(err);
              history.push(toAdd);
              fromPost = toAdd[0][0];
              callback(null);
            })
          }, function(err){

            if (err)
              console.error('Error getting all history:',err);

            history = _.flatten(history);
            history = _.orderBy(history, function(h){ return h[0]});
            history = _.uniqBy(history, '0');

            console.log('Account',username,'history:',history);

            for (var i = 0; i < history.length; i++) {
              if ((history[i][1].op[0] == 'comment')
                && (history[i][1].op[1].parent_author == "")
                && (history[i][1].op[1].author == username)
              ) {
                  var cats = JSON.parse(history[i][1].op[1].json_metadata).tags;
                  // Capitalize first letter

                  if (Array.isArray(cats) && typeof cats[0] == 'string')
                    cats.forEach(function(tag, i){
                      if (tag)
                        cats[i] = tag.charAt(0).toUpperCase() + tag.slice(1);
                    });
                  else
                    cats = [cats];
                  if ( _.findIndex(posts, {permlink: history[i][1].op[1].permlink }) >= 0){
                    posts[_.findIndex(posts, {permlink: history[i][1].op[1].permlink })] = {
                      permlink: history[i][1].op[1].permlink,
                      categories: cats,
                      created: history[i][1].timestamp,
                      resteem: false
                    };
                  } else {
                    posts.push({
                      permlink: history[i][1].op[1].permlink,
                      categories: cats,
                      created: history[i][1].timestamp,
                      resteem: false
                    })
                  }

                }

              if ( config.showResteem
                && (history[i][1].op[0] == 'custom_json')
                && (history[i][1].op[1].id == "follow")
                && (history[i][1].op[1].json.indexOf("reblog") > 0)
                && ( _.findIndex(posts, {permlink: history[i][1].op[1].permlink }) < 0)
              ) {
                  var parsed = JSON.parse(history[i][1].op[1].json);
                  posts.push({
                    permlink: parsed[1].permlink,
                    author: parsed[1].author,
                    categories: [],
                    date: new Date(),
                    resteem: true
                  })
                }
            }

            // Remove tests posts and reverse array to order by date
            const myPosts = _.filter(posts, function(o) { return ((o.categories.indexOf('Test') < 0)&&(!o.resteem)); }).reverse();
            posts = _.filter(posts, function(o) { return (o.categories.indexOf('Test') < 0) }).reverse();

            console.log('All account posts',posts);

            // Get all categories
            var categories = [];
            for (var i = 0; i < myPosts.length; i++)
              for (var z = 0; z < myPosts[i].categories.length; z++)
                if (!_.find(categories, {name : myPosts[i].categories[z]}))
                  categories.push({name: myPosts[i].categories[z], quantity: 1});
                else
                  _.find(categories, {name : myPosts[i].categories[z]}).quantity ++;

            categories = _.orderBy(categories, ['quantity', 'name'] , ['desc', 'asc']);

            // Get all months
            var months = [];
            for (var i = 0; i < myPosts.length; i++) {
              var month = new Date(myPosts[i].created).getMonth()+1;
              var year = new Date(myPosts[i].created).getFullYear();
              if (!_.find(months, {month : month, year: year}))
                months.push({month : month, year: year, quantity: 1});
              else
                _.find(months, {month : month, year: year}).quantity ++;
            }

            resolve({posts: posts, categories: categories, months: months});
          })
        });
      }

      function getAccount(account){
        console.log('Getting accounts',account);
        return new Promise(function(resolve, reject){
          steem.api.getAccounts([account], function(err, accounts) {
            if (err)
              reject(err);
            else{
              var profile = {};
              console.log('Account',config.steem.username,'data:',accounts[0]);
              console.log('Account',config.steem.username,'profile:', JSON.parse(accounts[0].json_metadata));
              profile = JSON.parse(accounts[0].json_metadata).profile;
              profile.reputation = steem.formatter.reputation(accounts[0].reputation);
              resolve(profile);
            }
          })
        });
      }

      function getFollow(account){
        console.log('Getting follow from',account);
        return new Promise(function(resolve, reject){
          steem.api.getFollowCount(account, function(err, follow) {
            if (err)
              reject(err);
            else{
              console.log('Follow', follow);
              resolve(follow);
            }
          })
        });
      }

      return Promise.all([
        getAccount(config.steem.username),
        getFollow(config.steem.username),
        getHistory(config.steem.username)
      ]);
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
          self.setState({loading: false, voteModal: false});
          if (err && err.payload.error.message.indexOf('You have already voted in a similar way.') > 0)
            self._message.open('error', 'Vote already done', false);
          else if (err && err.payload.error.data.stack[0].format)
            self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
          else if (err)
            self._message.open('error', err.toString(), false);
          else
            self._message.open('success', 'Vote submitted', false);
        }
      );
    }

    commentPost(){
      var self = this;
      self.setState({loading: true});
      steem.broadcast.comment(
        self.state.signerPostKey,
        self.state.targetAuthor,
        self.state.targetPermlink,
        self.state.signerUsername,
        self.state.targetPermlink+"-"+moment().toISOString().replace(/[-:.]/g,"").toLowerCase(),
        "",
        self.state.comment,
        JSON.stringify({"app":"steemblog/0.6","format":"markdown+html","tags":[]}),
        function(err, result) {
          self.setState({loading: false, commentModal: false});
          if (err && err.payload.error.data.stack[0].format)
            self._message.open('error', err.payload.error.data.stack[0].format.toString(), false);
          else if (err)
            self._message.open('error', err.toString(), false);
          else
            self._message.open('success', 'Comment submitted', false);;
      });
    }

    async loadPost(id){
      var self = this;
      self.setState({loading: true});
      console.log(searchParams);
      if (!searchParams.id || (searchParams.id && searchParams.id != id)){
        searchParams.id = id;
        self.buildSearchParams(searchParams);
      }

      var posts = this.state.allPosts;

      var firstReplies = await steem.api.getContentReplies(config.steem.username, id)

      async function getChildrenReplies(replies){
        replies = Promise.all(replies.map(async function(reply, i) {
          if (reply.children > 0)
            reply.replies = await getChildrenReplies( await steem.api.getContentReplies(reply.author, reply.permlink) );
          return reply;
        }));
        return await replies;
      }

      var post = await steem.api.getContent(config.steem.username, id)
      post.replies = await getChildrenReplies(firstReplies);
      post = _.merge(posts[ _.findIndex(posts, {permlink: post.permlink }) ], post);
      self.setState({postID: id, page: 1, category: 'all', month: 'all', posts: [post], loading: false});

    }

    goToPost(post){
      searchParams.id = post;
      searchParams.cat = null;
      searchParams.month = null;
      searchParams.page = null;
      this.buildSearchParams(searchParams);
    }

    goTo(page, category, month){
      searchParams.page = page;
      searchParams.cat = category;
      searchParams.month = month;
      searchParams.id = null;
      this.buildSearchParams(searchParams);
    }

    loadPosts(page, category, month){
      var self = this;
      var posts = self.state.allPosts;

      self.setState({loading: true});

      if (!config.showResteem)
        posts = _.filter(posts, function(o) { return !o.resteem });

      // Filter by category
      if (category && category != 'all'){
        posts = _.filter(posts, function(o) { return o.categories.indexOf(category.charAt(0).toUpperCase()+category.slice(1)) > -1 });
      }

      // Filer by month
      if (category && month != 'all'){
        posts = _.filter(posts, function(o) {
          return (new Date(o.created).getMonth()+1 == month.split('/')[1]) && (new Date(o.created).getFullYear() == month.split('/')[0])
        });
      }
      if (page)
        posts = posts.slice( (page-1)*10, (page)*10);

      // Get all posts content
      Promise.all(posts.map( function(post, index){
        return new Promise(function(resolvePost, rejectPost){
          if (config.showResteem && post.resteem){
            steem.api.getContent(post.author, post.permlink, function(err, post) {
              if (err)
                rejectPost(err);
              else{
                post.resteem = true;
                resolvePost(post);
              }
            });
          } else {
            steem.api.getContent(config.steem.username, post.permlink, function(err, post) {
              if (err)
                rejectPost(err);
              else
                resolvePost(post);
            });
          }
        })
      })).then(function(postsContent){

        // Convert video in all posts
        postsContent.map(function(post, i){
          post = _.merge(posts[i], post);
        });
        console.log('Posts to show:', posts);

        self.setState({postID: '', page: page, category: category, month: month, posts: posts, loading: false});
      }).catch(function(err){
        console.error(err);
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

      const modalComment =
        <ReactModal
          isOpen={this.state.commentModal}
          style={{
            content : {
              top                   : '40%',
              left                  : '50%',
              right                 : 'auto',
              bottom                : 'auto',
              marginRight           : '-50%',
              maxHeight             : '500px',
              transform             : 'translate(-50%, -50%)'
            }
          }}
        >
          <span class="fa fa-2x fa-times pull-right" onClick={() => this.setState({commentModal: false})}></span>
          <h3>Comment</h3>
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
            <label>Comment</label>
            <textarea
              type="text"
              class="form-control"
              value={self.state.comment}
              onChange={(event) => {
                self.setState({ comment: event.target.value });
              }}
              style={{ resize: "none", width: "400px", height:"150px" }}
              placeholder='Comment'
            />
          </div>
          <div class="col-xs-12 text-center">
            <div class="btn btn-default" onClick={() => self.commentPost()}> Comment </div>
          </div>
        </ReactModal>

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

      const error =
        <div class="container">
          <div class="row text-center">
            <div class="col-xs-12 whiteBox">
              <br></br>
              <h2>Invalid URL parameters.</h2>
              <h2>Go to <a href={ON_SERVER ? '/url' : '/#/url'}>URL Generator</a> to generate your blog url.</h2>
              <br></br>
              <h2>Go to <a href={ON_SERVER ? '/publisher' : '/#/publisher'}>SteemBlog Publisher</a> to publish new posts.</h2>
              <br></br>
            </div>
          </div>
        </div>;

      const header =
        <div class="row post whiteBox titlebox">
          <h1>
            <a class="titleLink" onClick={() => self.goTo(1, 'all', 'all')}>
              {config.blogTitle}
            </a>
            <a href={"https://steemit.com/@"+config.steem.username} target="_blank" class="fa iconTitle pull-right">
              <div class="steemit-icon-big" ></div>
            </a>
            { config.facebookLink ? <a href={config.facebookLink} target="_blank" class="fa fa-facebook iconTitle pull-right"></a> : <a/>}
            { config.twitterLink ? <a href={config.twitterLink} target="_blank" class="fa fa-twitter iconTitle pull-right"></a> : <a/>}
            { config.linkedinLink ? <a href={config.linkedinLink} target="_blank" class="fa fa-linkedin iconTitle pull-right"></a> : <a/>}
            { config.githubLink ? <a href={config.githubLink} target="_blank" class="fa fa-github iconTitle pull-right"></a> : <a/>}
          </h1>
        </div>;

      const sidebar =
        <div class="hidden-xs col-sm-3 sidebar">
          <div class="whiteBox margin-top text-center">
            <h3 class="no-margin margin-bottom">{STRINGS.about}</h3>
            <h4>{self.state.profile.about}</h4>
            <h4>{self.state.profile.reputation} Reputation</h4>
            <h4>{self.state.allPosts.length} Posts</h4>
            <h4>{self.state.follow.follower_count} Followers</h4>
            <h4>{self.state.follow.following_count} Following</h4>
          </div>
          <div class="whiteBox margin-top text-center">
            <h3 class="no-margin margin-bottom">{STRINGS.languages}</h3>
            <h5><a onClick={()=>self.changeLanguage('es')}>{STRINGS.spanish}</a></h5>
            <h5><a onClick={()=>self.changeLanguage('en')}>{STRINGS.english}</a></h5>
          </div>
          <div class="whiteBox margin-top text-center">
            <h3 class="no-margin margin-bottom">{STRINGS.categories}</h3>
            {self.state.categories.map( function(cat, index){
              return(<h5 key={index}><a onClick={() => self.goTo(1, cat.name, 'all')}>{cat.name} ({cat.quantity})</a></h5>)
            })}
          </div>
          <div class="whiteBox margin-top text-center">
            <h3 class="no-margin margin-bottom">{STRINGS.archives}</h3>
            {self.state.months.map( function(month, index){
              return(<h5 key={index}><a onClick={() => self.goTo(1, 'all', month.year+'/'+month.month)}>{month.year} / {month.month} ({month.quantity})</a></h5>)
            })}
          </div>
        </div>;

      const paginator =
        <nav>
          <ul class="pager text-center">
            {parseInt(self.state.page) > 1 ?
              <li class="pull-left">
                <a onClick={ ()=> self.goTo(parseInt(self.state.page)-1, self.state.category, self.state.month)}>
                  {STRINGS.previous}
                </a>
              </li>
            : <li/>
            }
            <li class="text-center"><a>{STRINGS.page} {self.state.page}</a></li>
            { (self.state.posts.length == 10) ?
              <li class="pull-right">
                <a onClick={ ()=> self.goTo(parseInt(self.state.page)+1, self.state.category, self.state.month)}>
                  {STRINGS.next}
                </a>
              </li>
              : <li/>
            }
          </ul>
        </nav>;

      function renderPostLong(post){
        function renderChildrenReplies(replies){
          return replies.map(function(reply, i) {
            return (
              <div key={"reply"+reply.depth+i} style={{marginLeft:(reply.depth-1)*20}}>
                <div class="row comment whiteBox" >
                  <div class="col-xs-12">
                    <strong>@{reply.author}</strong> - {moment(reply.time).format('MMMM Do YYYY, h:mm:ss a')}
                    <a class="pull-right" onClick={() => self.setState({commentModal: true, targetAuthor: reply.author, targetPermlink: reply.permlink})}>
                      <span class="fa fa-mail-reply"></span>
                    </a>
                    <h4 dangerouslySetInnerHTML={{"__html": converter.makeHtml(reply.body)}} ></h4>
                  </div>
                </div>
                <div>
                  {(reply.children > 0) ? <div>
                  {  renderChildrenReplies(reply.replies) }
                  </div> : <div></div>}
                </div>
              </div>
            )
          })
        }

        return (
          <div key='singlePost'>
            <div class="row post whiteBox" >
              <div class="col-xs-12">
                <h2>{post.title}</h2>
                <h4>{STRINGS.posted} {post.created} {STRINGS.in} {post.category.charAt(0).toUpperCase() + post.category.slice(1)}</h4>
              </div>
              <div class="col-xs-12 bodyPost" dangerouslySetInnerHTML={{"__html": converter.makeHtml(post.body)}} ></div>
              <div class="col-xs-12 text-center margin-top">
                <TwitterButton title="Share via Twitter"
                  message={post.title}
                  url={'/?id='+post.permlink} element="a" className=""
                >
                  Share <span className="fa fa-twitter"/>
                </TwitterButton>
              </div>
              <div class="row">
                <div class="col-xs-3 text-center">
                  <a onClick={() => self.goTo(1, 'all', 'all')}><h3><span class="fa fa-arrow-left"></span> {STRINGS.goBack}</h3></a>
                </div>
                <div class="col-xs-3 text-center">
                  <h3>
                    <a onClick={() => self.setState({voteModal: true, targetAuthor: post.author, targetPermlink: post.permlink, voteWeight: 10000})}>
                      <span class="fa fa-thumbs-up"></span> {post.net_votes}
                     </a>
                  </h3>
                </div>
                <div class="col-xs-3 text-center">
                  <h3>
                    <a onClick={() => self.setState({commentModal: true, targetAuthor: post.author, targetPermlink: post.permlink})}>
                      {post.children} <span class="fa fa-comments"></span>
                    </a>
                  </h3>
                </div>
                <div class="col-xs-3 text-center">
                  <a href={"https://steemit.com/@"+config.steem.username+"/"+post.permlink}>
                    <h3>{STRINGS.on} Steemit <div class="steemit-icon-small pull-right"></div></h3>
                  </a>
                </div>
              </div>
            </div>
            <div>
            {renderChildrenReplies(post.replies)}
            </div>
          </div>
        )
      }

      function renderPostShort(post, index){
        var span= document.createElement('span');
        span.innerHTML = converter.makeHtml(post.body);
        var text = span.textContent || span.innerText;
        return (
          <div key={'post'+index}>
            <div class="row post whiteBox" >
              { post.resteem ?
                <div class="col-xs-12">
                  <a href={"https://steemit.com/@"+config.steem.username+"/"+post.permlink}><h2><span class="fa fa-retweet"></span> {post.title}</h2></a>
                  <h4>{STRINGS.posted} {post.created} {STRINGS.in} {post.category.charAt(0).toUpperCase() + post.category.slice(1)} {STRINGS.by} {post.author}</h4>
                </div>
              :
                <div class="col-xs-12">
                  <a onClick={() => self.goToPost(post.permlink)}><h2>{post.title}</h2></a>
                  <h4>{STRINGS.posted} {post.created} {STRINGS.in} {post.category.charAt(0).toUpperCase() + post.category.slice(1)}</h4>
                </div>
              }
              <div class="col-xs-12">
                <h4 class="shortBody">{text.replace(/\!\[][(][)]/g, '').substring(0,300)}</h4>
              </div>
              <div class="col-xs-4 text-center">
                <h4>
                  <a onClick={() => self.setState({voteModal: true, targetAuthor: post.author, targetPermlink: post.permlink, voteWeight: 10000})}>
                    {post.net_votes} <span class="fa fa-thumbs-up"></span>
                  </a>
                </h4>
              </div>
              <div class="col-xs-4 text-center">
                <h4>
                  <a onClick={() => self.setState({commentModal: true, targetAuthor: post.author, targetPermlink: post.permlink})}>
                    {post.children} <span class="fa fa-comments"></span>
                  </a>
                </h4>
              </div>
              <div class="col-xs-4 text-center">
                { post.resteem ?
                  <a href={"https://steemit.com/@"+config.steem.username+"/"+post.permlink}>
                    <h4>{STRINGS.on} Steemit <div class="steemit-icon-small pull-right"></div></h4>
                  </a>
                :
                  <a onClick={() => self.goToPost(post.permlink)}><h4>{STRINGS.viewPost}</h4></a>
                }
              </div>
            </div>
          </div>
        )
      }

      return(
        <div>
          { self.state.loading ?
            <div>{loader}</div>
          : self.state.error ?
            <div>{error}</div>
          :
            <div class="container">
              {modalVote}
              {modalComment}
              <div class="row">
                <div class="col-xs-12 col-sm-9">
                  {header}
                  <Message ref={(c) => self._message = c}/>
                  { (self.state.posts.length == 0) ?
                    <div class="row post whiteBox text-center">
                      {STRINGS.noPosts}
                    </div>
                  : (self.state.postID.length > 0) ?
                    self.state.posts.map( function(post, index){
                      return renderPostLong(post);
                    })
                  :
                  <div>
                    {self.state.posts.map( function(post, index){
                      return renderPostShort(post, index);
                    })}
                    {paginator}
                  </div>
                  }
                </div>
                {sidebar}
              </div>
            </div>
            }
        </div>
      )
    }

}
