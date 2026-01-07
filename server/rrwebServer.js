const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

app.post('/save-events', (req, res) => {
  const { events, logs, sessionInfo } = req.body;
  const downloadDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
  const timestamp = Date.now();
  const filePath = path.join(downloadDir, `rrweb-session-${timestamp}.json`);

  const sessionData = {
    events: events || [],
    logs: logs || [],
    sessionInfo: sessionInfo || {},
    timestamp: timestamp,
    version: '1.0'
  };

  fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), (err) => {
    if (err) {
      console.error('파일 저장 실패:', err);
      return res.status(500).send('파일 저장 실패');
    }
    console.log(`✅ 세션 저장 완료: ${filePath}`);
    console.log(`📊 이벤트: ${events?.length || 0}개, 로그: ${logs?.length || 0}개`);
    res.json({ 
      success: true, 
      message: '저장 완료',
      filePath: filePath 
    });
  });
});

// 세션 파일 목록 조회 API 추가
app.get('/api/sessions', (req, res) => {
  const downloadDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
  
  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '폴더 읽기 실패' });
    }
    
    const sessionFiles = files
      .filter(file => file.startsWith('rrweb-session-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(downloadDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);
    
    res.json(sessionFiles);
  });
});

// 세션 파일 다운로드 API
app.get('/api/sessions/:filename', (req, res) => {
  const downloadDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads');
  const filePath = path.join(downloadDir, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  }
  
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`🚀 서버가 http://192.168.123.44:${PORT} 에서 실행 중`);
  console.log(`📺 Player: http://192.168.123.44:${PORT}/player.html`);
  console.log(`📂 세션 저장 경로: ${path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads')}`);
});