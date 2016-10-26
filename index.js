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
  return pg.select('domains.id')
    .from('domains')
    .rightOuterJoin('pages', 'domains.id', 'pages.domain')
    .whereNull('pages.id')
    .orderBy('domains.id', 'asc')
    .limit(1)
    .then(domains => {
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

startCapture(); //Temporary

function pauseCapture(){

}

//I'm thinking this won't be run after initial pages are filled
//for a given domain, we would just pull based on "pages" then
function captureDomain(domainId){console.log('domainId', domainId)
  if (!domainId){
    throw `domainId must be passed to captureDomain, got ${domainId}`;
  }
  //find page, if it doesn't exist, add domain as url
  return pg.select()
    .from('pages')
    .innerJoin('domains', 'domains.id', 'pages.domain')
    .where('domains.id', domainId)
    .then(pages => {
      const page = pages[0];

      //Already have a row in "pages" for this id
      if (page){
        return capturePage({
          pageId:page.pages.id,
          url:   page.pages.url
        });
      }
      else {
        const url = `http://www.${page.domains.domain}`;
        return pg('pages')
        .returning('id')
        .insert({
          domain: domainId,
          url
        })
        .then(id => capturePage({pageId:id[0], url}));
      }
    });
}

function capturePage({pageId,url}){
  return request({url, resolveWithFullResponse:true})
  .then(res => {
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
