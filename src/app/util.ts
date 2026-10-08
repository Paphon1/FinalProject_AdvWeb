export const clock = (dep: string, m: number) => {
  const [h, n] = dep.split(':').map(Number),
    t = h * 60 + n + Math.round(m);
  return (
    String(Math.floor(t / 60) % 24).padStart(2, '0') +
    ':' +
    String(t % 60).padStart(2, '0')
  );
};
export const baht = (n: number) =>
  (n < 0 ? '-฿' : '฿') + Math.abs(Math.round(n)).toLocaleString('en-US');
