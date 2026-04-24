const ROOM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateRoomId(length = 6) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ROOM_ALPHABET.charAt(Math.floor(Math.random() * ROOM_ALPHABET.length));
  }
  return result;
}
