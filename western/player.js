/* Keep videos in the parsed DOM. Playback is a direct, separate user click. */
(function () {
  'use strict';
  var triggers = new WeakMap();

  function chineseCaptions(view, video) {
    if (view.dataset.captionsSet === 'true') return;
    for (var i = 0; i < video.textTracks.length; i++) {
      var track = video.textTracks[i];
      if (track.kind === 'subtitles' && /^zh/i.test(track.language)) {
        track.mode = 'showing';
        view.dataset.captionsSet = 'true';
        return;
      }
    }
  }

  function bind(view) {
    if (view.dataset.playerBound === 'true') return;
    view.dataset.playerBound = 'true';
    var video = view.querySelector('video');
    var button = view.querySelector('[data-player-toggle]');
    var status = view.querySelector('[data-player-status]');
    var captionStatus = view.querySelector('[data-caption-status]');
    function message(text) { status.textContent = text; }
    function pausedLabel() { button.textContent = video.ended ? '重新播放' : '播放影片'; }

    button.addEventListener('click', function () {
      if (!video.paused && !video.ended) { video.pause(); return; }
      if (video.error) video.load();
      if (video.ended) video.currentTime = 0;
      chineseCaptions(view, video);
      message('正在加载影片，请稍候…');
      // No await, timer, scroll, focus, or DOM replacement before play().
      var request = video.play();
      if (request && typeof request.catch === 'function') request.catch(function (error) {
        if (view.hidden) return;
        pausedLabel();
        message(error.name === 'NotAllowedError' ? '请轻点“播放影片”开始观看。' : '影片暂时无法播放，请重试或打开带字幕播放页。');
      });
    });
    video.addEventListener('loadedmetadata', function () { chineseCaptions(view, video); });
    video.addEventListener('playing', function () {
      chineseCaptions(view, video);
      button.textContent = '暂停影片';
      message('正在播放');
    });
    video.addEventListener('pause', function () { pausedLabel(); message('已暂停，可继续播放。'); });
    video.addEventListener('ended', function () { pausedLabel(); message('影片已播放完。'); });
    video.addEventListener('waiting', function () { message('正在缓冲，请稍候…'); });
    video.addEventListener('error', function () { pausedLabel(); message('影片暂时无法加载，请重试或打开带字幕播放页。'); });
    var subtitle = view.querySelector('track[srclang="zh"]');
    if (subtitle) subtitle.addEventListener('error', function () {
      captionStatus.hidden = false;
      captionStatus.textContent = '中文字幕暂未加载，请刷新页面重试。';
    });
    var back = view.querySelector('button[data-player-back]');
    if (back) back.addEventListener('click', function () {
      var root = view.closest('.screen');
      video.pause();
      view.hidden = true;
      root.querySelector(view.dataset.overview).hidden = false;
      if (typeof window.scrollWesternTop === 'function') window.scrollWesternTop();
      var trigger = triggers.get(view);
      if (trigger) trigger.focus({ preventScroll: true });
    });
  }

  function open(root, trigger) {
    var view = root.querySelector('[data-western-player]');
    bind(view);
    triggers.set(view, trigger);
    root.querySelector(view.dataset.overview).hidden = true;
    var oldDetail = root.querySelector(view.dataset.detail);
    if (oldDetail) oldDetail.hidden = true;
    view.hidden = false;
    chineseCaptions(view, view.querySelector('video'));
    // Opening the cover is navigation; the visible native/player button plays.
    if (typeof window.scrollWesternTop === 'function') window.scrollWesternTop();
  }

  document.querySelectorAll('[data-western-player]').forEach(bind);
  window.WesternVideoPlayer = { open: open };
  if (document.body.classList.contains('western-player-page')) {
    var requested = new URLSearchParams(window.location.search).get('film');
    var film = requested === 'story' ? 'story' : 'allin';
    document.querySelectorAll('[data-western-player]').forEach(function (view) {
      view.hidden = view.dataset.film !== film;
      if (!view.hidden) {
        chineseCaptions(view, view.querySelector('video'));
        document.title = view.querySelector('h2').textContent + ' · Western 值不值';
      }
    });
  }
})();

