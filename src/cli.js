'use strict'

function selectCLI(choices, message) {
  return new Promise((resolve, reject) => {
    const { Select } = require('enquirer')
    const prompt = new Select({
      name: 'select',
      message: message,
      choices: choices
    })
    prompt.run()
      .then(answer => resolve(answer))
      .catch(err => reject(err))
  })
}

async function inputCLI(message) {
  const { prompt } = require('enquirer')
  const response = await prompt({
    type: 'input',
    name: 'text',
    message: message
  })
  return response.text
}

module.exports = {selectCLI, inputCLI}
