// rrwebRecord 기반 녹화 함수 정의
let events = [];
let stopFn = null;

function startRecording() {
  events = [];
  if (window.rrwebRecord) {
    stopFn = window.rrwebRecord({
      emit(event) {
        events.push(event);
      },
    });
  } else {
    alert('rrwebRecord 라이브러리가 로드되지 않았습니다.');
  }
}

function stopRecording() {
  if (stopFn) {
    stopFn();
    stopFn = null;
  }
}

function getEvents() {
  return events;
}

// 버튼 생성 및 이벤트 등록
function setupRecorderUI() {
  // 컨테이너 div 생성 및 스타일 적용 (왼쪽 하단 고정)
  const btnContainer = document.createElement('div');
  btnContainer.style.position = 'fixed';
  btnContainer.style.left = '20px';
  btnContainer.style.bottom = '20px';
  btnContainer.style.zIndex = '9999';
  btnContainer.style.display = 'flex';
  btnContainer.style.flexDirection = 'column';
  btnContainer.style.gap = '10px';

  // + 버튼 (시작)
  const startBtn = document.createElement('button');
  startBtn.id = 'startBtn';
  startBtn.innerHTML = '<span style="font-size:24px;">+</span>';
  startBtn.style.width = '48px';
  startBtn.style.height = '48px';
  startBtn.style.borderRadius = '50%';
  startBtn.style.background = '#222';
  startBtn.style.color = '#fff';
  startBtn.style.border = 'none';
  startBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  startBtn.style.cursor = 'pointer';
  startBtn.style.display = 'flex';
  startBtn.style.alignItems = 'center';
  startBtn.style.justifyContent = 'center';
  startBtn.style.fontWeight = 'bold';
  startBtn.style.fontSize = '24px';

  // X 버튼 (중지)
  const stopBtn = document.createElement('button');
  stopBtn.id = 'stopBtn';
  stopBtn.innerHTML = '<span style="font-size:24px;">&#10005;</span>';
  stopBtn.style.width = '48px';
  stopBtn.style.height = '48px';
  stopBtn.style.borderRadius = '50%';
  stopBtn.style.background = '#e53935';
  stopBtn.style.color = '#fff';
  stopBtn.style.border = 'none';
  stopBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  stopBtn.style.cursor = 'pointer';
  stopBtn.style.display = 'flex';
  stopBtn.style.alignItems = 'center';
  stopBtn.style.justifyContent = 'center';
  stopBtn.style.fontWeight = 'bold';
  stopBtn.style.fontSize = '24px';
  stopBtn.style.display = 'none'; // 처음엔 숨김

  btnContainer.appendChild(startBtn);
  btnContainer.appendChild(stopBtn);
  document.body.appendChild(btnContainer);

  startBtn.addEventListener('click', () => {
    alert("녹음 시작!");
    startRecording();
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
  });

  stopBtn.addEventListener('click', () => {
    alert("녹음 중지!");
    stopRecording();
    stopBtn.style.display = 'none';
    startBtn.style.display = 'flex';
    // events 활용 예시
    console.log(getEvents());

    fetch('http://192.168.123.44:3000/save-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
    });
  });
}

setupRecorderUI();