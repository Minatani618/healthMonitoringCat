var express = require("express");
var router = express.Router();
const path = require("path");
const fs = require("fs");
const { create } = require("domain");
const { log } = require("console");

const dataPath = path.join("healthData", "sleepMonitor");

/* GET home page. */
router.get("/", function (req, res, next) {
  const neko = "mike";

  //前回の睡眠開始時刻とランクのログを読みだす
  const latestLogObj = readLatestLog();
  const latestSleepTime = createLatestSleepTime(latestLogObj);
  const sleepStatus = calculateSleepStatus();
  const sleepStatusStr = createSleepStatusStr(sleepStatus);

  //テンプレートエンジンにわたすデータオブジェクト
  const resData = {
    title: "睡眠監視にゃんこ",
    neko: neko,
    sleepStatus: sleepStatus,
    sleepStatusStr: sleepStatusStr,
    latestSleepTime: latestSleepTime,
  };
  res.render("sleepMonitor", resData);
});

/* post 睡眠開始時間ボタンより */
router.post("/", (req, res, next) => {
  const reqSleepStart = req.body.sleepStart;

  const asleepTime = new Date(); //睡眠開始時間を生成
  const sleepRank = judgeSleepRank(asleepTime); //睡眠ランクを算出

  writeSleepLog(asleepTime, sleepRank); //ログファイルを追記する

  res.redirect("/sleepMonitor");
});

//睡眠開始時刻から睡眠ランクを算出
const judgeSleepRank = (asleepTime) => {
  const asleepHH = asleepTime.getHours();
  const asleepMM = asleepTime.getMinutes();
  const asleepSS = asleepTime.getSeconds();
  //入力ミスと判断　五時から正午まで
  if (5 < asleepHH && asleepHH < 12) {
    return 0;
  }

  //バッド
  if (asleepHH <= 5) {
    return -2;
  }

  //ベスト
  if (asleepHH < 22) {
    return 5;
  }

  //ベター
  if (asleepHH < 23) {
    return 3;
  }

  if (asleepHH < 24) {
    return 1;
  }
};

//睡眠ログを追記する
const writeSleepLog = (asleepDate, rank) => {
  //時間を各変数に分割取得
  const asleepYear = asleepDate.getFullYear();
  const asleepMonth = asleepDate.getMonth() + 1; // 月は0から始まるため、1を加える
  const asleepDay = asleepDate.getDate();
  const asleepHours = asleepDate.getHours();
  const asleepMinutes = asleepDate.getMinutes();
  const asleepSeconds = asleepDate.getSeconds();

  //ログを整形する(ログがおかしくなることによるエラー防止)
  fixBlankLine();

  //昼寝かどうかを判断する
  const isSiesta = judgeSiesta(asleepHours);

  //昼寝なら追記しない
  if (isSiesta) {
    console.log("昼寝と判断したため記録を取りやめた");
    return;
  }

  //何日のログとして記録するのか判断する
  const logDayStr = judgeLogDay(
    asleepYear,
    asleepMonth,
    asleepDay,
    asleepHours
  );

  //すでに記録されている日付かどうかを判定する
  const isExistsLogDay = judgeIsExistsLogDay(
    `${asleepYear}-${asleepMonth}-${asleepDay}`
  );

  //すでに記録されているなら記録しない
  if (isExistsLogDay) {
    console.log("すでに記録されているので記録を取りやめた");
    return;
  }

  const logTxt = `\n${rank}, ${asleepYear}, ${asleepMonth}, ${asleepDay}, ${asleepHours}, ${asleepMinutes}, ${asleepSeconds}, ${logDayStr}`;

  //csvファイルの末尾に追記する
  fs.appendFile(path.join(dataPath, "sleepLog.csv"), logTxt, (err) => {
    if (err) {
      console.error("睡眠ログを記録できなかった");
      console.error(err);
      return;
    }
    console.log("睡眠ログを記録した");
  });
};

//昼寝かどうか判断
const judgeSiesta = (hour) => {
  if (hour <= 6) {
    return false;
  }
  if (hour <= 18) {
    return true;
  }
  if (hour <= 24) {
    return false;
  }
};

//ログ内の空欄を削除
const fixBlankLine = () => {
  const logs = fs.readFileSync(path.join(dataPath, "sleepLog.csv"), "utf-8");
  const fixedLogs = logs.replace(/\n\s*\n/g, "\n"); // 正規表現を使用して空白行を修正
  fs.writeFileSync(path.join(dataPath, "sleepLog.csv"), fixedLogs);
  console.log("ログ修正" + path.join(dataPath, "sleepLog.csv"));
};

//睡眠した日付を確定させて、その文字(年-月-日)を返す
const judgeLogDay = (year, month, day, hour) => {
  const dateString = `${year}-${month}-${day}`; // 入力された日付文字列
  const date = new Date(dateString); // 文字列からDateオブジェクトを作成
  // 0-6時までなら日付を一つ戻る
  if (hour <= 6) {
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`;
  } else {
    //そうじゃないならそのまま
    return dateString;
  }
};

//すでにその日の情報がログ上に残っているかどうかを判断する(同日ログの二重記入防止のため)
const judgeIsExistsLogDay = (dateStr) => {
  const logs = fs.readFileSync(path.join(dataPath, "sleepLog.csv"), "utf-8");
  const logsArr = logs.trim().split("\n");
  //ログを全て確認して該当する日付があるか確認する
  for (let i = 1; i <= logsArr.length - 1; i++) {
    if (!logsArr[i]) {
      continue; //空行を飛ばす
    }
    let dateStrOnLog;
    //日付ストリングがないとエラーとなるためそれを回避
    try {
      dateStrOnLog = logsArr[i].split(",")[7].trim();
    } catch (error) {}

    //該当日付の有無確認
    if (dateStr == dateStrOnLog) {
      return true;
    }
  }
  return false;
};

const readLatestLog = () => {
  const logs = fs.readFileSync(path.join(dataPath, "sleepLog.csv"), "utf-8");
  const logsArr = logs.trim().split("\n");
  const lastIndex = logsArr.length - 1;
  const latestLog = logsArr[lastIndex];
  const latestLogContents = latestLog.split(",");
  const latestLogObj = {
    latestRunk: latestLogContents[0],
    latestYear: latestLogContents[1],
    latestMonth: latestLogContents[2],
    latestDay: latestLogContents[3],
    latestHour: latestLogContents[4],
    latestminute: latestLogContents[5],
    latestsecond: latestLogContents[6],
  };
  return latestLogObj;
};

//睡眠ログの最終行から前回睡眠開始時刻を算出する
const createLatestSleepTime = (latestLogObj) => {
  const msg = `${latestLogObj.latestYear}年${latestLogObj.latestMonth}月${latestLogObj.latestDay}日 ${latestLogObj.latestHour}時${latestLogObj.latestminute}分 `;
  return msg;
};

//現時点の睡眠ランクを算出する 直近七日間の平均をとる
const calculateSleepStatus = () => {
  const logs = fs.readFileSync(path.join(dataPath, "sleepLog.csv"), "utf-8");
  const logsArr = logs.trim().split("\n");
  const start = logsArr.length - 7;
  const end = logsArr.length - 1;
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    //ログの数が七日間分ない場合
    if (i <= 0) {
      continue;
    }

    const rank = parseInt(logsArr[i].split(",")[0]);
    sum += rank;
    count += 1;
  }
  let result = Math.round(sum / count);

  //調整
  if (2 <= result) {
    result = 2;
  } else if (result <= -2) {
    result = -2;
  }

  return result;
};

//睡眠状態のコメントを返す
const createSleepStatusStr = (sleepStatus) => {
  switch (sleepStatus) {
    case -2:
      return "たすけて！";
      break;
    case -1:
      return "しんどいよう…";
      break;
    case 0:
      return "まあまあかな？";
      break;
    case 1:
      return "いいね！";
      break;
    case 2:
      return "さいこー！！！";
      break;
  }
};

module.exports = router;
