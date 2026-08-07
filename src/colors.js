const enabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const wrap = code => text => enabled ? `\x1b[${code}m${text}\x1b[0m` : String(text);

export const c = {
  bold: wrap('1'),
  gray: wrap('90'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  cyan: wrap('36'),
  magenta: wrap('35'),
  boldCyan: text => enabled ? `\x1b[1;36m${text}\x1b[0m` : String(text),
  boldMagenta: text => enabled ? `\x1b[1;35m${text}\x1b[0m` : String(text)
};
