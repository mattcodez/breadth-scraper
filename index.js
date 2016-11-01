"use strict";
const colors = require('colors');
const request = require('request-promise-native');
const cheerio = require('cheerio');
const parse = require('robots-txt-parse');

const MAX_CONCURRENT_REQUESTS = 3;

const pg = require('knex')({
  client:     'pg',
  connection: process.env.PG_CONNECTION_STRING,
  searchPath: 'knex,public'
});

async function getNextDomainId(){
  let domains = await pg.select('domains.id')
    .from('domains')
    .leftOuterJoin('pages', 'domains.id', 'pages.domain')
    .whereNull('pages.id')
    .orderBy('domains.id', 'asc')
    .limit(1);
  return domains[0].id;
}

async function startCapture(){
  let nextDomainId = await getNextDomainId();
  const msg = await captureDomain(nextDomainId);
  console.log('MSG', msg);
  //Capture next domain once we're all done with the previous
  //process.nextTick(startCapture); //Don't want infinite call stack
}

startCapture(); //Temporary

function pauseCapture(){

}

//I'm thinking this won't be run after initial pages are filled
//for a given domain, we would just pull based on "pages" then
async function captureDomain(domainId){
  console.log('domainId'.blue, domainId)
  if (typeof(domainId) !== 'number'){
    throw `domainId [number] must be passed to captureDomain, got ${domainId}`;
  }
  //find page, if it doesn't exist, add domain as url
  let pages = await pg.select('pages.id', 'pages.url', 'domains.domain')
    .from('pages')
    .rightOuterJoin('domains', 'domains.id', 'pages.domain')
    .where('domains.id', domainId);
  const page = pages[0];

  //Already have a row in "pages" for this id
  if (page.id !== null){
    return capturePage({
      pageId:page.id,
      url:   page.url
    });
  }
  else {
    const url = `http://www.${page.domain}`;
    let id = (await pg('pages')
    .returning('id')
    .insert({
      domain: domainId,
      url
    }))[0];
    return capturePage({pageId:id, url});
  }
}

async function capturePage({pageId,url}){
  console.log('capturePage'.blue,pageId, url);
  try{
    let res = await request({url, resolveWithFullResponse:true});
    console.log(url + " Status code: " + res.statusCode);

    const $ = cheerio.load(res.body);
    await pg('pages_captures').insert({
      page: pageId,
      response_code: res.statusCode,
      body: $('body').text()
    });
    return `logged site ${url}`;
  }
  catch(err){
    if (err.name === 'RequestError'){
      await pg('pages_captures').insert({
        page: pageId,
        response_code: null,
        body: null
      });
      return `site ${url} not found`;
    }
    else {
      console.error(err);
    }
  }
}
