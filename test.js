const now = new Date();
const lineTime = new Date().setHours(22, 0, 0);

console.log(`${now.getHours()}: ${now.getMinutes()}: ${now.getSeconds()}`);
console.log(lineTime);
