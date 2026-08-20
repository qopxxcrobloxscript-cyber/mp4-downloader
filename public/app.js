// public/app.js

const urlInput = document.getElementById('url');
const keyInput = document.getElementById('key');
const infoBtn = document.getElementById('infoBtn');
const dlBtn = document.getElementById('dlBtn');
const statusEl = document.getElementById('status');
const formatsEl = document.getElementById('formats');
const qualitySelect = document.getElementById('quality');

// 最初からダウンロードボタンを有効
dlBtn.disabled = false;

// 情報取得（任意・なくてもダウンロード可能）
infoBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const key = keyInput.value.trim();

  if (!url || !key) {
    alert('URLとAPIキーを入力してください');
    return;
  }

  statusEl.textContent = '動画情報を取得中...';
  formatsEl.innerHTML = '';
  qualitySelect.innerHTML = '';

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `エラー: ${res.status}`);
    }

    const data = await res.json();
    statusEl.textContent = `タイトル: ${data.title || '不明'}`;

    if (!data.formats || data.formats.length === 0) {
      formatsEl.innerHTML = '<p>利用可能な画質が見つかりませんでした</p>';
      return;
    }

    let html = '<p><strong>利用可能な画質:</strong></p><ul>';
    data.formats.forEach(f => {
      const type = f.isHls ? 'HLS → MP4変換' : 'MP4';
      html += `<li>${f.quality}p （${type}）</li>`;
    });
    html += '</ul>';
    formatsEl.innerHTML = html;

    qualitySelect.innerHTML = '<option value="">自動選択</option>';
    data.formats
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.quality;
        opt.textContent = `${f.quality}p ${f.isHls ? '(HLS→MP4)' : '(MP4)'}`;
        qualitySelect.appendChild(opt);
      });

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'エラー: ' + err.message;
  }
});

// ダウンロード（情報取得なしでもOK）
dlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const key = keyInput.value.trim();
  const quality = qualitySelect.value || null; // 空ならnull

  if (!url || !key) {
    alert('URLとAPIキーを入力してください');
    return;
  }

  statusEl.textContent = 'ダウンロード準備中...（変換に時間がかかる場合があります）';
  dlBtn.disabled = true;
  infoBtn.disabled = true;

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      },
      body: JSON.stringify({ url, quality })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `エラー: ${res.status}`);
    }

    // ファイル名
    const disposition = res.headers.get('Content-Disposition');
    let filename = 'video.mp4';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
      }
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // ① ファイルダウンロード
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // ② 新しいタブで開く
    setTimeout(() => {
      window.open(blobUrl, '_blank');
      statusEl.textContent = 'ダウンロードを開始しました。新しいタブでも開きました。\n（iPhoneの場合は長押しして保存してください）';
    }, 300);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'エラー: ' + err.message;
  } finally {
    dlBtn.disabled = false;
    infoBtn.disabled = false;
  }
});
