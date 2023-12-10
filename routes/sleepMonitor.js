var express = require("express");
var router = express.Router();
const path = require("path");
const fs = require("fs");
const { create } = require("domain");

const dataPath = path.join("healthData", "sleepMonitor");

/* GET home page. */
router.get("/", function (req, res, next) {
  const neko = "mike";

  //前回の睡眠開始時刻とランクのログを読みだす
  const latestLogObj = readLatestLog();
  const latestSleepTime = createLatestSleepTime(latestLogObj);
  const sleepStatus = calculateSleepStatus();
  const sleepStatusStr = createSleepStatusStr(sleepStatus);
  console.log(sleepStatusStr);
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
  console.log(`${asleepHH}: ${asleepMM}: ${asleepSS}`);
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
  const asleepYear = asleepDate.getFullYear();
  const asleepMonth = asleepDate.getMonth() + 1; // 月は0から始まるため、1を加える
  const asleepDay = asleepDate.getDate();
  const asleepHours = asleepDate.getHours();
  const asleepMinutes = asleepDate.getMinutes();
  const asleepSeconds = asleepDate.getSeconds();

  const logTxt = `\n${rank}, ${asleepYear}, ${asleepMonth}, ${asleepDay}, ${asleepHours}, ${asleepMinutes}, ${asleepSeconds}`;

  //追記
  fs.appendFile(path.join(dataPath, "sleepLog.csv"), logTxt, (err) => {
    if (err) {
      console.error("睡眠ログを記録できなかった");
      console.error(err);
      return;
    }
    console.log("睡眠ログを記録した");
  });
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
    console.log(`sum ${sum} count ${count}`);
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
