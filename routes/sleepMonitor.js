var express = require("express");
var router = express.Router();
const path = require("path");
const fs = require("fs");

const dataPath = path.join("..", "healthData");

/* GET home page. */
router.get("/", function (req, res, next) {
  const sleepStatus = 0;
  const neko = "mike";

  const resData = {
    title: "睡眠監視にゃんこ",
    neko: neko,
    sleepStatus: sleepStatus,
  };
  res.render("sleepMonitor", resData);
});

//post 睡眠開始時間ボタンより
router.post("/", (req, res, next) => {
  const reqSleepStart = req.body.sleepStart;

  const asleepTime = new Date();
  const sleepRank = judgeSleepRank(asleepTime);
  console.log(sleepRank);
  writeSleepLog(asleepTime, sleepRank);

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

const writeSleepLog = (asleepDate, rank) => {
  const asleepYear = asleepDate.getFullYear();
  const asleepMonth = asleepDate.getMonth() + 1; // 月は0から始まるため、1を加える
  const asleepDay = asleepDate.getDate();
  const asleepHours = asleepDate.getHours();
  const asleepMinutes = asleepDate.getMinutes();
  const asleepSeconds = asleepDate.getSeconds();

  const logTxt = `${rank}, ${asleepYear}, ${asleepMonth}, ${asleepDay}, ${asleepHours}, ${asleepMinutes}, ${asleepSeconds}`;

  fs.appendFile(path.join(dataPath, "sleepLog.csv"), logTxt);
};

module.exports = router;
