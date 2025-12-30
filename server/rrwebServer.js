const express = require('express');
const cors = require('cors'); // 추가
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// JSON body 파싱
app.use(cors()); // 모든 도메인 허용
app.use(express.json({ limit: '50mb' }));

app.post('/save-events', (req, res) => {

  const events = req.body.events;
  const downloadDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
  const timestamp = Date.now();
  const filePath = path.join(downloadDir, `rrweb-events-${timestamp}.json`);

  fs.writeFile(filePath, JSON.stringify(events, null, 2), (err) => {
    if (err) {
      return res.status(500).send('파일 저장 실패');
    }
    res.send('저장 완료');
  });
});

app.listen(PORT, () => {
  console.log(`서버가 http://192.168.123.44:${PORT} 에서 실행 중`);
});