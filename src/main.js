#! /usr/bin/env node
'use strict'
const moment = require('moment')
const minimist = require('minimist')

const cli = require('./cli')
const datetime = require('./datetime')
const sqlite = require('./sqlite')
const Kintai = sqlite.Kintai
const Rest = sqlite.Rest
const DB = sqlite.DB


class Manager {
  constructor() {
    // initdb
    this.db = new DB()
    this.db.init()
    this.db.createKintaiTable()
    this.db.createRestTable()
    // datetime
    this.moment = moment()
    this.date = this.moment.format('YYYY-MM-DD')
    this.dateHuman = this.moment.format('YYYY/MM/DD')
    this.time = this.moment.format('HH:mm')
  }
  async sleep() {
    return new Promise(resolve => setTimeout(resolve, 50))
  }
  async info(kintai) {
    if (kintai) {
      console.log(this.dateHuman)
      console.log(`勤務時間 ${kintai.startTime} ~ ${kintai.endTime}`)
      const rests = await this.db.findRestAllByDate(this.date)
      let restTime = 0
      if (rests) {
        for (let rest of rests) {
          let diff = datetime.diffTime(rest.startTime, rest.endTime)
          console.log(`休憩(${rest.number})  ${rest.startTime} ~ ${rest.endTime}  (${datetime.hoursToString(diff)})`)
          restTime += diff
        }
      }
      // 勤務時間 = kintaiDiff - restDiff
      let workTime = datetime.diffTime(kintai.startTime, kintai.endTime)
      if (workTime && restTime) {
        workTime = workTime - restTime
      }
      workTime = datetime.hoursToString(workTime)
      console.log(`実働時間 ${workTime}\n`)
    } else {
      console.log('出勤していません')
    }
  }
  async start(time) {
    if (!time) time = this.time
    let kintai = await this.db.findKintai(this.date)
    if (kintai && kintai.startTime) {
      console.log('既に出勤しています\n出勤時刻: ', kintai.startTime)
    } else {
      // create kintai
      kintai = new Kintai(this.date, time, null)
      await this.db.createKintai(kintai)
      console.log(this.dateHuman, kintai.startTime, '出勤しました')
    }
  }
  async end(time) {
    if (!time) time = this.time
    let kintai = await this.db.findKintai(this.date)
    if (!kintai) {
      console.log('出勤していません')
    } else if (kintai.endTime) {
      console.log('既に退勤しています\n退勤時刻: ', kintai.endTime)
    } else {
      const rests = await this.db.findRestAllByDate(this.date)
      if (rests) {
        const last_rest = rests[rests.length - 1]
        if (!last_rest.endTime) {
          console.log('休憩から戻っていません')
          console.log(last_rest.startTime, 'に休憩に入りました')
          return
        }
      }
      // update endTime
      kintai = new Kintai(kintai.date, kintai.startTime, time)
      await this.db.updateKintai(kintai)
      console.log(this.dateHuman, kintai.endTime, '退勤しました')
    }
  }
  async show() {
    const kintai = await this.db.findKintai(this.date)
    await this.info(kintai)
  }
  async reset() {
    const kintai = await this.db.findKintai(this.date)
    if (kintai) {
      // delete kintai
      await this.db.deleteKintai(this.date)
      // delete rests
      const rests = await this.db.findRestAllByDate(this.date)
      if (rests) {
        for (let rest of rests) { await this.db.deleteRest(rest.date, rest.number) }
      }
      console.log(`${this.dateHuman} の勤怠情報を削除しました`)
    }
  }
  async rest(time) {
    if (!time) time = this.time
    const kintai = await this.db.findKintai(this.date)
    if (!kintai) {
      console.log('出勤していません')
      return
    }
    let number
    const rests = await this.db.findRestAllByDate(this.date)
    if (rests) {
      const last_rest = rests[rests.length - 1]
      if (!last_rest.endTime) {
        console.log('休憩から戻っていません')
        console.log(last_rest.startTime, 'に休憩に入りました')
        return
      }
      number = rests.length + 1
    } else {
      number = 1
    }
    // create rest
    const rest = new Rest(this.date, number, time, null)
    await this.db.createRest(rest)
    console.log(this.dateHuman, rest.startTime, '休憩に入りました')
  }
  async return(time) {
    if (!time) time = this.time
    const kintai = await this.db.findKintai(this.date)
    if (!kintai) {
      console.log('出勤していません')
      return
    }
    const rests = await this.db.findRestAllByDate(this.date)
    if (!rests) {
      console.log('休憩に入っていません')
      return
    }
    let last_rest = rests[rests.length - 1]
    if (last_rest.endTime) {
      console.log('休憩に入っていません')
      return
    }
    // update rest
    last_rest.endTime = time
    await this.db.updateRest(last_rest)
    console.log(this.dateHuman, last_rest.endTime, '休憩から戻りました')
  }
  async edit() {
    let kintai = await this.db.findKintai(this.date)
    const rests = await this.db.findRestAllByDate(kintai.date)
    let rest, answer2
    console.log('[現在の勤怠情報]')
    await this.info(kintai)

    const answer = await cli.selectCLI(['出勤時刻', '退勤時刻', '休憩時刻'], 'どの時刻を変更しますか')
    if (answer === '休憩時刻') {
      if (!rests) {
        console.log('休憩がありません')
        return
      }
      let number = await cli.selectCLI(rests.map(rest => rest.number.toString()), '番号を選んでください')
      rest = rests.filter(rest => rest.number === parseInt(number))[0]
      answer2 = await cli.selectCLI(['開始時刻', '終了時刻'], '開始時刻と終了時刻のどちらを変更しますか')
    }
    let input = await cli.inputCLI('時刻を入力してください(HH:mm)')
    if (!datetime.validTime(input)) {
      console.log('HH:mm のフォーマットで時間を指定してください (ex. 09:30)')
      return
    }
    if (answer === '出勤時刻') {
      kintai.startTime = input
      // update kintai.startTime
      await this.db.updateKintai(kintai)
    } else if (answer === '退勤時刻') {
      kintai.endTime = input
      // update kintai.endTime
      await this.db.updateKintai(kintai)
    } else if (answer === '休憩時刻') {
      if (answer2 === '開始時刻') {
        rest.startTime = input
      } else {
        rest.endTime = input
      }
      // update rest
      await this.db.updateRest(rest)
    }
    console.log('\n[変更後の勤怠情報]')
    this.info(kintai)
  }
}


function validInputTime(argv) {
  if (argv['_'].length > 1) {
    let input = argv['_'][1]
    if (!datetime.validTime(input)) {
      console.log('HH:mm のフォーマットで時間を指定してください (ex. 09:30)')
      return
    }
    return input
  }
}


async function main() {
  const usage = `Usage: kintai [command] [option]
  
Commands:
  start\t出勤する
  start [time]\t時間を指定して出勤する
  end\t\t退勤する
  end [time]\t時間を指定して退勤する
  rest\t\t休憩に入る
  rest [time]\t時間を指定して休憩に入る
  return\t休憩から戻る
  return [time]\t時間を指定して休憩から戻る
  edit\t\t勤怠情報を変更する
  show\t\t勤怠情報を表示する
  `
  const manager = new Manager()
  await manager.sleep()  // wait for finishing initdb
  const argv = minimist(process.argv.slice(2))

  if (argv['_'][0] === 'help' || 'h' in argv) {
    console.log(usage)
  }
  if (argv['_'][0] === 'start') {
    const inputTime = validInputTime(argv)
    await manager.start(inputTime || null)
  } else if (argv['_'][0] === 'end') {
    const inputTime = validInputTime(argv)
    await manager.end(inputTime || null)
  } else if (argv['_'][0] === 'show') {
    await manager.show()
  } else if (argv['_'][0] === 'reset') {
    await manager.reset()
  } else if (argv['_'][0] === 'edit') {
    await manager.edit()
  } else if (argv['_'][0] === 'rest') {
    await manager.rest()
  } else if (argv['_'][0] === 'return') {
    await manager.return()
  } else {
    console.log(usage)
  }
}
main()
