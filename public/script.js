const audioEl = document.createElement('audio')

const player = document.getElementById('player')
const totalTimeEl = document.getElementById('total-time')
const currentTimeEl = document.getElementById('current-time')
const sliderEl = document.getElementById("slider")
const progressBarEl = document.getElementById('progress-bar')
const togglePlayEl = document.getElementById("toggle-play")
const bookListEl = document.getElementById('book-list')
const playbackRateEl = document.getElementById('playback-rate')
const bookInfoEl = document.getElementById('book-info')
const sleepTimerEl = document.getElementById('sleep-timer')

let previousSeekValue
let seekMagnitude = 0
let sleepTimer
let fadeOutInterval
let currentBook
let progressCheckInterval

const bookbum = {
  get: function (resource) {
    return fetch('/api/v1/' + resource)
      .then(function (response) {
        return response.json()
      })
      .catch(function (err) {
        console.error(err)
        goToLogin()
      })
  }
}

init()

function init() {
  listTitles()
  retrieveCurrentBook()
  audioEl.ontimeupdate = updateTime
}

function goToLogin() {
  window.location.replace('/login.html')
}

function retrieveCurrentBook() {
  currentBook = localStorage.getItem('currentBook')
  if (currentBook) {
    getBookUrl(currentBook).then(updateTime)
  }
}

function startProgressCheckInterval() {
  let previousTime
  progressCheckInterval = setInterval(function () {
    if (audioEl.currentTime > previousTime) {
      updateBookSettings()
    }
    previousTime = audioEl.currentTime
  }, 3000)
}

function updateBookSettings() {
  let settings = {
    book: bookInfoEl.innerText,
    currentTime: audioEl.currentTime,
    playbackRate: audioEl.playbackRate,
    volume: audioEl.volume
  }
  localStorage.setItem(bookInfoEl.innerText, JSON.stringify(settings))
}

function seek(event) {
  if (previousSeekValue) {
    seekMagnitude += event.touches[0].clientX - previousSeekValue
    let newTime = audioEl.currentTime + seekMagnitude * 10
    progressBarEl.style.width = 100 * newTime / audioEl.duration + '%'
    currentTimeEl.innerText = new Date(newTime * 1000)
      .toISOString()
      .substr(11, 8)
    previousSeekValue = event.touches[0].clientX
  }
  else {
    seekMagnitude = 0
    previousSeekValue = event.touches[0].clientX
    audioEl.ontimeupdate = function () { }
  }
}

function stopSeek(event) {
  audioEl.currentTime = audioEl.currentTime + seekMagnitude * 10
  audioEl.ontimeupdate = updateTime
  previousSeekValue = null
  updateBookSettings()
}

function updateTime() {
  let percentageProgress = 100 * audioEl.currentTime / audioEl.duration
  progressBarEl.style.width = percentageProgress + '%'
  currentTimeEl.innerText = new Date(audioEl.currentTime * 1000)
    .toISOString()
    .substr(11, 8)
}

function listTitles(books) {
  bookbum.get('list-books')
    .then(function (books) {
      books.forEach(function (book) {
        let div = document.createElement('div')
        div.classList.add('book')
        div.innerText = book.Key
        div.onclick = function (event) {
          getBookUrl(event.target.innerText).then(play)
        }
        bookListEl.appendChild(div)
      })
    })
}

function getBookUrl(book) {
  localStorage.setItem('currentBook', book)
  bookInfoEl.innerText = book
  return bookbum.get('book/' + book)
    .then(function (url) {
      audioEl.src = url.url
      audioEl.onloadedmetadata = function () {
        let bookSettings = JSON.parse(localStorage.getItem(book))
        if (bookSettings) {
          audioEl.currentTime = bookSettings.currentTime || 0.0
          audioEl.volume = bookSettings.volume || 1.0
          audioEl.playbackRate = bookSettings.playbackRate || 1.0
        }
        updateTotalTime()
        updateTime()
        playbackRateEl.innerText = 'X' + audioEl.playbackRate.toFixed(2)
      }
    })
}

function updateTotalTime() {
  totalTimeEl.innerText = new Date(audioEl.duration * 1000)
    .toISOString()
    .substr(11, 8)
}


function canPlayBook() {
  return audioEl !== null
    && audioEl.canPlayType
    && audioEl.canPlayType("audio/mpeg")
}

function togglePlay() {
  audioEl.paused ? play() : pause()
}

function play() {
  audioEl.volume = 1.0
  audioEl.play()
  togglePlayEl.innerText = 'PAUSE'
  startProgressCheckInterval()
}

function pause() {
  audioEl.pause()
  togglePlayEl.innerText = 'PLAY'
  clearInterval(progressCheckInterval)
}

function setVolume(volume) {
  audioEl.volume = volume
  updateBookSettings()
}

function changePlaybackRate() {
  audioEl.playbackRate = (audioEl.playbackRate > 1.75)
    ? 1
    : audioEl.playbackRate + 0.25
  playbackRateEl.innerText = 'X' + audioEl.playbackRate.toFixed(2)
  updateBookSettings()
}

function toggleSleepTimer() {
  if (sleepTimer) {
    clearTimeout(sleepTimer)
    clearInterval(fadeOutInterval)
    sleepTimerEl.classList.remove('selected')
    audioEl.volume = 1.0
    sleepTimer = false
  }
  else {
    sleepTimer = setTimeout(fadeOut, 30 * 60 * 1000)
    sleepTimerEl.classList.add('selected')
  }
}

function fadeOut() {
  fadeOutInterval = setInterval(function () {
    if (audioEl.volume <= 0.1) {
      audioEl.pause()
      togglePlayEl.innerText = 'PLAY'
      clearInterval(fadeInterval)
      return
    }
    audioEl.volume -= 0.1
  }, 2000)
}

function skipBackward() {
  audioEl.currentTime = audioEl.currentTime - 10
}

function skipForward() {
  audioEl.currentTime = audioEl.currentTime + 10
}
