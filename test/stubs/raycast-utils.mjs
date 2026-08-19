export function withCache(fn) {
  const wrapped = (...args) => fn(...args);
  wrapped.clearCache = () => {};
  return wrapped;
}
