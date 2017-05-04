#!/usr/bin/env node
const chalk = require('chalk');
const inquirer = require('inquirer');
const Random = require('meteor-random');
const Cosmic = require('cosmicjs');

const COSMIC_API_KEY = require('./cosmic-keys').COSMIC_API_KEY;
const COSMIC_API_WRITE_KEY = require('./cosmic-keys').COSMIC_API_WRITE_KEY

var config = {};
config.bucket = {
  slug: 'notestoself',
  key: COSMIC_API_KEY,
  write_key:COSMIC_API_WRITE_KEY,
}

const MainMenu = () => {
  inquirer.prompt({
    type: 'list',
    name: 'mainMenu',
    message: 'Main Menu',
    choices: [
      'New Note',
      'View Notes',
      new inquirer.Separator(),
      'Exit'
    ]
  })
  .then( answers => {
    if (answers.mainMenu === 'New Note'){
      NewNote();
    } else if (answers.mainMenu === 'View Notes'){
      ViewNotes();
    } else {
      process.exit();
    }
  })
}

const NewNote = () => {

  let question = {
    type: 'input',
    name: 'note_text',
    message: 'Note',
  };

  inquirer.prompt(question)
    .then( answers => {
    let params = {
        write_key: config.bucket.write_key,
        type_slug: 'notes',
        slug: Random.id().toLowerCase(),
        title: answers.note_text,
        content: '',
      };

      if (answers.note_text === ''){
        console.log(chalk.red('you cannot save an empty note'));
        MainMenu()
        return;
      }

      Cosmic.addObject(config, params, (error, response) => {
        if (response.object) {
          console.log(chalk.green('\u2713 Saved'))
        }
        if (error){
          console.log("create object error: " + error.message)
        }

        MainMenu();
      })
    })
}

const ViewNotes = () => {
  let params = {
    type_slug: 'notes',
    limit: 10,
    skip: 0,
  }

  Cosmic.getObjectType(config, params, (error, response) => {
    let notes = [];
    let noteTitles = [chalk.yellow('return')]

    if (response.total === undefined){
      console.log(chalk.red('no notes found'))
      MainMenu();
      return;
    }

    sortedResponse = response.objects.all.sort((a,b) => {
      return new Date(b.created) - new Date(a.created)
    })

    const amount = response.objects.all.length;

    sortedResponse.map( note => {
      let newNote = {
        title: note.title,
        slug: note.slug,
      }

      noteTitles.push(chalk.blue(newNote.title) + chalk.red(`  slug - ${newNote.slug} | `));
      notes.push(newNote);

      if (notes.length === amount){
        inquirer.prompt({
          type: 'list',
          name: 'allNotes',
          message: 'All Notes',
          choices: noteTitles,
        })
        .then( answers => {


          if (answers.allNotes === "\u001b[33mreturn\u001b[39m") {
            MainMenu();
            return}

            let regexSearch = /(\w{17})/;
            let newValue = answers.allNotes.match(regexSearch);

            Cosmic.getObject(config, { slug: newValue[0] }, (error, response) => {
              inquirer.prompt({
                type: 'expand',
                message: chalk.blue(response.object.title),
                name: 'moreContext',
                choices: [
                  {
                    key: 'e',
                    name: 'Edit',
                    value: 'edit',
                  },
                  {
                    key: 'd',
                    name: 'Delete',
                    value: 'delete',
                  },
                  {
                    key: 'l',
                    name: 'Leave',
                    value: 'leave',
                  }
                ]
              })
              .then( answers => {
                if (answers.moreContext === 'edit') {
                  inquirer.prompt({
                    type: 'input',
                    name: 'newText',
                    message: 'New Text:',
                  })
                  .then( answers => {
                    let params = {
                      write_key: config.bucket.write_key,
                      slug: response.object.slug,
                      type_slug: 'notes',
                      title: answers.newText,
                      content: '',
                    }
                    Cosmic.editObject(config, params, (error, respone) => {
                      if (response.object){
                        console.log(chalk.green("\u2713" + "Success"))
                      }
                      MainMenu()
                    })
                  })
                } else if (answers.moreContext === 'delete') {
                  let params = {
                    write_key: config.bucket.write_key,
                    slug: response.object.slug,
                  }

                  Cosmic.deleteObject(config, params, (error, response) => {
                    if (error) {
                      console.log(error)
                    }
                    if (response.object) {
                      console.log(chalk.green("\u2713" + "Success"))
                    }
                    MainMenu();
                  });
                } else {
                  MainMenu();
                }
              })
            })



        })
      }
    })
  })
}

MainMenu();
