const moment = require('moment')


function diffTime(time1, time2) {
  if (!time1 || !time2) return null
  time1 = moment(time1, 'HH:mm')
  time2 = moment(time2, 'HH:mm')
  const diffHour = time2.diff(time1) / 1000 / 60 / 60
  return diffHour  // 時間差[hour]
}

function hoursToString(diffHours) {
  if (!diffHours && diffHours !== 0) return null
  const hour = Math.floor(diffHours)
  const minuite = Math.floor((diffHours - hour) * 60)
  return `${hour}時間${minuite}分`
}

function validTime(input) {
  return input.match(/^\d{2}:\d{2}$/) ? true : false  // HH:mm
}


module.exports = {diffTime, hoursToString, validTime}
