import React from 'react';
import {Link} from "react-router-dom";

export default class Error extends React.Component {

    render() {
      var self = this;

      return(
        <div class="container">
          <div class="row text-center">
            <div class="col-xs-3"/>
            <div class="col-xs-6 whiteBox">
              <h1>Invalid URL</h1>
            </div>
          </div>
        </div>
      )
    }

}
