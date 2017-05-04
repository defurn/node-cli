#!/usr/bin/env node
let SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const program = require('commander');
const csv = require('csv');
const fs = require('fs');
const inquirer = require('inquirer');
const async = require('async');
let chalk = require('chalk');

program
  .version('0.0.1')
  .option('-l, --list [list]', 'list of customers in CSV file')
  .parse(process.argv)
//the input fields for data from/about the sender
let questions = [
  {
    type: 'input',
    name: 'sender.email',
    message: 'sender\'s email address - '
  },
  {
    type: 'input',
    name: 'sender.name',
    message: 'sender\'s name - '
  },
  {
    type: 'input',
    name: 'subject',
    message: 'subject - '
  }
];
let contactList = [];

//use csv package with filestream to parse the recipient csv file
let parse = csv.parse;
let stream = fs.createReadStream(program.list)
.pipe(parse({ delimiter : ',' }));

//use sendgrid to communicate emails
//set up function to run on the async call made using async package and sendgrid api after
//prompt is executed by inuirer, for each item in contactList
let __sendEmail = function (to, from, subject, callback) {
  //set up the data to send using sendgrid.mail
  let template = "merry Christmas";
  let helper = require('sendgrid').mail;
  let fromEmail = new helper.Email(from.email, from.name);
  let toEmail = new helper.Email(to.email, to.name);
  let body = new helper.Content("text/plain", template);
  let mail = new helper.Mail(fromEmail, subject, toEmail, body);
  //create the message as POST using sendgrid.emptyRequest, with JSON object created with mail.JSON and using the sendgrid API key from an environment variable
  let sg = require('sendgrid')(SENDGRID_API_KEY);
  let request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  });
  // console.log(JSON.stringify(request))
  //what is callback()? comes from async.each call
  sg.API(request, function(error, response) {

  // console.log(response);
    if (error) {//right now this returns an error, no apikey...?for some reason the API request is not parsing properly....
       return callback(JSON.stringify(error.response.body.errors)); }
    callback();
  });
}


// set input data format to push to contact list in memory
stream
  .on('error', function (err) {
    return console.error(err.message);
  })
  .on('data', function (data) {
    let firstname = data[0];
    let lastname = data[1];
    let name = firstname + " " + lastname;
    let email = data[2];
    contactList.push({ name: name, email: email });
  })
  .on('end', function () {
    //and recieve sender data input on cl using inquirer package, with callbacks executed
    //when all prompt have been answered, stored as answers variable
    inquirer.prompt(questions)
    .then(function (ans) {
      //I do not understand what this does...
      //looks like this iterates over contact list, making async calls to the
      //sendgrid api, with each contatList item's data as specified in __sendEmail
      //function above
      async.each(contactList,
        function (recipient, cb){
          __sendEmail(recipient, ans.sender, ans.subject, cb);
        },
        //use chalk package to format error and log to console
        function (err) {
          if (err) {
            return console.log(chalk.red(err))
          }
          console.log(chalk.green('Success'));
        });
      })
    //TODO how do you chain .then()? what does .then return to pass onto the next .then()?
    // .then(function (answers) {
    //   //write the answers to a file using fs
    //   stringAnswers = JSON.stringify(answers);
    //   fs.writeFile('log.log', stringAnswers, function (err) {
    //     if (err) { return console.log(err); }
    //     console.log('answers logged');
    //     return answers;
    //   });
    // })
  });
