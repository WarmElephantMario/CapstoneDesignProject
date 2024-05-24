const express = require("express");
const path = require("path");
const port = process.env.PORT || 5000;

// express 객체 생성
const app = express();

// demo 폴더의 절대 경로를 구합니다.
const demoPath = path.join(__dirname, "../client/build");

app.use(express.static(demoPath));

app.get("/", function (req, res, next) {
  res.sendFile(path.join(demoPath, "index.html"));
});

app.listen(port, function () {
  console.log("server works on port :" + port);
});
