// Window → ISO cutoff. "all" is special-cased: the API treats it as no filter.
export function sinceFor(window) {
  if (window === "all") return "all";
  const now = Date.now();
  const d =
    window === "24h" ? 24 * 3600 * 1000 :
    window === "7d"  ? 7  * 24 * 3600 * 1000 :
    window === "30d" ? 30 * 24 * 3600 * 1000 :
                       7  * 24 * 3600 * 1000;
  return new Date(now - d).toISOString();
}
