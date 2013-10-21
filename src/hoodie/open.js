/* global $:true */

// Open stores
// -------------
var $ = require('jquery');
var remoteStoreApi = require('./store');

module.exports = function hoodieOpen() {
  var $extend = $.extend;

  // generic method to open a store. Used by
  //
  // * hoodie.remote
  // * hoodie.user("joe")
  // * hoodie.global
  // * ... and more
  //
  //     hoodie.open("some_store_name").findAll()
  //
  function open(storeName, options) {
    options = options || {};

    $extend(options, {
      name: storeName
    });

    return remoteStoreApi(options);
  }

  //
  // Public API
  //
  return open;
};

