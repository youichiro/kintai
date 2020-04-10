'use strict'
const sqlite3 = require('sqlite3')
const fs = require('fs')


class Kintai {
  constructor(date, startTime, endTime) {
    this.date = date
    this.startTime = startTime
    this.endTime = endTime
  }
}

class Rest {
  constructor(date, number, startTime, endTime) {
    this.date = date
    this.number = number
    this.startTime = startTime
    this.endTime = endTime
  }
}


class DB {
  init() {
    const saveDir = process.env.HOME + '/.npm/kintai/'
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, {recursive: true})
    }
    this.db = new sqlite3.Database(saveDir + 'kintai.sqlite3')
  }
  async createKintaiTable() {
    return new Promise((resolve, reject) => {
      try {
        this.db.run(
          `CREATE TABLE IF NOT EXISTS kintai
           (date date primary key, start_time time, end_time time)`
        )
        return resolve(true)
      } catch (err) { return reject(err) }
    })
  }
  async createRestTable() {
    return new Promise((resolve, reject) => {
      try {
        this.db.run(
          `CREATE TABLE IF NOT EXISTS rest
           (date date, number integer, start_time time, end_time time)`
        )
        return resolve(true)
      } catch (err) { return reject(err) }
    })
  }
  async createKintai(kintai) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO kintai (date, start_time, end_time) VALUES (?, ?, ?)'
      const values = [kintai.date, kintai.startTime, kintai.endTime]
      this.db.run(sql, values, err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
  async updateKintai(kintai) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE kintai SET start_time = ?, end_time = ? WHERE date = ?'
      const values = [kintai.startTime, kintai.endTime, kintai.date]
      this.db.run(sql, values, err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
  async findKintai(date) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT date, start_time, end_time FROM kintai WHERE date = ?'
      const values = [date]
      this.db.get(sql, values, (err, row) => {
        if (err) return reject(err)
        if (!row) return resolve(null)
        else { return resolve(new Kintai(row.date, row.start_time, row.end_time)) }
      })
    })
  }
  async deleteKintai(date) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM kintai WHERE date = ?', date, err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
  async createRest(rest) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO rest (date, number, start_time, end_time) VALUES (?, ?, ?, ?)'
      const values = [rest.date, rest.number, rest.startTime, rest.endTime]
      this.db.run(sql, values, err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
  async updateRest(rest) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE rest SET start_time = ?, end_time = ? WHERE date = ? AND number = ?'
      const values = [rest.startTime, rest.endTime, rest.date, rest.number]
      this.db.run(sql, values, err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
  async findRest(date, number) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT date, number, start_time, end_time FROM rest WHERE date = ? AND number = ?'
      const values = [date, number]
      this.db.get(sql, values, (err, row) => {
        if (err) return reject(err)
        if (!row) return resolve(null)
        else { return resolve(new Rest(row.date, row.number, row.start_time, row.end_time)) }
      })
    })
  }
  async findRestAllByDate(date) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT date, number, start_time, end_time FROM rest WHERE date = ? ORDER BY number'
      const values = [date]
      this.db.all(sql, values, (err, rows) => {
        if (err) return reject(err)
        if (!rows || rows.length === 0) return resolve(null)
        return resolve(rows.map(row => new Rest(row.date, row.number, row.start_time, row.end_time)))
      })
    })
  }
  async deleteRest(date, number) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM rest WHERE date = ? AND number = ?', [date, number], err => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }
}

module.exports = {Kintai, Rest, DB}
