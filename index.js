"use strict";
const request = require('request-promise-native');
const cheerio = require('cheerio');
const parse = require('robots-txt-parse');

const MAX_CONCURRENT_REQUESTS = 3;

const pg = require('knex')({
  client:     'pg',
  connection: process.env.PG_CONNECTION_STRING,
  searchPath: 'knex,public'
});

function captureDomains(domains){
  const activeRequests = []; //TODO: maybe use a weakmap here
}

function captureDomain(){
  //find page, if it doesn't exist, add domain as url
  return pg.select('id','domain','url')
    .from('pages')
    .where('domain', 141644)
    .then(pages => {
      const page = pages[0];
      if (page){
        return capturePage({
          pageId:page.id,
          url:   page.url
        });
      }
      else {
        return pg('pages')
        .returning('id')
        .insert({
          domain: 141644,
          url: 'http://www.reddit.com'
        })
        .then(id => capturePage({pageId:id[0], url:'http://www.reddit.com'}));
      }
    });
}

function capturePage({pageId,url}){
  return request({url, resolveWithFullResponse:true})
  .then((res) => {
    console.log(url + " Status code: " + res.statusCode);

    const $ = cheerio.load(res.body);
    pg('pages_captures').insert({
      page: pageId,
      response_code: res.statusCode,
      body: $('body').text()
    })
    .then(id => {
      console.log('logged site', url);
      return `logged site ${url}`;
    });
  })
  .catch(err => console.error(err));
}
