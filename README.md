# kintai

A command line application to manage your work time.

## Installation

```
npm install --global kintai
```

sqlite3 file will be created in $HOME/.npm/kintai at startup.


## Usage

```
Usage: kintai <command> [option]
  
Commands:
  start         save the start time.
  start [time]  save the specified start time.
  end           save the end time.
  end [time]    save the specified end time.
  rest          save the start time of rest.
  rest [time]   save the specified start time of rest.
  return        save the end time of rest.
  return [time] save the specified end time of rest.
  edit          edit work time information.
  show          show work time information.
  reset         reset work time information.
```

## Examples

```
$ kintai start 09:30
$ kintai rest 12:00
$ kintai return 12:45
$ kintai rest 16:30
$ kintai return 16:45
$ kintai end 18:30
$ kintai show
2020/04/13
勤務時間 09:30 ~ 18:30
休憩(1)  12:00 ~ 12:45  (0時間45分)
休憩(2)  16:30 ~ 16:45  (0時間15分)
実働時間 8時間0分
```
