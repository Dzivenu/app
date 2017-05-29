import React from 'react';

import steem from 'steem';
import moment from 'moment';

export default class Steem {

    async generateKeys(username, password){
      var keys = steem.auth.getPrivateKeys(username.toLowerCase(), password, ['owner', 'active', 'posting', 'memo'])
      keys.available = (await steem.api.getAccounts([username.toLowerCase()])).length == 0;
    }

    async votePost(signerPostKey, signer, author, permlink, voteWeight){
      await steem.broadcast.vote(signerPostKey, signer, author, permlink, parseInt(voteWeight));
    }

    async commentPost(signerPostKey, signer, author, permlink, username, comment){
      await steem.broadcast.comment(
        signerPostKey,
        author,
        permlink,
        username,
        permlink+"-"+moment().toISOString().replace(/[-:.]/g,"").toLowerCase(),
        "",
        comment,
        JSON.stringify({"app":"steemblog/0.6","format":"markdown+html","tags":[]})
      );
    }

}
