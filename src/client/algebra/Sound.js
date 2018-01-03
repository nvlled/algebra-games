
let Util = require("src/client/algebra/Util");
let Sounds = require("src/client/sound");

let effects = {
    "bounce": "static/sounds/bounce.mp3",
    "click": "static/sounds/click.wav",
    "monster": "static/sounds/monster.wav",
    "explode": "static/sounds/huh.wav",
    "meh": "static/sounds/meh.wav",
    "mons1": "static/sounds/mons1.wav",
    "mons2": "static/sounds/mons2.wav",
    "coin": "static/sounds/coin.wav",
    "cloth": "static/sounds/cloth.wav",
}

let musics = {
    "battle": "static/sounds/battle.mp3",
    "low": "static/sounds/low.mp3",
    "flew": "static/sounds/flew.mp3",
    "skies": "static/sounds/skies.mp3",
}

Sounds.make.load([
    ...Object.values(effects),
    ...Object.values(musics),
]);

let LS = "algames.settings.sound";
localStorage[LS] = localStorage[LS] || {};

let loaded = false;
let muted = !!localStorage[LS].mute;
let volume = 0.2;
Sounds.make.whenLoaded = function() {
    loaded = true;
}

let playingMusic = null;
let M = {
    bonus() {
        Sounds.soundEffect(Math.random()*587.33, 0, 0.2, "square", 1, 0, 0);
        Sounds.soundEffect(Math.random()*880, 0, 0.2, "square", 1, 0, 0.1);
        Sounds.soundEffect(Math.random()*1174.66, 0, 0.3, "square", 1, 0, 0.2);
    },

    play(k) {
        if (!k)
            [k] = Util.randomSelect(Object.keys(effects));
        let sound = Sounds.make[effects[k]];
        if (!sound)
            return;
        sound.volume = volume*.9;
        sound.play();
    },

    playMusic(k, {loop=false, playNext=true} = {}) {
        if (playingMusic) {
            playingMusic.soundNode.onended = null;
            //playingMusic.fadeOut(2);
            playingMusic.pause();
        }

        if (!k)
            [k] = Util.randomSelect(Object.keys(musics).filter(x => x!=self.current));
        let music = Sounds.make[musics[k]];
        playingMusic = music;

        if (music) {
            self.current = k;
            music.loop = loop;
            music.volume = muted ? 0 : volume;
            music.playFrom(0);
            if (playNext) {
                music.soundNode.onended = ()=> M.playMusic();
            }
        } else {
            console.warn("music not found:", k);
        }
    },

    stopMusic() {
    },

    muteMusic() {
        if (playingMusic) {
            playingMusic.pause();
            playingMusic.volume = 0;
        }
        muted = true;
        localStorage[LS].mute = true;
    },
    unmuteMusic() {
        if (playingMusic) {
            playingMusic.play();
            playingMusic.volume = volume;
        }
        muted = false;
        localStorage[LS].mute = false;
    },
}

module.exports = M;
