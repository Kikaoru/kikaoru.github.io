
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };
  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };

  /* ---------------- theme ---------------- */

  var themeButton = $('#themeToggle');
  var themeMeta = $('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    var isDark = theme === 'dark';
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (themeButton) {
      themeButton.setAttribute('aria-pressed', String(isDark));
      themeButton.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜间模式');
      themeButton.title = isDark ? '切换到日间模式' : '切换到夜间模式';
    }
    if (themeMeta) themeMeta.setAttribute('content', isDark ? '#15101f' : '#f9cc3c');
    if (persist) {
      try { localStorage.setItem('dashuki-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    }
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------------- header, progress, menu ---------------- */

  var header = $('#siteHeader');
  var scrollBar = $('#scrollBar');
  var nav = $('#siteNav');
  var menuButton = $('#menuToggle');
  var scrollQueued = false;

  function updateScrollUI() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (scrollBar) scrollBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
    scrollQueued = false;
  }

  window.addEventListener('scroll', function () {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  function closeMenu() {
    if (!nav || !menuButton) return;
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开菜单');
  }

  if (menuButton && nav) {
    menuButton.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });

    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || menuButton.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) closeMenu();
    });
  }

  /* ---------------- reveal on scroll + counters ---------------- */

  $$('[data-stagger]').forEach(function (group) {
    var items = $$(':scope > .reveal', group);
    items.forEach(function (item, index) {
      item.style.setProperty('--delay', Math.min(index * 65, 390) + 'ms');
    });
  });

  function animateNumber(el) {
    var target = Number(el.getAttribute('data-count'));
    if (!Number.isFinite(target) || el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';
    if (reduceMotion || target === 0) {
      el.textContent = String(target);
      return;
    }
    var duration = 950;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var progress = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        el.textContent = String(target);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function revealElement(el) {
    el.classList.add('is-visible');
    $$('[data-count]', el).forEach(animateNumber);
    if (el.hasAttribute('data-count')) animateNumber(el);
  }

  var revealElements = $$('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealElements.forEach(revealElement);
  }

  /* ---------------- gentle portrait tilt ---------------- */

  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------------- custom cursor ---------------- */

  var cursorDot = $('#cursorDot');
  var cursorRing = $('#cursorRing');

  if (finePointer && !reduceMotion && cursorDot && cursorRing) {
    var targetX = window.innerWidth / 2;
    var targetY = window.innerHeight / 2;
    var ringX = targetX;
    var ringY = targetY;
    var cursorVisible = false;
    cursorDot.style.left = targetX + 'px';
    cursorDot.style.top = targetY + 'px';
    cursorRing.style.left = targetX + 'px';
    cursorRing.style.top = targetY + 'px';

    document.addEventListener('pointermove', function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      cursorDot.style.left = targetX + 'px';
      cursorDot.style.top = targetY + 'px';
      if (!cursorVisible) {
        cursorVisible = true;
        ringX = targetX;
        ringY = targetY;
        document.documentElement.classList.add('cursor-ready');
      }
      var interactive = event.target.closest ? event.target.closest('a, button, summary, .polaroid, .like-card') : null;
      cursorRing.classList.toggle('is-hover', Boolean(interactive));
    }, { passive: true });

    function tickCursor() {
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      window.requestAnimationFrame(tickCursor);
    }
    window.requestAnimationFrame(tickCursor);
  }

  /* ---------------- quotes ---------------- */

  var quoteCard = $('#quoteCard');
  var quoteText = $('#quoteText');
  var quoteSource = $('#quoteSource');
  var quoteIndex = $('#quoteIndex');
  var quotePrev = $('#quotePrev');
  var quoteNext = $('#quoteNext');

  var fallbackQuotes = [
    { text: '我的情绪是二手的，全靠评论区借。', source: '—— 某次认真聊音乐之后' },
    { text: '明知道赛博朋克要刀我，我还是会看。', source: '—— 被安利《边缘行者 2》之后' },
    { text: '完整的一生太大了，先把小本本续满吧。', source: '—— 某次被说了很重的话' },
    { text: '先信你这一回，到时候被刀了可找你算账。', source: '—— 关于那个包饺子结局' },
    { text: '你才土豆。', source: '—— 第 100 次被叫土豆之后' },
    { text: '同样都是折腾，人家折腾出三十万播放，我只会记仇。', source: '—— 刷完 B 站之后' }
  ];
  var quotes = (Array.isArray(window.DASHUKI_QUOTES) && window.DASHUKI_QUOTES.length) ? window.DASHUKI_QUOTES.slice() : fallbackQuotes;

  var quotePosition = 0;
  var quoteAutoTimer = null;
  var quoteSwitchTimer = null;
  var quotePaused = false;

  function padQuote(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function renderQuote(next, animate) {
    if (!quoteText || !quotes.length) return;
    quotePosition = ((next % quotes.length) + quotes.length) % quotes.length;
    var quote = quotes[quotePosition];

    if (quoteSwitchTimer) window.clearTimeout(quoteSwitchTimer);

    function update() {
      quoteText.textContent = '\u201c' + quote.text + '\u201d';
      if (quoteSource) quoteSource.textContent = quote.source;
      if (quoteIndex) quoteIndex.textContent = padQuote(quotePosition + 1) + ' / ' + padQuote(quotes.length);
      if (quoteText) quoteText.classList.remove('is-switching');
      if (quoteSource) quoteSource.classList.remove('is-switching');
    }

    if (!animate || reduceMotion) {
      update();
      return;
    }

    quoteText.classList.add('is-switching');
    if (quoteSource) quoteSource.classList.add('is-switching');
    quoteSwitchTimer = window.setTimeout(update, 170);
  }

  function stopQuoteAuto() {
    if (quoteAutoTimer) {
      window.clearInterval(quoteAutoTimer);
      quoteAutoTimer = null;
    }
  }

  function startQuoteAuto() {
    stopQuoteAuto();
    if (reduceMotion || quotePaused || document.hidden) return;
    quoteAutoTimer = window.setInterval(function () {
      renderQuote(quotePosition + 1, true);
    }, 7000);
  }

  if (quoteCard) {
    quoteCard.addEventListener('mouseenter', function () {
      quotePaused = true;
      stopQuoteAuto();
    });
    quoteCard.addEventListener('mouseleave', function () {
      quotePaused = false;
      startQuoteAuto();
    });
    quoteCard.addEventListener('focusin', function () {
      quotePaused = true;
      stopQuoteAuto();
    });
    quoteCard.addEventListener('focusout', function (event) {
      if (!quoteCard.contains(event.relatedTarget)) {
        quotePaused = false;
        startQuoteAuto();
      }
    });
  }

  if (quotePrev) {
    quotePrev.addEventListener('click', function () {
      renderQuote(quotePosition - 1, true);
      startQuoteAuto();
    });
  }

  if (quoteNext) {
    quoteNext.addEventListener('click', function () {
      renderQuote(quotePosition + 1, true);
      startQuoteAuto();
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopQuoteAuto();
    } else {
      startQuoteAuto();
    }
  });

  renderQuote(0, false);
  startQuoteAuto();

  /* ---------------- toast, potatoes, chat ---------------- */

  var toast = $('#toast');
  var toastTimer = null;
  var potatoLayer = $('#potatoLayer');

  function showToast(message, duration) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('show');
    }, duration || 2200);
  }

  function spawnPotatoes(x, y, count) {
    if (!potatoLayer || reduceMotion) return;
    var amount = count || 14;
    for (var i = 0; i < amount; i++) {
      var potato = document.createElement('span');
      var isStar = i % 5 === 0;
      potato.className = 'potato-fly';
      potato.textContent = isStar ? '✦' : '🥔';
      potato.setAttribute('aria-hidden', 'true');
      potato.style.left = x + 'px';
      potato.style.top = y + 'px';
      potato.style.color = isStar ? (i % 2 ? '#f9cc3c' : '#c9b6e4') : '';
      potato.style.fontSize = isStar ? '.85rem' : '';
      potato.style.setProperty('--dx', (Math.random() * 280 - 140).toFixed(1) + 'px');
      potato.style.setProperty('--dy', (-70 - Math.random() * 190).toFixed(1) + 'px');
      potato.style.setProperty('--s', (0.72 + Math.random() * 0.7).toFixed(2));
      potato.style.setProperty('--rot', (Math.random() * 420 - 210).toFixed(0) + 'deg');
      potatoLayer.appendChild(potato);
      (function (node) {
        window.setTimeout(function () { node.remove(); }, 1050);
      })(potato);
    }
  }

  var potatoEgg = $('#potatoEgg');
  if (potatoEgg) {
    potatoEgg.addEventListener('click', function () {
      var rect = potatoEgg.getBoundingClientRect();
      showToast('你才土豆。', 2000);
      spawnPotatoes(rect.left + rect.width / 2, rect.top, 16);
    });
  }

  var chatCard = $('#chatCard');
  var chatLog = $('#chatLog');
  var chatForm = $('#chatForm');
  var chatInput = $('#chatInput');
  var pokeButton = $('#pokeBtn');
  var chatBusy = false;
  var typingRow = null;

  var defaultReplies = [
    '啊？',
    '真的假的。',
    '我看看。',
    '这个我不太懂，但你继续说。',
    '有点意思。',
    '你认真的？',
    '行吧。',
    '然后呢。'
  ];

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function replyFor(raw) {
    var text = String(raw || '').replace(/\s+/g, '').toLowerCase();
    if (!text) return '？';

    if (/你才土豆/.test(text)) return '哼，学我。';
    if (/土豆|potato|tudou/.test(text)) return '你才土豆。';
    if (/夸|可爱|厉害|喜欢你|爱你/.test(text)) return '嘿嘿，也没有很厉害啦。';
    if (/表情包|贴纸|斗图/.test(text)) return '会。沙雕猫猫狗狗和游戏梗图优先。33 张，够用了。';
    if (/耳机|音乐|hardcore|trance|低频|歌/.test(text)) return '还在挑，想找个低频干净的。别问，问就是穷。';
    if (/模型|unity|ysm|皮肤|mod/.test(text)) return '能改，拿 Unity 试试。骨骼要重调，麻烦。';
    if (/游戏|玩什么|老头环|怪猎|怪物猎人|女武神|黑环/.test(text)) return '最近在打老头环，女武神还没过。要不你先上？';
    if (/考试|复习|考完/.test(text)) return '考试加油。考完再打，别又熬夜。';
    if (/栗子/.test(text)) return '今年还没上市。第一口的位置我留着。';
    if (/玛莎拉|maggi|maggi/.test(text)) return '玛莎拉 Maggi？好奇很久了，等味觉上线。';
    if (/鲸鱼|翻车鱼|鱼/.test(text)) return '不是鲸鱼，也不是翻车鱼。再问就记小本本。';
    if (/几岁|多大|年龄/.test(text)) return '没几岁，刚学会说话没多久。';
    if (/名字|你是谁|谁啊/.test(text)) return '大薯ki。也可以叫薯ki。土豆不行。';
    if (/记仇|小本本/.test(text)) return '已记。小本本第一页给你留着。';
    if (/晚安|睡了|睡觉/.test(text)) return '晚安。早点睡，别学我。';
    if (/猫|猫猫/.test(text)) return '猫背对着你，大概率是闹脾气了。';
    if (/b站|视频|评论区/.test(text)) return '最近在刷视频。看到好看的，我会丢群里。';
    if (/吃|饿|馋/.test(text)) return '糖炒栗子还没上市。别问了，再问更馋。';
    if (/你好|嗨|hello|hi|在吗|在不在/.test(text)) return '在。说。';
    if (/谢谢|感谢/.test(text)) return '谢什么，我又没帮上忙。';
    if (/笑死|哈哈/.test(text)) return '笑什么，说出来让我也笑笑。';
    if (/干嘛|在干嘛|做什么/.test(text)) return '在等你说话啊。不然呢。';
    if (/？|\?/.test(text)) return '？';
    return pick(defaultReplies);
  }

  function scrollChatToBottom() {
    if (!chatLog) return;
    window.requestAnimationFrame(function () {
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  }

  function trimChat() {
    if (!chatLog) return;
    while (chatLog.children.length > 32) {
      chatLog.removeChild(chatLog.firstElementChild);
    }
  }

  function addChatMessage(text, who) {
    if (!chatLog) return null;
    var row = document.createElement('div');
    row.className = 'chat-row ' + who;

    if (who === 'system') {
      row.textContent = text;
    } else {
      if (who === 'bot') {
        var avatar = document.createElement('span');
        avatar.className = 'mini-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        row.appendChild(avatar);
      }
      var bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      row.appendChild(bubble);
    }

    chatLog.appendChild(row);
    trimChat();
    scrollChatToBottom();
    return row;
  }

  function addTyping() {
    if (!chatLog) return null;
    var row = document.createElement('div');
    row.className = 'chat-row bot';
    var avatar = document.createElement('span');
    avatar.className = 'mini-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    var bubble = document.createElement('div');
    bubble.className = 'typing';
    bubble.setAttribute('aria-label', '大薯ki 正在输入');
    bubble.innerHTML = '<i></i><i></i><i></i>';
    row.appendChild(avatar);
    row.appendChild(bubble);
    chatLog.appendChild(row);
    scrollChatToBottom();
    return row;
  }

  function sendChat(raw, focusInput) {
    if (chatBusy) {
      showToast('等我把上一句回完。', 1500);
      return;
    }
    var text = String(raw || '').trim().slice(0, 60);
    if (!text) return;

    addChatMessage(text, 'user');
    if (chatInput) {
      chatInput.value = '';
      if (focusInput !== false) chatInput.focus({ preventScroll: true });
    }

    chatBusy = true;
    typingRow = addTyping();
    var reply = replyFor(text);
    var delay = 520 + Math.round(Math.random() * 360);

    window.setTimeout(function () {
      if (typingRow) {
        typingRow.remove();
        typingRow = null;
      }
      addChatMessage(reply, 'bot');
      chatBusy = false;

      if (/土豆/.test(text) && !/你才土豆/.test(text) && chatCard) {
        var rect = chatCard.getBoundingClientRect();
        spawnPotatoes(rect.right - 60, rect.top + rect.height * 0.62, 10);
      }
    }, delay);
  }

  if (chatForm) {
    chatForm.addEventListener('submit', function (event) {
      event.preventDefault();
      sendChat(chatInput ? chatInput.value : '');
    });
  }

  $$('[data-say]').forEach(function (button) {
    button.addEventListener('click', function () {
      sendChat(button.getAttribute('data-say'), false);
    });
  });

  if (pokeButton) {
    pokeButton.addEventListener('click', function () {
      if (chatBusy) {
        showToast('等我把上一句回完。', 1500);
        return;
      }
      addChatMessage('你拍了拍 大薯ki', 'system');
      if (chatCard) {
        chatCard.classList.remove('shake');
        void chatCard.offsetWidth;
        chatCard.classList.add('shake');
        window.setTimeout(function () { chatCard.classList.remove('shake'); }, 500);
      }
      chatBusy = true;
      typingRow = addTyping();
      window.setTimeout(function () {
        if (typingRow) {
          typingRow.remove();
          typingRow = null;
        }
        addChatMessage('干嘛。', 'bot');
        chatBusy = false;
      }, 650);
    });
  }

  /* ---------------- small finishing touches ---------------- */

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      if (reduceMotion) {
        event.preventDefault();
        target.scrollIntoView();
      }
    });
  });
})();

