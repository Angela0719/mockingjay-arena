/* Keep videos in the parsed DOM. Playback is a direct, separate user click. */
(function () {
  'use strict';
  var triggers = new WeakMap();

  function chineseCaptions(view, video) {
    if (view.dataset.captionsSet === 'true') return;
    for (var i = 0; i < video.textTracks.length; i++) {
      var track = video.textTracks[i];
      if (track.kind === 'subtitles' && /^zh/i.test(track.language)) {
        track.mode = view.querySelector('[data-player-cue]') ? 'hidden' : 'showing';
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
    var subtitleBand = view.querySelector('[data-player-cue]');
    // Hide the obsolete language picker when older HTML is still cached.
    var oldChoice = view.querySelector('.western-caption-choice');
    if (oldChoice) oldChoice.hidden = true;
    video.querySelectorAll('track').forEach(function(track){
      if (!/^zh/i.test(track.srclang)) track.remove();
    });
    var chinese = Array.from(video.textTracks).find(function(track){ return /^zh/i.test(track.language); });
    var nativeScreen = false;
    var captionsEnabled = true;
    // Older cached HTML can still rely on native Chinese subtitle controls.
    if (subtitleBand) {
      function drawCue(){
        if(!chinese || subtitleBand.hidden)return;
        subtitleBand.textContent = Array.from(chinese.activeCues || []).map(function(cue){return cue.text;}).join('\n');
      }
      function syncCaptions(){
        view.dataset.captionsSet = 'true';
        if(chinese){
          var mode = captionsEnabled ? (nativeScreen ? 'showing' : 'hidden') : 'disabled';
          if(chinese.mode !== mode)chinese.mode = mode;
        }
        subtitleBand.hidden = nativeScreen || !captionsEnabled;
        drawCue();
      }
      if(chinese)chinese.addEventListener('cuechange',drawCue);
      video.addEventListener('timeupdate',drawCue);
      video.addEventListener('seeked',drawCue);
      function fullscreenCaptions(active){nativeScreen=active;syncCaptions();}
      video.addEventListener('webkitbeginfullscreen',function(){fullscreenCaptions(true);});
      video.addEventListener('webkitendfullscreen',function(){fullscreenCaptions(false);});
      document.addEventListener('fullscreenchange',function(){fullscreenCaptions(document.fullscreenElement === video);});
      video.textTracks.addEventListener('change',function(){
        if(!chinese)return;
        captionsEnabled = chinese.mode !== 'disabled';
        if(!nativeScreen && chinese.mode === 'showing')chinese.mode = 'hidden';
        subtitleBand.hidden = nativeScreen || !captionsEnabled;
        drawCue();
      });
      syncCaptions();
    }
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
      history.replaceState(null, '', location.pathname + location.search);
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
    history.replaceState(null, '', location.pathname + location.search + '#video=' + (root.id === 'sL9' ? 'story' : 'allin'));
    chineseCaptions(view, view.querySelector('video'));
    // Opening the cover is navigation; the visible native/player button plays.
    if (typeof window.scrollWesternTop === 'function') window.scrollWesternTop();
  }

  document.querySelectorAll('[data-western-player]').forEach(bind);
  window.WesternVideoPlayer = { open: open };
  if (document.body.classList.contains('western-player-page')) {
    var requested = document.body.dataset.film || new URLSearchParams(window.location.search).get('film');
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
