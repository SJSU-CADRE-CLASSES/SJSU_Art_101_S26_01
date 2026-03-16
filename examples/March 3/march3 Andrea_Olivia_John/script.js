const scenes = {
  landing: document.getElementById("scene-landing"),
  booth: document.getElementById("scene-booth"),
  year: document.getElementById("scene-year"),
};

const boothEl = document.querySelector(".booth");
const displayEl = document.querySelector(".display");

const enterBoothBtn = document.getElementById("enter-booth-btn");
const exitBoothBtn = document.getElementById("exit-booth-btn");
const backToBoothBtn = document.getElementById("back-to-booth-btn");
const returnHomeBtn = document.getElementById("return-home-btn");

const displayYearEl = document.getElementById("display-year");
const yearTitleEl = document.getElementById("year-title");
const yearHeadlineEl = document.getElementById("year-headline");
const yearLegeEl = document.getElementById("year-lede");
const yearHighlightsEl = document.getElementById("year-highlights");
const yearVibesEl = document.getElementById("year-vibes");
const yearEraLabelEl = document.getElementById("year-era-label");
const yearFooterNoteEl = document.getElementById("year-footer-note");

const highlightTemplate = document.getElementById("highlight-item-template");
const vibeTemplate = document.getElementById("vibe-item-template");

const keypad = document.querySelector(".dial__keys");
const presetButtons = Array.from(document.querySelectorAll(".chip"));

let dialBuffer = "";

const YEAR_DATA = {
  1969: {
    headline: "One small step for man, one giant leap for rock & roll.",
    lede: "Humanity lands on the Moon, Woodstock rewires music, and bell‑bottoms become a way of life.",
    highlights: [
      {
        title: "Apollo 11 Moon Landing",
        summary:
          "Neil Armstrong and Buzz Aldrin walk on the Moon, broadcasting a truly cosmic TV event back to Earth.",
        linkText: "Relive the broadcast",
        url: "https://www.nasa.gov/specials/apollo50th/",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/a/a1/Apollo_11_bootprint.jpg",
      },
      {
        title: "Woodstock Festival",
        summary:
          "Half a million people gather for three days of peace, music, and legendary performances in New York.",
        linkText: "See the lineup",
        url: "https://www.rollingstone.com/music/music-lists/woodstock-artist-performance-history-867563/",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/4/4a/Woodstock_redmond_stage.JPG",
      },
      {
        title: "ARPANET Beginnings",
        summary:
          "The foundations of the internet are laid as the ARPANET project starts to take shape.",
        linkText: "Peek at proto‑internet",
        url: "https://www.computerhistory.org/internethistory/1960s/",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/8/8a/Arpanet_logical_map%2C_march_1977.png",
      },
    ],
    vibes: [
      "Tie‑dye everything, everywhere.",
      "Guitars plugged into way too many amps.",
      "A sense that the future just got a lot bigger.",
    ],
    eraLabel: "Far Out Past",
    footer:
      "Careful where you park the booth—landing on the Moon requires precise calculations, dude.",
  },
  1989: {
    headline: "Late‑80s synths, arcade cabinets, and excellent adventures.",
    lede: "The Cold War thaws, gaming levels up, and two dudes travel through time in a phone booth.",
    highlights: [
      {
        title: "Bill & Ted's Excellent Adventure",
        summary:
          "Our time‑travel heroes hit theaters, reminding everyone that history can be totally bodacious.",
        linkText: "Watch the trailer",
        url: "https://www.youtube.com/results?search_query=bill+and+ted+excellent+adventure+trailer",
        image:
          "https://upload.wikimedia.org/wikipedia/en/3/3c/Bill_%26_Ted%27s_Excellent_Adventure_%281989%29_theatrical_poster.jpg",
      },
      {
        title: "Game Boy Arrives",
        summary:
          "Nintendo releases the Game Boy, putting Tetris and Mario in pockets all over the world.",
        linkText: "See the original ad",
        url: "https://www.youtube.com/results?search_query=game+boy+1989+commercial",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/0/0b/Game-Boy-FL.jpg",
      },
      {
        title: "Fall of the Berlin Wall",
        summary:
          "A defining moment in modern history as people begin dismantling the Berlin Wall by hand.",
        linkText: "Read the story",
        url: "https://www.history.com/topics/cold-war/berlin-wall",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/4/4c/Berlin-Wall-4.jpg",
      },
    ],
    vibes: [
      "Neon windbreakers and high‑top sneakers.",
      "Synthwave soundtracks and arcade high scores.",
      "History reports that are way more interesting than homework.",
    ],
    eraLabel: "Most Excellent Era",
    footer:
      "If you see Bill and Ted, remind them to wind their watch, okay?",
  },
  1992: {
    headline: "Grunge guitars, 16‑bit consoles, and the dawn of the web.",
    lede: "1992 brings us culture‑shaping albums, iconic games, and the moment the world wide web goes public.",
    highlights: [
      {
        title: "The Public World Wide Web",
        summary:
          "CERN releases the World Wide Web software into the public domain, opening the door to the internet you know today.",
        linkText: "See the first website",
        url: "https://info.cern.ch/hypertext/WWW/TheProject.html",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/0/0c/WorldWideWeb_FSF_GNU.png",
      },
      {
        title: "Sonic the Hedgehog 2",
        summary:
          "Sonic 2 launches on the Sega Genesis, defining couch co‑op chaos and split‑second platforming.",
        linkText: "Check out retro footage",
        url: "https://www.youtube.com/results?search_query=sonic+the+hedgehog+2+1992",
        image:
          "https://upload.wikimedia.org/wikipedia/en/7/7c/Sonic_the_Hedgehog_2_cover.png",
      },
      {
        title: "Nirvana, Pearl Jam & Grunge",
        summary:
          "Grunge dominates the airwaves as bands like Nirvana and Pearl Jam turn distortion up to eleven.",
        linkText: "Explore the 1992 sound",
        url: "https://open.spotify.com/search/1992%20grunge",
        image:
          "https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg",
      },
    ],
    vibes: [
      "Flannel shirts over band tees.",
      "Cartridges that you absolutely blow into even though you're not supposed to.",
      "Dial‑up tones echoing from chunky beige PCs.",
    ],
    eraLabel: "Early 90s Zone",
    footer:
      "Remember to log off before you leave 1992—those dial‑up minutes aren't free, dude.",
  },
  2001: {
    headline: "MP3 players, early broadband, and cinematic magic.",
    lede: "The world moves online faster, fantasy epics hit the big screen, and portable music takes a huge leap.",
    highlights: [
      {
        title: "The First iPod",
        summary:
          "Apple releases the iPod, promising '1,000 songs in your pocket' and reshaping how we listen to music.",
        linkText: "See the original keynote",
        url: "https://www.youtube.com/results?search_query=ipod+introduction+2001",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/1/1e/Ipod_with_coins.jpg",
      },
      {
        title: "The Fellowship of the Ring",
        summary:
          "Middle‑earth arrives in cinemas, setting a new bar for fantasy filmmaking.",
        linkText: "Watch a classic trailer",
        url: "https://www.youtube.com/results?search_query=fellowship+of+the+ring+trailer",
        image:
          "https://upload.wikimedia.org/wikipedia/en/8/87/Ringstrilogyposter.jpg",
      },
      {
        title: "Wikipedia Launches",
        summary:
          "A massive, collaborative encyclopedia appears online, changing how we look up basically everything.",
        linkText: "Visit Wikipedia’s first edit",
        url: "https://en.wikipedia.org/wiki/Wikipedia:About",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png",
      },
    ],
    vibes: [
      "Mix CDs and carefully curated playlists.",
      "CRT monitors humming on big desks.",
      "Fantasy movie marathons with way too much popcorn.",
    ],
    eraLabel: "Turn of the Millennium",
    footer:
      "Do not attempt to sync the time booth with your MP3 player. Side effects may include temporal desync.",
  },
  2015: {
    headline: "Streaming takes over and everyone’s a creator.",
    lede: "The mid‑2010s see 4K screens, binge‑watch culture, and phones that are basically portable studios.",
    highlights: [
      {
        title: "Streaming Era in Full Swing",
        summary:
          "Services like Netflix redefine 'TV night' as entire seasons drop at once.",
        linkText: "Browse 2015 hits",
        url: "https://en.wikipedia.org/wiki/2015_in_television",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/9/9e/Netflix_2015_logo.svg",
      },
      {
        title: "Hoverboard‑ish Tech",
        summary:
          "Back to the Future II’s 2015 arrives, and companies race to build their own 'hoverboards'—with mixed results.",
        linkText: "See the 2015 hype",
        url: "https://www.youtube.com/results?search_query=real+hoverboard+2015",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/3/39/Hoverboard_Tech_Toyz.jpg",
      },
      {
        title: "4K & VR Go Mainstream",
        summary:
          "Crisp displays and consumer VR headsets change how we watch, play, and explore digital worlds.",
        linkText: "Look back at early VR",
        url: "https://www.youtube.com/results?search_query=oculus+rifts+2015+demo",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/8/8d/Oculus_Rift_CV1.jpg",
      },
    ],
    vibes: [
      "Endless scrolls through social feeds.",
      "Group chats replacing phone calls.",
      "Binge‑watching an entire season in a weekend.",
    ],
    eraLabel: "Almost Now",
    footer:
      "Please do not let the booth auto‑post your timeline jumps to social media.",
  },
  2024: {
    headline: "AI copilots, multi‑verses, and the age of remixing everything.",
    lede: "Creative tools powered by AI, virtual concerts, and communities forming across realities—physical and digital.",
    highlights: [
      {
        title: "Everyday AI Assistants",
        summary:
          "From coding buddies to image generators, AI tools become part of daily creative workflows.",
        linkText: "Explore modern AI tools",
        url: "https://www.cursor.sh",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/4/4e/Artificial_Intelligence_%26_AI_%26_Machine_Learning_-_30212411048.jpg",
      },
      {
        title: "Retro Nostalgia Comes Full Circle",
        summary:
          "Vinyl, cassettes, and pixel art return in a big way, blending old aesthetics with new tech.",
        linkText: "See the retro revival",
        url: "https://www.youtube.com/results?search_query=retro+tech+revival",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/5/51/Assorted_Cassette_Tapes.jpg",
      },
      {
        title: "Virtual Worlds & Events",
        summary:
          "From online concerts to shared digital spaces, people hang out and create together beyond geography.",
        linkText: "Visit a virtual venue",
        url: "https://www.roblox.com/discover",
        image:
          "https://upload.wikimedia.org/wikipedia/commons/1/16/Roblox_logo_2022.svg",
      },
    ],
    vibes: [
      "Analog cameras next to flagship smartphones.",
      "Playlists generated with help from algorithms—and then hand‑tuned.",
      "Side projects everywhere, from games to zines.",
    ],
    eraLabel: "Your Current Timeline",
    footer:
      "You’ve reached your home time. But nothing says you can’t take another lap through the Circuits of Time.",
  },
};

function showScene(name) {
  Object.values(scenes).forEach((el) => {
    el.classList.add("scene--hidden");
  });
  scenes[name].classList.remove("scene--hidden");
}

function updateDisplayFromBuffer() {
  if (!dialBuffer) {
    displayYearEl.textContent = "----";
  } else {
    displayYearEl.textContent = dialBuffer.padEnd(4, "_");
  }
}

function setYear(year) {
  const info = YEAR_DATA[year];
  yearTitleEl.textContent = year;

  if (info) {
    yearHeadlineEl.textContent = info.headline;
    yearLegeEl.textContent = info.lede;
    yearEraLabelEl.textContent = info.eraLabel || "Past";
    yearFooterNoteEl.textContent =
      info.footer ||
      "Temporal tourism is totally at your own risk, dude.";

    yearHighlightsEl.innerHTML = "";
    info.highlights.forEach((h) => {
      const node = highlightTemplate.content.cloneNode(true);
      const card = node.querySelector(".highlight");
      const imageEl = node.querySelector(".highlight__image");
      const title = node.querySelector(".highlight__title");
      const summary = node.querySelector(".highlight__summary");
      const link = node.querySelector(".highlight__link");

      if (h.image) {
        imageEl.src = h.image;
        imageEl.alt = h.title;

        imageEl.onerror = () => {
          const media = imageEl.parentElement;
          imageEl.remove();
          media.classList.add("highlight__media--fallback");
        };
      } else {
        const media = imageEl.parentElement;
        imageEl.remove();
        media.classList.add("highlight__media--fallback");
      }

      title.textContent = h.title;
      summary.textContent = h.summary;
      link.textContent = h.linkText;
      link.href = h.url;

      if (card && h.url) {
        card.addEventListener("click", (evt) => {
          const clickedLink = evt.target.closest(".highlight__link");
          if (clickedLink) return;
          window.open(h.url, "_blank", "noopener,noreferrer");
        });
      }

      yearHighlightsEl.appendChild(node);
    });

    yearVibesEl.innerHTML = "";
    info.vibes.forEach((v) => {
      const node = vibeTemplate.content.cloneNode(true);
      const text = node.querySelector(".aside__text");
      text.textContent = v;
      yearVibesEl.appendChild(node);
    });
  } else {
    yearHeadlineEl.textContent = "Time circuits misaligned.";
    yearLegeEl.textContent =
      "The booth doesn't have that year pre‑loaded. Try one of the highlighted years or a four‑digit year between 1900–2099.";
    yearEraLabelEl.textContent = "Unknown Era";
    yearFooterNoteEl.textContent =
      "Sometimes the best adventures are in well‑charted timelines.";
    yearHighlightsEl.innerHTML = "";
    yearVibesEl.innerHTML = "";
  }

  showScene("year");

  const yearCard = document.querySelector(".year-card");
  if (yearCard) {
    yearCard.classList.remove("year-card--warp");
    // force reflow to restart animation
    // eslint-disable-next-line no-unused-expressions
    yearCard.offsetWidth;
    yearCard.classList.add("year-card--warp");
  }
}

function handleDialKey(key) {
  if (key === "clear") {
    dialBuffer = "";
    updateDisplayFromBuffer();
    return;
  }

  if (key === "dial") {
    if (dialBuffer.length === 4) {
      const year = parseInt(dialBuffer, 10);
      if (boothEl) {
        boothEl.classList.remove("booth--shake");
        boothEl.offsetWidth;
        boothEl.classList.add("booth--shake");
      }
      if (displayEl) {
        displayEl.classList.remove("display--pulse");
        displayEl.offsetWidth;
        displayEl.classList.add("display--pulse");
      }
      setYear(year);
    }
    return;
  }

  if (!/^\d$/.test(key)) return;

  if (dialBuffer.length < 4) {
    dialBuffer += key;
    updateDisplayFromBuffer();
  }
}

enterBoothBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  showScene("booth");
});

document
  .getElementById("scene-landing")
  .addEventListener("click", (event) => {
    if (event.target.closest(".booth")) {
      showScene("booth");
    }
  });

exitBoothBtn.addEventListener("click", () => {
  dialBuffer = "";
  updateDisplayFromBuffer();
  showScene("landing");
});

backToBoothBtn.addEventListener("click", () => {
  showScene("booth");
});

returnHomeBtn.addEventListener("click", () => {
  dialBuffer = "";
  updateDisplayFromBuffer();
  showScene("landing");
});

keypad.addEventListener("click", (event) => {
  const key = event.target.closest(".key");
  if (!key) return;
  const value = key.getAttribute("data-key");
  handleDialKey(value);
});

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const year = btn.getAttribute("data-year");
    dialBuffer = year;
    updateDisplayFromBuffer();
  });
});

updateDisplayFromBuffer();
