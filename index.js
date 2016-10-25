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

function getNextDomainId(){
  return pg.select('id')
    .from('domains')
    .rightOuterJoin('pages', 'domains.id', 'pages.domain')
    .whereNull('pages.id')
    .orderBy('domains.id', 'asc')
    .limit(1)
    .then(domain => {
      const domain = domains[0];
      return domain.id;
    });
}

function startCapture(){
  captureDomain(getNextDomainId())
  .then(msg => {
    console.log(msg);
    //Capture next domain once we're all done with the previous
    process.nextTick(startCapture); //Don't want infinite recursion
  });
}

function pauseCapture(){

}

function captureDomain(domainId){
  //find page, if it doesn't exist, add domain as url
  return pg.select('id','domain','url')
    .from('pages')
    .where('domain', domainId)
    .then(pages => {
      const page = pages[0];

      //Already have a row in "pages" for this id
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
      return `logged site ${url}`;
    });
  })
  .catch(err => console.error(err));
}
