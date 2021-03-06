#!/usr/bin/env node
'use strict'
const moment = require('moment')
const minimist = require('minimist')

const cli = require('./cli')
const datetime = require('./datetime')
const sqlite = require('./sqlite')
const Kintai = sqlite.Kintai
const Rest = sqlite.Rest
const DB = sqlite.DB

class KintaiTool {
  constructor () {
    this.initDB()
    this.setDatetime()
  }

  initDB () {
    this.db = new DB()
    this.db.init()
    this.db.createKintaiTable()
    this.db.createRestTable()
  }

  setDatetime () {
    this.moment = moment()
    this.date = this.moment.format('YYYY-MM-DD')
    this.dateHuman = this.moment.format('YYYY/MM/DD')
    this.time = this.moment.format('HH:mm')
  }

  async sleep () {
    return new Promise(resolve => setTimeout(resolve, 50))
  }

  async showWorkTimes (kintai) {
    if (!kintai) {
      console.log('出勤していません')
      return
    }
    console.log(this.dateHuman)
    console.log(`勤務時間 ${kintai.startTime} ~ ${kintai.endTime}`)

    // 休憩時間の計算
    let restTime = 0
    const rests = await this.db.findRestAllByDate(this.date)
    if (rests) {
      for (const rest of rests) {
        const diff = datetime.diffTime(rest.startTime, rest.endTime)
        console.log(`休憩(${rest.number})  ${rest.startTime} ~ ${rest.endTime}  (${datetime.hoursToString(diff)})`)
        restTime += diff
      }
    }
    // 実働時間の計算
    let workTime = datetime.diffTime(kintai.startTime, kintai.endTime)
    if (workTime && restTime) {
      workTime = workTime - restTime
    }
    workTime = datetime.hoursToString(workTime)
    console.log(`実働時間 ${workTime}\n`)
  }

  async start (time) {
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

  async end (time) {
    if (!time) time = this.time
    let kintai = await this.db.findKintai(this.date)
    if (!kintai) {
      console.log('出勤していません')
    } else if (kintai.endTime) {
      console.log('既に退勤しています\n退勤時刻: ', kintai.endTime)
    } else {
      const rests = await this.db.findRestAllByDate(this.date)
      if (rests) {
        const lastRest = rests[rests.length - 1]
        if (!lastRest.endTime) {
          console.log('休憩から戻っていません')
          console.log(lastRest.startTime, 'に休憩に入りました')
          return
        }
      }
      // update endTime
      kintai = new Kintai(kintai.date, kintai.startTime, time)
      await this.db.updateKintai(kintai)
      console.log(this.dateHuman, kintai.endTime, '退勤しました')
    }
  }

  async show () {
    const kintai = await this.db.findKintai(this.date)
    await this.showWorkTimes(kintai)
  }

  async reset () {
    const kintai = await this.db.findKintai(this.date)
    if (!kintai) return
    // delete kintai & rests
    await this.db.deleteKintai(this.date)
    const rests = await this.db.findRestAllByDate(this.date)
    if (rests) {
      for (const rest of rests) {
        await this.db.deleteRest(rest.date, rest.number)
      }
    }
    console.log(`${this.dateHuman} の勤怠情報を削除しました`)
  }

  async rest (time) {
    if (!time) time = this.time
    const kintai = await this.db.findKintai(this.date)
    if (!kintai) {
      console.log('出勤していません')
      return
    }
    let number
    const rests = await this.db.findRestAllByDate(this.date)
    if (rests) {
      const lastRest = rests[rests.length - 1]
      if (!lastRest.endTime) {
        console.log('休憩から戻っていません')
        console.log(lastRest.startTime, 'に休憩に入りました')
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

  async return (time) {
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
    const lastRest = rests[rests.length - 1]
    if (lastRest.endTime) {
      console.log('休憩に入っていません')
      return
    }
    // update rest
    lastRest.endTime = time
    await this.db.updateRest(lastRest)
    console.log(this.dateHuman, lastRest.endTime, '休憩から戻りました')
  }

  async edit () {
    const kintai = await this.db.findKintai(this.date)
    const rests = await this.db.findRestAllByDate(kintai.date)
    let rest, answer2
    console.log('[現在の勤怠情報]')
    await this.showWorkTimes(kintai)

    const answer = await cli.selectCLI(['出勤時刻', '退勤時刻', '休憩時刻'], 'どの時刻を変更しますか')
    if (answer === '休憩時刻') {
      if (!rests) {
        console.log('休憩がありません')
        return
      }
      const number = await cli.selectCLI(rests.map(rest => rest.number.toString()), '番号を選んでください')
      rest = rests.filter(rest => rest.number === parseInt(number))[0]
      answer2 = await cli.selectCLI(['開始時刻', '終了時刻'], '開始時刻と終了時刻のどちらを変更しますか')
    }
    const input = await cli.inputCLI('時刻を入力してください(HH:mm)')
    if (!datetime.validTime(input)) {
      console.log('HH:mm のフォーマットで時間を指定してください (ex. 09:30)')
      return
    }
    if (answer === '出勤時刻') {
      // update kintai.startTime
      kintai.startTime = input
      await this.db.updateKintai(kintai)
    } else if (answer === '退勤時刻') {
      // update kintai.endTime
      kintai.endTime = input
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
    this.showWorkTimes(kintai)
  }
}

function isValidInputTime (input) {
  if (!datetime.validTime(input)) {
    console.log('HH:mm のフォーマットで時間を指定してください (ex. 09:30)')
    return false
  }
  return true
}

async function main () {
  const usage = `Usage: kintai <command> [option]

Commands:
  start\t\t出勤する
  start [time]\t時間を指定して出勤する
  end\t\t退勤する
  end [time]\t時間を指定して退勤する
  rest\t\t休憩に入る
  rest [time]\t時間を指定して休憩に入る
  return\t休憩から戻る
  return [time]\t時間を指定して休憩から戻る
  edit\t\t勤怠情報を変更する
  show\t\t勤怠情報を表示する
  reset\t\t勤怠情報を削除する
  `
  const tool = new KintaiTool()
  await tool.sleep() // wait for finishing initdb
  const argv = minimist(process.argv.slice(2))

  if (argv._.length <= 0) {
    console.log(usage)
    return
  }

  const command = argv._[0]
  const inputTime = argv._[1] || null

  switch (command) {
    case 'start':
      if (inputTime && !isValidInputTime(inputTime)) return
      await tool.start(inputTime)
      break
    case 'end':
      if (inputTime && !isValidInputTime(inputTime)) return
      await tool.end(inputTime)
      break
    case 'rest':
      if (inputTime && !isValidInputTime(inputTime)) return
      await tool.rest(inputTime)
      break
    case 'return':
      if (inputTime && !isValidInputTime(inputTime)) return
      await tool.return(inputTime)
      break
    case 'show':
      await tool.show()
      break
    case 'edit':
      await tool.edit()
      break
    case 'reset':
      await tool.reset()
      break
    case 'help':
    default:
      console.log(usage)
      break
  }
}
main()
