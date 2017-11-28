
function Keyboard(keyCode) {
  let key = {};
  key.code = keyCode;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;
  //The `downHandler`
  key.downHandler = function(event) {
    if (event.keyCode === key.code || event.key == keyCode) {
      if (key.isUp && key.press) key.press(event);
      key.isDown = true;
      key.isUp = false;
    }
    event.preventDefault();
  }.bind(key);

  //The `upHandler`
  key.upHandler = function(event) {
    if (event.keyCode === key.code || event.key == keyCode) {
      if (key.isDown && key.release) key.release(event);
      key.isDown = false;
      key.isUp = true;
    }
    event.preventDefault();
  }.bind(key);

  //Attach event listeners

  key.listen = () => {
    window.addEventListener(
        "keydown", key.downHandler, false
    );
    window.addEventListener(
        "keyup", key.upHandler, false
    );
  }
  key.unlisten = () => {
      key.isDown = false;
      key.isUp = true;
    window.removeEventListener(
        "keydown", key.downHandler
    );
    window.removeEventListener(
        "keyup", key.upHandler
    );
  }

  return key;
}
Keyboard.create = function(keymap) {
}

module.exports = Keyboard;


