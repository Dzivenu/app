# SteemBlog

## Install

`git clone https://github.com/SteemBlog/app`

`npm install`

## Config

Edit the config file with the blog title, social media urls and username in steemit inside the src folder.

Example:
```
{
  "blogTitle": "AugustoL SteemBlog",
  "facebookLink": "https://fb.com/augusto8",
  "twitterLink": "https://twitter.com/LembleAugusto",
  "linkedinLink": "https://ar.linkedin.com/in/augustolemble",
  "githubLink": "https://github.com/AugustoL",
  "steem": {
    "username": "augustol"
  }
}
```

Edit the index.html file on src folder with the correct values on header tag.

## Develop

Edit the const ON_SERVER on src/index.js and src/views/Home.js to run it on a server on client.

Run the app just like in a server with `npm start` && `npm run dev` to develop.

Run tha app only on clinet side with `npm run start-dev` to develop and enable the hot reloading.

## Build

Run `npm run build` to build the production version.
